import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import get_settings
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime

settings = get_settings()
executor = ThreadPoolExecutor(max_workers=3)

def _get_user_confirmation_email(first_name: str, last_name: str, subject: str, message: str) -> str:
    """Generate confirmation email for the user"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message Received</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                    Thank You for Contacting Us!
                                </h1>
                                <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                                    Odoo Hackathon 2026
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">
                                    Hi {first_name},
                                </p>
                                <p style="margin: 0 0 24px; color: #64748b; font-size: 16px; line-height: 1.6;">
                                    We've received your message and our team will review it shortly. We typically respond within 24 hours during business days.
                                </p>
                                
                                <!-- Message Summary Box -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td style="background: #f8fafc; border-left: 4px solid #667eea; border-radius: 8px; padding: 20px;">
                                            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                Your Message Summary
                                            </p>
                                            <p style="margin: 0 0 12px; color: #1e293b; font-size: 16px; font-weight: 600;">
                                                Subject: {subject}
                                            </p>
                                            <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                                {message[:200]}{"..." if len(message) > 200 else ""}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                    In the meantime, feel free to explore our platform or check out our documentation.
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="http://localhost:5173" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                                Visit Our Platform
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 13px; text-align: center;">
                                    This is an automated confirmation from <strong style="color: #64748b;">Odoo Hackathon 2026</strong>
                                </p>
                                <p style="margin: 0; color: #cbd5e1; font-size: 12px; text-align: center;">
                                    © 2026 Odoo Hackathon. All rights reserved.
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def _get_admin_notification_email(first_name: str, last_name: str, email: str, subject: str, message: str) -> str:
    """Generate notification email for admin"""
    now = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                        
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 40px; text-align: center;">
                                <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                                    🔔 New Contact Form Submission
                                </h1>
                                <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px;">
                                    {now}
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <p style="margin: 0 0 24px; color: #64748b; font-size: 16px; line-height: 1.6;">
                                    You have received a new message from the contact form on your website.
                                </p>
                                
                                <!-- Contact Details -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td style="background: #f8fafc; border-radius: 8px; padding: 24px;">
                                            <table width="100%" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="padding: 8px 0;">
                                                        <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Name</p>
                                                        <p style="margin: 4px 0 0; color: #1e293b; font-size: 16px; font-weight: 600;">{first_name} {last_name}</p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
                                                        <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Email</p>
                                                        <p style="margin: 4px 0 0; color: #667eea; font-size: 16px; font-weight: 600;">
                                                            <a href="mailto:{email}" style="color: #667eea; text-decoration: none;">{email}</a>
                                                        </p>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 8px 0; border-top: 1px solid #e2e8f0;">
                                                        <p style="margin: 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase;">Subject</p>
                                                        <p style="margin: 4px 0 0; color: #1e293b; font-size: 16px; font-weight: 600;">{subject}</p>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Message Content -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
                                            <p style="margin: 0 0 8px; color: #92400e; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                                                Message
                                            </p>
                                            <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
{message}
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- Quick Reply Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                                    <tr>
                                        <td align="center">
                                            <a href="mailto:{email}?subject=Re: {subject}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                                                Reply to {first_name}
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #f8fafc; padding: 32px 40px; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; color: #94a3b8; font-size: 13px; text-align: center;">
                                    This notification was sent from your <strong style="color: #64748b;">Odoo Hackathon 2026</strong> contact form
                                </p>
                            </td>
                        </tr>
                        
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def _send_email_sync(to_email: str, subject: str, html_body: str, from_name: str = "Odoo Hackathon"):
    """Synchronous email sending function"""
    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = f"{from_name} <{settings.SMTP_EMAIL}>"
    message["To"] = to_email
    
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

async def send_contact_emails(first_name: str, last_name: str, email: str, subject: str, message: str):
    """Send confirmation email to user and notification email to admin"""
    loop = asyncio.get_event_loop()
    
    try:
        # Prepare emails
        user_email_html = _get_user_confirmation_email(first_name, last_name, subject, message)
        admin_email_html = _get_admin_notification_email(first_name, last_name, email, subject, message)
        
        # Send both emails concurrently
        user_task = loop.run_in_executor(
            executor, 
            _send_email_sync, 
            email, 
            "Thank you for contacting us!", 
            user_email_html,
            "Odoo Hackathon Team"
        )
        
        admin_task = loop.run_in_executor(
            executor, 
            _send_email_sync, 
            settings.SMTP_EMAIL,  # Send to yourself
            f"New Contact: {subject} - from {first_name} {last_name}", 
            admin_email_html,
            "Contact Form"
        )
        
        # Wait for both to complete
        await asyncio.gather(user_task, admin_task)
        return True
        
    except Exception as e:
        print(f"Failed to send contact emails: {e}")
        return False
