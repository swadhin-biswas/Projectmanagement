import { Button } from "@/components/ui/button";
import {
  faExclamationTriangle,
  faHome,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Unauthorized = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine where to redirect the user based on their role
  const handleGoToDashboard = () => {
    if (!user) {
      navigate("/login");
      return;
    }

    switch (user.role) {
      case "admin":
      case "superadmin":
        navigate("/admin/dashboard");
        break;
      case "supervisor":
        navigate("/supervisor/dashboard");
        break;
      case "student":
        navigate("/student/dashboard");
        break;
      default:
        navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-red-500 text-6xl mb-6">
        <FontAwesomeIcon icon={faExclamationTriangle} />
      </div>
      <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white text-center">
        Access Denied
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
        You don't have permission to access this page. Please contact an
        administrator if you believe this is an error.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          onClick={handleGoToDashboard}
          className="bg-blue-700 hover:bg-blue-800 text-white"
        >
          <FontAwesomeIcon icon={faHome} className="mr-2" />
          Go to Dashboard
        </Button>
        <Link to="/">
          <Button variant="outline" className="dark:text-white">
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Unauthorized;
