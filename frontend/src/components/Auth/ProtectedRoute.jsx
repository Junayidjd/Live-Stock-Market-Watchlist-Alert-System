import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import api from '../../utils/api';

const ProtectedRoute = () => {
  const [isValid, setIsValid] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const validateToken = async () => {
      try {
        await api.get('/auth/verify');
        setIsValid(true);
      } catch {
        setIsValid(false);
      }
    };
    validateToken();
  }, []);

  if (isValid === null) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return isValid ? (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Stock Watchlist</h1>
          <div className="space-x-4">
            <a 
              href="/dashboard" 
              className={`px-3 py-2 rounded ${location.pathname === '/dashboard' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              Dashboard
            </a>
            <a 
              href="/alerts" 
              className={`px-3 py-2 rounded ${location.pathname === '/alerts' ? 'bg-blue-700' : 'hover:bg-blue-500'}`}
            >
              Alerts
            </a>
            <button 
              onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}
              className="px-3 py-2 bg-red-500 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <div className="container mx-auto p-4">
        <Outlet />
      </div>
    </div>
  ) : (
    <Navigate to="/login" replace />
  );
};

export default ProtectedRoute;