# Live Stock Market Watchlist & Alert System

This is a full-stack application that allows users to track stocks in real-time, set price alerts, and receive email notifications when those alerts are triggered. The system includes user authentication, a watchlist management system, and real-time price updates via WebSockets.

---

## Tech Stack

- **Frontend**: React.js with Vite, Tailwind CSS
- **Backend**: Flask (Python) with Flask-SocketIO
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time Updates**: WebSockets
- **Email Notifications**: SMTP (Gmail)

---

## Features

- User registration and login
- Real-time stock price updates
- Watchlist management (add/remove stocks)
- Price alert creation (above/below target price)
- Email notifications when alerts are triggered
- Alert history tracking
- Responsive UI

---

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- MongoDB
- Redis (for production)
- Alpha Vantage API key (free tier available)

### Backend Setup

1. Clone the repository

2. Navigate to the backend directory:

   ```bash
   cd backend


3. Create a virtual environment:
python -m venv venv


4. Activate the virtual environment:
On Windows:
venv\Scripts\activate


5. Install dependencies:
   pip install -r requirements.txt


6. Create a .env file in the backend directory with the following variables:
   SECRET_KEY=your_secret_key
MONGO_URI=mongodb://localhost:27017/stockwatch
JWT_SECRET_KEY=your_jwt_secret
ALPHA_VANTAGE_KEY=your_alpha_vantage_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password


7. Run the backend server:
   python app.py


## Frontend Setup

1.Navigate to the frontend directory:
cd frontend

2.Install dependencies:
npm install


3. Run the development server:
   npm run dev





## API Endpoints
POST /api/auth/register - User registration

POST /api/auth/login - User login

GET /api/watchlist - Get user watchlist

POST /api/watchlist - Add stock to watchlist

DELETE /api/watchlist - Remove stock from watchlist

GET /api/stocks/search - Search for stocks

GET /api/alerts - Get user alerts

POST /api/alerts - Create new alert

DELETE /api/alerts - Delete alert

GET /api/alert-history - Get alert history




## Environment Variables
## Backend

SECRET_KEY - Flask secret key

MONGO_URI - MongoDB connection string

JWT_SECRET_KEY - Secret for JWT tokens

ALPHA_VANTAGE_KEY - API key for Alpha Vantage

EMAIL_USER - Email address for notifications

EMAIL_PASS - Email password or app password

## Frontend
Configured in vite.config.js:

Proxy for API requests

WebSocket configuration




## stock-watchlist/
├── backend/               # Flask application
│   ├── app.py            # Main application file
│   ├── requirements.txt  # Python dependencies
│   └── .env              # Environment variables
│
├── frontend/             # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── utils/        # Utility functions
│   │   ├── App.jsx       # Main application component
│   │   └── main.jsx      # Entry point
│   ├── vite.config.js    # Vite configuration
│   └── package.json      # Frontend dependencies
│
└── README.md             # This file

