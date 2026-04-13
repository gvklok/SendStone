"""User report endpoint — sends an email to the admin via Gmail SMTP."""
import smtplib
from email.mime.text import MIMEText
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import get_settings

router = APIRouter(prefix="/report", tags=["report"])

ADMIN_EMAIL = "sendstoneadmin@gmail.com"


class ReportRequest(BaseModel):
    message: str
    user_email: str = "not provided"


@router.post("")
async def send_report(payload: ReportRequest):
    settings = get_settings()

    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not settings.gmail_user or not settings.gmail_app_password:
        raise HTTPException(status_code=503, detail="Email service not configured.")

    body = f"From user: {payload.user_email}\n\n{payload.message}"
    msg = MIMEText(body)
    msg["Subject"] = "User Report"
    msg["From"] = settings.gmail_user
    msg["To"] = ADMIN_EMAIL

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(settings.gmail_user, settings.gmail_app_password)
            server.sendmail(settings.gmail_user, ADMIN_EMAIL, msg.as_string())
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(status_code=503, detail="Email authentication failed.")
    except Exception:
        raise HTTPException(status_code=503, detail="Failed to send email.")

    return {"status": "sent"}
