from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.otp import OTPCode
from app.utils.otp_generator import generate_otp
from app.services.email_service import send_otp_email

async def create_and_send_otp(email: str, db: AsyncSession, purpose: str = "verification"):
    # Clear any existing OTP for this email
    await db.execute(delete(OTPCode).where(OTPCode.email == email))

    otp = generate_otp()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)

    otp_code = OTPCode(email=email, otp=otp, expires_at=expires_at)
    db.add(otp_code)
    await db.commit()

    # Send email — non-fatal: log failure but don't crash signup
    try:
        await send_otp_email(email, otp, purpose)
    except Exception as e:
        print(f"[OTP] Email send failed for {email}: {e}")

    return True


async def verify_otp(email: str, otp: str, db: AsyncSession):
    result = await db.execute(
        select(OTPCode).where(OTPCode.email == email, OTPCode.otp == otp)
    )
    otp_record = result.scalar_one_or_none()

    if not otp_record:
        return False

    if datetime.now(timezone.utc) > otp_record.expires_at:
        await db.delete(otp_record)
        await db.commit()
        return False

    await db.delete(otp_record)
    await db.commit()
    return True
