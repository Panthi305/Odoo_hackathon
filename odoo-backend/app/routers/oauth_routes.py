from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from authlib.integrations.starlette_client import OAuth
from starlette.requests import Request
from app.database import get_db
from app.models.user import User
from app.utils.jwt_handler import create_access_token, create_refresh_token
from app.config import get_settings
import json
from urllib.parse import quote

settings = get_settings()
router = APIRouter(prefix="/oauth", tags=["OAuth"])

oauth = OAuth()

oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

oauth.register(
    name='github',
    client_id=settings.GITHUB_CLIENT_ID,
    client_secret=settings.GITHUB_CLIENT_SECRET,
    authorize_url='https://github.com/login/oauth/authorize',
    authorize_params=None,
    access_token_url='https://github.com/login/oauth/access_token',
    access_token_params=None,
    client_kwargs={'scope': 'user:email'}
)

@router.get("/google/login")
async def google_login(request: Request):
    redirect_uri = f"{settings.BACKEND_URL}/oauth/google/callback"
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        email = user_info.get('email')
        name = user_info.get('name')
        oauth_id = user_info.get('sub')
        
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                name=name,
                email=email,
                is_verified=True,
                oauth_provider='google',
                oauth_id=oauth_id,
                role="staff",
            )
            db.add(user)
            await db.flush()
            user_id = user.id
            await db.commit()
            result2 = await db.execute(select(User).where(User.id == user_id))
            user = result2.scalar_one()
        
        access_token = create_access_token({"sub": user.email, "user_id": user.id, "role": user.role})
        refresh_token = create_refresh_token({"sub": user.email, "user_id": user.id, "role": user.role})
        
        # Create user data JSON and URL encode it
        user_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_verified": user.is_verified,
            "role": user.role,
        }
        user_json = quote(json.dumps(user_data))
        
        # Redirect to frontend with tokens and user data
        redirect_url = f"{settings.FRONTEND_URL}/login?access_token={access_token}&refresh_token={refresh_token}&user={user_json}"
        return RedirectResponse(url=redirect_url)
    
    except Exception as e:
        print(f"Google OAuth error: {e}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")

@router.get("/github/login")
async def github_login(request: Request):
    redirect_uri = f"{settings.BACKEND_URL}/oauth/github/callback"
    return await oauth.github.authorize_redirect(request, redirect_uri)

@router.get("/github/callback")
async def github_callback(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.github.authorize_access_token(request)
        
        import httpx
        async with httpx.AsyncClient() as client:
            user_response = await client.get(
                'https://api.github.com/user',
                headers={'Authorization': f"token {token['access_token']}"}
            )
            user_info = user_response.json()
            
            email_response = await client.get(
                'https://api.github.com/user/emails',
                headers={'Authorization': f"token {token['access_token']}"}
            )
            emails = email_response.json()
            primary_email = next((e['email'] for e in emails if e['primary']), None)
        
        if not primary_email:
            raise HTTPException(status_code=400, detail="No email found")
        
        name = user_info.get('name') or user_info.get('login')
        oauth_id = str(user_info.get('id'))
        
        result = await db.execute(select(User).where(User.email == primary_email))
        user = result.scalar_one_or_none()
        
        if not user:
            user = User(
                name=name,
                email=primary_email,
                is_verified=True,
                oauth_provider='github',
                oauth_id=oauth_id,
                role="staff",
            )
            db.add(user)
            await db.flush()
            user_id = user.id
            await db.commit()
            result2 = await db.execute(select(User).where(User.id == user_id))
            user = result2.scalar_one()
        
        access_token = create_access_token({"sub": user.email, "user_id": user.id, "role": user.role})
        refresh_token = create_refresh_token({"sub": user.email, "user_id": user.id, "role": user.role})
        
        # Create user data JSON and URL encode it
        user_data = {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_verified": user.is_verified,
            "role": user.role,
        }
        user_json = quote(json.dumps(user_data))
        
        # Redirect to frontend with tokens and user data
        redirect_url = f"{settings.FRONTEND_URL}/login?access_token={access_token}&refresh_token={refresh_token}&user={user_json}"
        return RedirectResponse(url=redirect_url)
    
    except Exception as e:
        print(f"GitHub OAuth error: {e}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=oauth_failed")
