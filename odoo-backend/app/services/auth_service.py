from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.utils.password_hash import hash_password, verify_password
from app.utils.jwt_handler import create_access_token, create_refresh_token
from fastapi import HTTPException

async def create_user(name: str, email: str, password: str, db: AsyncSession, role: str = "staff"):
    result = await db.execute(select(User).where(User.email == email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        hashed_password = hash_password(password)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    user = User(name=name, email=email, password_hash=hashed_password, is_verified=False, role=role)
    db.add(user)
    await db.flush()  # get user.id without committing — let the router commit
    return user

async def authenticate_user(email: str, password: str, db: AsyncSession):
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    
    return user
