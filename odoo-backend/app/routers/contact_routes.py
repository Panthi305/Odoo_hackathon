from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.services.contact_service import send_contact_emails

router = APIRouter(prefix="/contact", tags=["Contact"])

class ContactMessage(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    subject: str
    message: str

@router.post("/send")
async def send_contact_message(contact: ContactMessage):
    try:
        # Send emails to both user and admin
        success = await send_contact_emails(
            first_name=contact.first_name,
            last_name=contact.last_name,
            email=contact.email,
            subject=contact.subject,
            message=contact.message
        )
        
        if success:
            return {
                "message": "Your message has been sent successfully! We'll get back to you soon.",
                "status": "success"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to send message")
    
    except Exception as e:
        print(f"Contact form error: {e}")
        raise HTTPException(status_code=500, detail="Failed to send message")
