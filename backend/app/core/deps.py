from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer, APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.core.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    api_key: str | None = Depends(api_key_header),
    # Allow token as query param for SSE (EventSource doesn't support headers)
    token_query: str | None = Query(None, alias="token"),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = token or token_query
    if token:
        user_id = decode_token(token)
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id, User.is_active == True))
            user = result.scalar_one_or_none()
            if user:
                return user

    if api_key:
        result = await db.execute(select(User).where(User.api_key == api_key, User.is_active == True))
        user = result.scalar_one_or_none()
        if user:
            return user

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
