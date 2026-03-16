import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings
import asyncio
from concurrent.futures import ThreadPoolExecutor

settings = get_settings()
executor = ThreadPoolExecutor(max_workers=3)

def _get_email_template(otp: str, purpose: str) -> str:
    """Generate professional HTML email template"""
    
    if purpose == "email verification":
        title = "Verify Your Email"
        message = "Thank you for signing up! Please use the OTP code below to verify your email address."
        action_text = "Email Verification"
    elif purpose == "password reset":
        title = "Reset Your Password"
        message = "We received a request to reset your password. Use the OTP code below to proceed."
        action_text = "Password Reset"
    else:
        title = "Your OTP Code"
        message = "Here is your one-time password for authentication."
        action_text = "Authentication"
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header with gradient -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                                    Odoo Hackathon 2026
                                </h1>
                                <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                                    Secure Authentication System
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 24px; font-weight: 600;">
                                    {title}
                                </h2>
                                <p style="margin: 0 0 24px; color: #64748b; font-size: 16px; line-height: 1.6;">
                                    {message}
                                </p>
                                
                                <!-- OTP Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 12px; padding: 32px; text-align: center; border: 2px dashed #cbd5e1;">
                                            <p style="margin: 0 0 12px; color: #64748b; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                Your OTP Code
                                            </p>
                                            <div style="background: #ffffff; border-radius: 8px; padding: 20px; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);">
                                                <span style="font-size: 36px; font-weight: 700; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                    {otp}
                                                </span>
                                            </div>
                                            <p style="margin: 16px 0 0; color: #94a3b8; font-size: 13px;">
                                                This code will expire in <strong style="color: #64748b;">5 minutes</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Info Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
                                            <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                                <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your OTP.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                    If you didn't request this {action_text.lower()}, please ignore this email or contact our support team if you have concerns.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px; text-align: center;">
                                    This is an automated message from <strong style="color: #64748b;">Odoo Hackathon 2026</strong>
                                </p>
                                <p style="margin: 0; color: #cbd5e1; font-size: 12px; text-align: center;">
                                    © 2026 Odoo Hackathon. All rights reserved.
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px;">
                                    <tr>
                                        <td align="center">
                                            <a href="#" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 8px;">Privacy Policy</a>
                                            <span style="color: #cbd5e1;">•</span>
                                            <a href="#" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 8px;">Terms of Service</a>
                                            <span style="color: #cbd5e1;">•</span>
                                            <a href="#" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 8px;">Support</a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def _send_email_sync(email: str, otp: str, purpose: str):
    """Synchronous email sending function"""
    subject = f"Your OTP Code - {purpose.title()}"
    html_body = _get_email_template(otp, purpose)
    
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"Odoo Hackathon <{settings.SMTP_EMAIL}>"
    message["To"] = email
    
    html_part = MIMEText(html_body, "html")
    message.attach(html_part)
    
    try:
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.send_message(message)
        return True
    except Exception as e:
        print(f"Email error: {e}")
        raise e

async def send_otp_email(email: str, otp: str, purpose: str = "verification"):
    """Async wrapper for email sending"""
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(executor, _send_email_sync, email, otp, purpose)
        return True
    except Exception as e:
        print(f"Failed to send email to {email}: {e}")
        # Don't fail the request if email fails, just log it
        return False
