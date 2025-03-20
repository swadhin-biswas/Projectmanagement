import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy loaded components
const Login = lazy(() => import('../pages/Login'));
const Register = lazy(() => import('../pages/Register'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Admin routes
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const TeamManagement = lazy(() => import('../pages/admin/TeamManagement'));
const ProjectManagement = lazy(() => import('../pages/admin/ProjectManagement'));

// Supervisor routes
const SupervisorDashboard = lazy(() => import('../pages/supervisor/Dashboard'));
const TeamEvaluation = lazy(() => import('../pages/supervisor/TeamEvaluation'));
const ProjectEvaluation = lazy(() => import('../pages/supervisor/ProjectEvaluation'));

// Student routes
const StudentDashboard = lazy(() => import('../pages/student/Dashboard'));
const TeamView = lazy(() => import('../pages/student/TeamView'));
const ProjectSubmission = lazy(() => import('../pages/student/ProjectSubmission'));

// Layouts
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const SupervisorLayout = lazy(() => import('../layouts/SupervisorLayout'));
const StudentLayout = lazy(() => import('../layouts/StudentLayout'));

const Landing = lazy(() => import('../pages/Landing'));

// Component to redirect based on user role
const RoleBasedRedirect = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'admin':
    case 'superAdmin':
      return <Navigate to="/admin/dashboard" replace />;
    case 'supervisor':
      return <Navigate to="/supervisor/dashboard" replace />;
    case 'student':
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={
          user ? <RoleBasedRedirect /> : <Landing />
        } />
        <Route path="/login" element={
          user ? <RoleBasedRedirect /> : <Login />
        } />
        <Route path="/register" element={
          user ? <RoleBasedRedirect /> : <Register />
        } />
        
        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin', 'superAdmin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="teams" element={<TeamManagement />} />
          <Route path="projects" element={<ProjectManagement />} />
        </Route>

        {/* Supervisor routes */}
        <Route
          path="/supervisor/*"
          element={
            <ProtectedRoute allowedRoles={['supervisor']}>
              <SupervisorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/supervisor/dashboard" replace />} />
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="teams" element={<TeamEvaluation />} />
          <Route path="projects" element={<ProjectEvaluation />} />
        </Route>

        {/* Student routes */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="team" element={<TeamView />} />
          <Route path="project" element={<ProjectSubmission />} />
        </Route>

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
