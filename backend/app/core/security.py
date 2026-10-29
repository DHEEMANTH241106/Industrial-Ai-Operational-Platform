from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import get_db
from app.db.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None) -> str:
    """Create a JWT token with an expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed one with 72-byte safe guard."""
    safe_pwd = plain_password[:72] if plain_password else ""
    return pwd_context.verify(safe_pwd, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password safely with 72-byte limit guard for bcrypt."""
    safe_pwd = password[:72] if password else ""
    return pwd_context.hash(safe_pwd)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)

async def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """Dependency to get current authenticated user, defaulting to admin user in development."""
    if not token and getattr(settings, 'app_env', 'development') == 'development':
        admin_user = db.query(User).filter(User.username == "admin").first()
        if admin_user:
            return admin_user

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user
