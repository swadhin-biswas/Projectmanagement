import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  // If user is not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user's role is not included, show unauthorized
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // You can create an Unauthorized component for better UX
    return <Navigate to="/unauthorized" replace />;
  }

  // If all checks pass, render the protected content
  return children;
};

export default ProtectedRoute;
