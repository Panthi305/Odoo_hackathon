from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.user_schema import UserCreate, UserLogin, UserResponse
from app.schemas.auth_schema import TokenResponse, OTPVerify, ForgotPassword, ResetPassword, RefreshTokenRequest
from app.services.auth_service import create_user, authenticate_user
from app.services.otp_service import create_and_send_otp, verify_otp
from app.models.user import User
from app.utils.jwt_handler import create_access_token, create_refresh_token, verify_token
from app.utils.password_hash import hash_password
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup")
@limiter.limit("10/minute")
async def signup(request: Request, user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    role = getattr(user_data, "role", "staff") or "staff"
    user = await create_user(user_data.name, user_data.email, user_data.password, db, role)
    # create_user only flushes — commit here so user is persisted before OTP
    await db.commit()
    await create_and_send_otp(user.email, db, "email verification")
    return {"message": "User created. Please verify your email with the OTP sent."}


@router.post("/verify-otp")
@limiter.limit("10/minute")
async def verify_otp_endpoint(request: Request, otp_data: OTPVerify, db: AsyncSession = Depends(get_db)):
    is_valid = await verify_otp(otp_data.email, otp_data.otp, db)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    result = await db.execute(select(User).where(User.email == otp_data.email))
    user = result.scalar_one_or_none()
    if user:
        user.is_verified = True
        await db.commit()
    return {"message": "Email verified successfully"}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    user = await authenticate_user(login_data.email, login_data.password, db)
    access_token = create_access_token({"sub": user.email, "user_id": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.email, "user_id": user.id, "role": user.role})
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_verified": user.is_verified,
            "role": user.role,
        }
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    payload = verify_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    result = await db.execute(select(User).where(User.email == payload.get("sub")))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token({"sub": user.email, "user_id": user.id, "role": user.role})
    new_refresh = create_refresh_token({"sub": user.email, "user_id": user.id, "role": user.role})
    return {
        "access_token": access_token,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_verified": user.is_verified,
            "role": user.role,
        }
    }


@router.post("/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPassword, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await create_and_send_otp(data.email, db, "password reset")
    return {"message": "OTP sent to your email"}


@router.post("/reset-password")
@limiter.limit("5/minute")
async def reset_password(request: Request, data: ResetPassword, db: AsyncSession = Depends(get_db)):
    is_valid = await verify_otp(data.email, data.otp, db)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        user.password_hash = hash_password(data.new_password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    await db.commit()
    return {"message": "Password reset successfully"}


# ── User Management (Admin only) ───────────────────────────────────────────────
from fastapi.security import HTTPBearer as _HTTPBearer, HTTPAuthorizationCredentials as _Creds

_security = _HTTPBearer()


def _get_admin_user(credentials: _Creds = Depends(_security)):
    payload = verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload


@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db), admin=Depends(_get_admin_user)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {"id": u.id, "name": u.name, "email": u.email, "role": u.role,
         "is_verified": u.is_verified, "created_at": u.created_at}
        for u in users
    ]


@router.put("/users/{user_id}/role")
async def update_user_role(user_id: int, body: dict, db: AsyncSession = Depends(get_db), admin=Depends(_get_admin_user)):
    role = body.get("role")
    if role not in ("admin", "staff"):
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'staff'")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    await db.commit()
    return {"message": f"Role updated to {role}", "user_id": user_id, "role": role}
