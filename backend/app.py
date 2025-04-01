import os
import smtplib
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, make_response
from flask_pymongo import PyMongo
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from bson.objectid import ObjectId
import requests
import threading
import time
from functools import wraps

# Load config
load_dotenv()
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)

# Initialize extensions
mongo = PyMongo(app)
jwt = JWTManager(app)

# Initialize SocketIO with proper CORS and async mode
socketio = SocketIO(app, 
                   cors_allowed_origins="*",
                   async_mode='threading',
                   logger=True,
                   engineio_logger=True)
# Add this WebSocket error handler
@socketio.on_error_default
def default_error_handler(e):
    print(f"WebSocket error: {str(e)}")
# CORS Setup
CORS(app, resources={ 
    r"/api/*": { 
        "origins": ["http://localhost:5173"], 
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
        "allow_headers": ["Content-Type", "Authorization"], 
        "supports_credentials": True, 
        "expose_headers": ["Authorization"]
    },
    r"/socket.io/*": {
        "origins": ["http://localhost:5173"],
        "supports_credentials": True
    }
})

# Add this before your routes to handle OPTIONS requests
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
        response.headers.add("Access-Control-Allow-Credentials", "true")
        return response

# Database indexes
mongo.db.users.create_index("email", unique=True)
mongo.db.watchlists.create_index("email", unique=True)
mongo.db.alerts.create_index([("email", 1), ("symbol", 1)])
mongo.db.alert_history.create_index([("email", 1), ("triggered_at", -1)])

# Store connected clients and their rooms
connected_clients = {}

# ============== Helper Functions ============== #
def get_current_price(symbol):
    """Fetch current stock price with better error handling"""
    try:
        url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={os.getenv('ALPHA_VANTAGE_KEY')}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "Global Quote" in data and "05. price" in data["Global Quote"]:
                return float(data["Global Quote"]["05. price"])
        return None
    except Exception as e:
        print(f"Price fetch error for {symbol}: {str(e)}")
        return None

def send_alert_email(to_email, symbol, price, condition):
    """Send email with improved error handling"""
    try:
        from_email = os.getenv("EMAIL_USER")
        password = os.getenv("EMAIL_PASS")
        
        subject = f"Stock Alert: {symbol} price is {condition} ${price}"
        body = f"""
        Your alert has been triggered!
        Stock: {symbol}
        Current Price: ${price}
        Condition: Price is {condition} your target
        """
        
        # Using SMTP (configure in .env)
        with smtplib.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", 587))) as server:
            server.starttls()
            server.login(from_email, password)
            server.sendmail(
                from_email, 
                to_email, 
                f"Subject: {subject}\n\n{body}"
            )
        return True
    except Exception as e:
        print(f"Email failed: {str(e)}")
        return False

# ============== Alert Service ============== #
def check_alerts():
    """Background thread to check alerts"""
    while True:
        try:
            active_alerts = list(mongo.db.alerts.find({"triggered": False}))
            for alert in active_alerts:
                price = get_current_price(alert["symbol"])
                if price:
                    current_price = float(price)
                    target_price = float(alert["target_price"])
                    condition = alert["condition"]
                    
                    if (condition == "above" and current_price >= target_price) or \
                       (condition == "below" and current_price <= target_price):
                        
                        # Record in history
                        mongo.db.alert_history.insert_one({
                            "email": alert["email"],
                            "symbol": alert["symbol"],
                            "target_price": target_price,
                            "actual_price": current_price,
                            "condition": condition,
                            "triggered_at": datetime.utcnow()
                        })
                        
                        # Send email
                        send_alert_email(
                            alert["email"],
                            alert["symbol"],
                            current_price,
                            condition
                        )
                        
                        # Mark as triggered
                        mongo.db.alerts.update_one(
                            {"_id": alert["_id"]},
                            {"$set": {"triggered": True, "triggered_at": datetime.utcnow()}}
                        )
        except Exception as e:
            print(f"Alert check error: {str(e)}")
        time.sleep(60)  # Check every minute

