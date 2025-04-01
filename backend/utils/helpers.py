import smtplib
from email.mime.text import MIMEText
import os

def send_alert_email(to_email, symbol, price):
    try:
        sender = os.getenv("EMAIL_USER")
        password = os.getenv("EMAIL_PASS")
        
        msg = MIMEText(f"Alert! {symbol} reached target price. Current: ${price}")
        msg['Subject'] = f'Stock Alert: {symbol}'
        msg['From'] = sender
        msg['To'] = to_email
        
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender, password)
            server.send_message(msg)
    except Exception as e:
        print(f"Email failed: {e}")