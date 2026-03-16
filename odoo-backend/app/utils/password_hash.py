from passlib.context import CryptContext
from passlib.exc import UnknownHashError

# Support bcrypt (current) + pbkdf2_sha256 (legacy) so old users can still log in.
# New passwords are always hashed with bcrypt.
pwd_context = CryptContext(
    schemes=["bcrypt", "pbkdf2_sha256"],
    default="bcrypt",
    deprecated=["pbkdf2_sha256"],
)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except (UnknownHashError, ValueError):
        return False
