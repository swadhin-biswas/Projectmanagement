import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner ONLY while the AuthContext is verifying
  if (loading) {
    return <LoadingSpinner />;
  }

  // After loading, check if authenticated
  if (!isAuthenticated) {
    // Redirect to login page, saving the current location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If we need to check roles but user is null, try to get it from localStorage
  if (allowedRoles.length > 0 && !user) {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // Check if stored user has allowed role
        if (parsedUser && allowedRoles.includes(parsedUser.role)) {
          return children;
        }
      }
      // If we couldn't get a valid user with an allowed role, redirect to unauthorized
      return <Navigate to="/unauthorized" replace />;
    } catch (e) {
      console.error("Failed to parse stored user in ProtectedRoute:", e);
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check roles if applicable (using the user from context)
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    // User is authenticated but doesn't have the required role
    return <Navigate to="/unauthorized" replace />;
  }

  // If authenticated and has the right role (or no specific role required), render the children
  return children;
};

export default ProtectedRoute;
