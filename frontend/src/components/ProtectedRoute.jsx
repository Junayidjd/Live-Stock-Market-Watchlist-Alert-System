import { Navigate, Outlet } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

const ProtectedRoute = () => {
  const token = localStorage.getItem("token");

  const validateToken = async () => {
    if (!token) return false;
    
    try {
      const decoded = jwtDecode(token);
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("token");
        return false;
      }
      
      // Verify token with backend
      await axios.get("http://localhost:5000/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      return true;
    } catch {
      localStorage.removeItem("token");
      return false;
    }
  };

  if (!validateToken()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;