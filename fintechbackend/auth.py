from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext
from config import settings

SECRET_KEY = settings.signing_secret
ALGORITHM = settings.ALGORITHM
TOKEN_ISSUER = "vaultic-auth-engine"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iss": TOKEN_ISSUER})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str):
    """Verify JWT token and extract username."""
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
            issuer=TOKEN_ISSUER,
            options={"require": ["exp", "iss", "sub"]},
        )
        username: str = payload.get("sub")
        if username is None:
            return None
        return username
    except jwt.InvalidTokenError:
        return None
