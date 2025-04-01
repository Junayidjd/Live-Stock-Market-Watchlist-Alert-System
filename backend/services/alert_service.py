from datetime import datetime
import threading
from flask_pymongo import PyMongo
import requests
import os
from utils.helpers import send_alert_email
from flask_socketio import SocketIO

mongo = PyMongo()
socketio = SocketIO()

def get_current_price(symbol):
    """Fetch current stock price from Alpha Vantage"""
    url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={os.getenv('ALPHA_VANTAGE_KEY')}"
    response = requests.get(url, timeout=5)
    if response.status_code == 200:
        return response.json().get("Global Quote", {}).get("05. price")
    return None

def check_alerts():
    while True:
        try:
            active_alerts = list(mongo.db.alerts.find({"triggered": False}))
            for alert in active_alerts:
                symbol = alert["symbol"]
                price = get_current_price(symbol)
                
                if price:
                    current_price = float(price)
                    target_price = float(alert["target_price"])
                    condition = alert["condition"]
                    
                    if (condition == "above" and current_price >= target_price) or \
                       (condition == "below" and current_price <= target_price):
                        send_alert_email(alert["email"], symbol, current_price)
                        mongo.db.alerts.update_one(
                            {"_id": alert["_id"]},
                            {"$set": {"triggered": True, "triggered_at": datetime.utcnow()}}
                        )
        except Exception as e:
            print(f"Alert check error: {e}")
        socketio.sleep(60)

def start_alert_checker():
    thread = threading.Thread(target=check_alerts)
    thread.daemon = True
    thread.start()