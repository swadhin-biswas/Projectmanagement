import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const SessionExpiryHandler = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);

  // We won't do automatic token checking to avoid the issue
  // Instead, we'll only handle user-initiated actions

  // When a user gets a 401 from the API, they can manually refresh
  // This component now only exists as a placeholder for future session UI

  return null;
};

export default SessionExpiryHandler;
