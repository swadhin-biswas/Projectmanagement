import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const RoleBasedRedirect = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // Remember where they were trying to go
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Handle supervisor approval status
  if (user.role === 'supervisor' && !user.isApproved) {
    toast.info('Your account is pending approval');
    return <Navigate to="/pending-approval" replace />;
  }

  // Determine dashboard route based on role
  const dashboardRoutes = {
    admin: '/admin/dashboard',
    superadmin: '/admin/dashboard',
    supervisor: '/supervisor/dashboard',
    student: '/student/dashboard'
  };

  const dashboardRoute = dashboardRoutes[user.role];
  if (!dashboardRoute) {
    toast.error('Invalid user role');
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={dashboardRoute} replace />;
};

export default RoleBasedRedirect;