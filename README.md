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
