from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from jose import jwt, JWTError
from sqlmodel import select
from sqlalchemy import or_
from database_new import get_session
from sqlmodel import Session
from models import User
from auth import SECRET_KEY, ALGORITHM


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def get_current_user(token: Annotated[str, Depends], session: Annotated[Session, Depends(get_session)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate identity",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        username: Optional[str] = payload.get("sub")
        if username is None:
            raise credentials_exception
    except HTTPException:
        raise
    except Exception:
        raise credentials_exception

    user = session.exec(select(User).where(or_(User.email == username, User.username == username))).first()
    if user is None:
        raise credentials_exception
    return user


def require_roles(*allowed_roles: str):
    def role_checker(user: Annotated[User, Depends(get_current_user)]):
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient privileges")
        return user
    return role_checker


async def get_user_from_token_ws(token: str, session: Session) -> Optional[User]:
    try:
        payload = decode_token(token)
        username = payload.get("sub")
        if not username:
            return None
        user = session.exec(select(User).where(or_(User.email == username, User.username == username))).first()
        return user
    except Exception:
        return None
