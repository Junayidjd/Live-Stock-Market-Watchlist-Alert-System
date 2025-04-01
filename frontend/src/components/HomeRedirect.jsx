import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomeRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  }, [navigate]);

  return null; // This component doesn't render anything
}