# ============== AUTH ROUTES ============== #
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        if mongo.db.users.find_one({"email": email}):
            return jsonify({"error": "User already exists"}), 409

        user = {
            "email": email,
            "password": generate_password_hash(password),
            "created_at": datetime.utcnow()
        }
        mongo.db.users.insert_one(user)

        return jsonify({
            "message": "User created successfully",
            "email": email
        }), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password required"}), 400

        user = mongo.db.users.find_one({"email": email})
        if not user:
            return jsonify({"error": "Invalid credentials"}), 401

        if not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        access_token = create_access_token(identity=email)
        return jsonify({
            "access_token": access_token,
            "token_type": "bearer",
            "email": email,
            "message": "Login successful"
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    return jsonify({"valid": True}), 200

# ============== ALERT ROUTES ============== #
@app.route("/api/alerts", methods=["GET", "POST", "DELETE"])
@jwt_required()
def manage_alerts():
    user_email = get_jwt_identity()
    
    if request.method == "GET":
        alerts = list(mongo.db.alerts.find({"email": user_email}))
        return jsonify([{
            "_id": str(alert["_id"]),
            "symbol": alert["symbol"],
            "target_price": alert["target_price"],
            "condition": alert["condition"],
            "triggered": alert.get("triggered", False),
            "created_at": alert["created_at"]
        } for alert in alerts]), 200
        
    if request.method == "POST":
        data = request.get_json()
        alert = {
            "email": user_email,
            "symbol": data["symbol"].upper(),
            "target_price": float(data["target_price"]),
            "condition": data["condition"],
            "triggered": False,
            "created_at": datetime.utcnow()
        }
        mongo.db.alerts.insert_one(alert)
        return jsonify({"message": "Alert created successfully"}), 201
        
    if request.method == "DELETE":
        data = request.get_json()
        mongo.db.alerts.delete_one({
            "_id": ObjectId(data["alert_id"]),
            "email": user_email
        })
        return jsonify({"message": "Alert deleted successfully"}), 200

@app.route('/api/alert-history', methods=['GET'])
@jwt_required()
def get_alert_history():
    """Get past triggered alerts"""
    user_email = get_jwt_identity()
    history = list(mongo.db.alert_history.find(
        {"email": user_email},
        sort=[("triggered_at", -1)],
        limit=10
    ))
    return jsonify([{
        "symbol": alert["symbol"],
        "target_price": alert["target_price"],
        "actual_price": alert["actual_price"],
        "condition": alert["condition"],
        "triggered_at": alert["triggered_at"]
    } for alert in history]), 200

# Rate limiting decorator
def rate_limited(max_per_minute):
    interval = 60.0 / float(max_per_minute)
    def decorator(func):
        last_called = [0.0]
        @wraps(func)
        def wrapped(*args, **kwargs):
            elapsed = time.time() - last_called[0]
            wait = interval - elapsed
            if wait > 0:
                time.sleep(wait)
            last_called[0] = time.time()
            return func(*args, **kwargs)
        return wrapped
    return decorator

# Cache for storing API call timestamps
api_call_cache = {}

@app.route("/api/stocks/search", methods=["GET"])
@jwt_required()
@rate_limited(5)  # 5 requests per minute
def search_stocks():
    query = request.args.get("query", "").lower().strip()
    
    if not query:
        return jsonify({"error": "Please enter a search query", "bestMatches": []}), 400
    
    # First try to fetch from Alpha Vantage API
    try:
        api_key = os.getenv("ALPHA_VANTAGE_KEY")
        if not api_key:
            raise ValueError("API key not configured")
        
        # Track API calls to handle rate limits
        current_time = datetime.now()
        if api_key in api_call_cache:
            last_call_time, call_count = api_call_cache[api_key]
            if (current_time - last_call_time) < timedelta(seconds=60):
                if call_count >= 5:  # 5 calls per minute limit
                    wait_time = 60 - (current_time - last_call_time).seconds
                    return jsonify({
                        "error": f"API rate limit exceeded. Please wait {wait_time} seconds",
                        "bestMatches": get_mock_data(query),
                        "isMockData": True
                    }), 429
                api_call_cache[api_key] = (last_call_time, call_count + 1)
            else:
                api_call_cache[api_key] = (current_time, 1)
        else:
            api_call_cache[api_key] = (current_time, 1)
        
        url = f"https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={query}&apikey={api_key}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Check for API rate limit message
            if "Note" in data and "API call frequency" in data["Note"]:
                return jsonify({
                    "error": "Daily API limit reached. Using mock data.",
                    "bestMatches": get_mock_data(query),
                    "isMockData": True
                }), 200
            
            # Check for valid response
            if "bestMatches" in data:
                return jsonify({
                    "bestMatches": data["bestMatches"],
                    "isMockData": False
                }), 200
            
    except Exception as e:
        print(f"API Error: {str(e)}")
        # Continue to fallback if API fails
    
    # Fallback to mock data if API fails
    return jsonify({
        "bestMatches": get_mock_data(query),
        "isMockData": True,
        "notice": "Showing mock data as API is unavailable"
    }), 200

def get_mock_data(query):
    """Returns mock data for testing when API fails"""
    mock_data = {
        "hdfc": [
            {
                "1. symbol": "HDFCBANK.BSE",
                "2. name": "HDFC Bank Limited",
                "3. type": "Equity",
                "4. region": "India",
                "5. marketOpen": "09:15",
                "6. marketClose": "15:30",
                "7. timezone": "UTC+5.5",
                "8. currency": "INR",
                "9. matchScore": "0.8889"
            },
            {
                "1. symbol": "HDFC.NS",
                "2. name": "Housing Development Finance Corporation Limited",
                "3. type": "Equity",
                "4. region": "India",
                "5. marketOpen": "09:15",
                "6. marketClose": "15:30",
                "7. timezone": "UTC+5.5",
                "8. currency": "INR",
                "9. matchScore": "0.8571"
            }
        ],
        "reliance": [
            {
                "1. symbol": "RELIANCE.BSE",
                "2. name": "Reliance Industries Limited",
                "3. type": "Equity",
                "4. region": "India",
                "5. marketOpen": "09:15",
                "6. marketClose": "15:30",
                "7. timezone": "UTC+5.5",
                "8. currency": "INR",
                "9. matchScore": "0.9231"
            }
        ],
        "tata": [
            {
                "1. symbol": "TATAMOTORS.BSE",
                "2. name": "Tata Motors Limited",
                "3. type": "Equity",
                "4. region": "India",
                "5. marketOpen": "09:15",
                "6. marketClose": "15:30",
                "7. timezone": "UTC+5.5",
                "8. currency": "INR",
                "9. matchScore": "0.8571"
            }
        ]
    }
    
    # Find partial matches in mock data
    results = []
    for key in mock_data:
        if query in key:
            results.extend(mock_data[key])
    
    return results if results else []

# ============== WATCHLIST ROUTE ============== #
@app.route("/api/watchlist", methods=["GET", "POST", "DELETE", "OPTIONS"])
@jwt_required()
def watchlist():
    try:
        user_email = get_jwt_identity()
        
        if request.method == "GET":
            watchlist = mongo.db.watchlists.find_one({"email": user_email})
            return jsonify(watchlist.get("stocks", []) if watchlist else []), 200
        
        data = request.get_json()
        symbol = data.get("symbol")
        
        if request.method == "POST":
            if not symbol:
                return jsonify({"error": "Symbol required"}), 400
                
            mongo.db.watchlists.update_one(
                {"email": user_email},
                {"$addToSet": {"stocks": symbol}},
                upsert=True
            )
            return jsonify({"message": "Stock added to watchlist"}), 200
        
        if request.method == "DELETE":
            if not symbol:
                return jsonify({"error": "Symbol required"}), 400
                
            mongo.db.watchlists.update_one(
                {"email": user_email},
                {"$pull": {"stocks": symbol}}
            )
            return jsonify({"message": "Stock removed from watchlist"}), 200
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============== WEBSOCKET HANDLERS ============== #
@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    connected_clients[request.sid] = True

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    if request.sid in connected_clients:
        del connected_clients[request.sid]

def send_updates(symbol, sid):
    """Send updates to specific client"""
    while sid in connected_clients:  # Keep running while client is connected
        try:
            price = get_current_price(symbol)
            if price:
                socketio.emit("stock_update", 
                             {"symbol": symbol, "price": price},
                             room=sid)
            socketio.sleep(10)  # Update every 10 seconds
        except Exception as e:
            print(f"Update error for {symbol}: {str(e)}")
            break

@socketio.on('subscribe_stocks')
def handle_subscribe(data):
    symbols = data.get("symbols", [])
    print(f"Client {request.sid} subscribed to: {symbols}")
    
    for symbol in symbols:
        # Send initial price
        price = get_current_price(symbol)
        if price:
            emit("stock_update", {"symbol": symbol, "price": price}, room=request.sid)
        
        # Start background thread for this symbol
        socketio.start_background_task(send_updates, symbol, request.sid)

# ============== USER PROFILE ROUTE ============== #
@app.route("/api/user/profile", methods=["GET", "PUT"])
@jwt_required()
def user_profile():
    user_email = get_jwt_identity()
    
    if request.method == "GET":
        user = mongo.db.users.find_one({"email": user_email}, {"password": 0})
        return jsonify(user), 200
        
    if request.method == "PUT":
        data = request.get_json()
        mongo.db.users.update_one(
            {"email": user_email},
            {"$set": {
                "username": data.get("username"),
                "phone": data.get("phone")
            }}
        )
        return jsonify({"message": "Profile updated"}), 200

if __name__ == "__main__":
    alert_thread = threading.Thread(target=check_alerts)
    alert_thread.daemon = True
    alert_thread.start()
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)







