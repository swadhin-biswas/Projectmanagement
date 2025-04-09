import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner ONLY while the AuthContext is verifying
  if (loading) {
    console.log("ProtectedRoute: Auth context is loading...");
    return <LoadingSpinner />; // Or a more sophisticated loading UI
  }

  // After loading, check if authenticated
  if (!isAuthenticated) {
    console.log("ProtectedRoute: Not authenticated, redirecting to login.");
    // Redirect them to the /login page, but save the current location they were
    // trying to go to when they were redirected. This allows us to send them
    // along to that page after they login, which is a nicer user experience
    // than dropping them off on the home page.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check roles if applicable (user should be guaranteed to exist if isAuthenticated is true)
  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    console.log(
      `ProtectedRoute: Unauthorized access attempt. User role: ${
        user?.role
      }, Allowed roles: ${allowedRoles.join(", ")}`
    );
    // User is authenticated but doesn't have the required role
    return <Navigate to="/unauthorized" replace />;
  }

  console.log("ProtectedRoute: Access granted.");
  // If authenticated and has the right role (or no specific role required), render the children
  return children;
};

export default ProtectedRoute;
