import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import PageTransition from "../components/PageTransition";
import ProtectedRoute from "../components/ProtectedRoute";
import { useAuth } from "../contexts/AuthContext";

// Lazy loaded components
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const NotFound = lazy(() => import("../pages/NotFound"));
const Unauthorized = lazy(() => import("../pages/Unauthorized"));
const Landing = lazy(() => import("../pages/Landing"));

// Admin routes
const AdminDashboard = lazy(() => import("../pages/admin/Dashboard"));
const UserManagement = lazy(() => import("../pages/admin/UserManagement"));
const TeamManagement = lazy(() => import("../pages/admin/TeamManagement"));
const ProjectManagement = lazy(() =>
  import("../pages/admin/ProjectManagement")
);

// Supervisor routes
const SupervisorDashboard = lazy(() => import("../pages/supervisor/Dashboard"));
const TeamEvaluation = lazy(() => import("../pages/supervisor/TeamEvaluation"));
const ProjectEvaluation = lazy(() =>
  import("../pages/supervisor/ProjectEvaluation")
);
const SupervisorNotifications = lazy(() =>
  import("../pages/supervisor/Notifications")
);
const SupervisorReports = lazy(() => import("../pages/supervisor/Reports"));
const SupervisorAnalytics = lazy(() => import("../pages/supervisor/Analytics"));

// Student routes
const StudentDashboard = lazy(() => import("../pages/student/Dashboard"));
const TeamView = lazy(() => import("../pages/student/TeamView"));
const ProjectSubmission = lazy(() =>
  import("../pages/student/ProjectSubmission")
);
const StudentTeamManagement = lazy(() =>
  import("../pages/student/TeamManagement")
);
const TeamChatPage = lazy(() => import("../pages/student/TeamChatPage"));
const ResultsPage = lazy(() => import("../pages/student/Results"));

// Layouts
const AdminLayout = lazy(() => import("../layouts/AdminLayout"));
const SupervisorLayout = lazy(() => import("../layouts/SupervisorLayout"));
const StudentLayout = lazy(() => import("../layouts/StudentLayout"));

const RoleBasedRedirect = () => {
  const { user } = useAuth();

  // If user is null, try to get from localStorage
  if (!user) {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && parsedUser.role) {
          // Redirect based on role from localStorage
          switch (parsedUser.role) {
            case "admin":
            case "superadmin":
              return <Navigate to="/admin/dashboard" replace />;
            case "supervisor":
              return <Navigate to="/supervisor/dashboard" replace />;
            case "student":
              return <Navigate to="/student/dashboard" replace />;
            default:
              break;
          }
        }
      }
    } catch (e) {
      console.error("Failed to parse stored user in RoleBasedRedirect:", e);
    }

    // If we can't get a valid user role, go to login
    return <Navigate to="/login" replace />;
  }

  // If we have user from context, use it for redirection
  switch (user.role) {
    case "admin":
    case "superadmin":
      return <Navigate to="/admin/dashboard" replace />;
    case "supervisor":
      return <Navigate to="/supervisor/dashboard" replace />;
    case "student":
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <LoadingSpinner size="xl" />
        </div>
      }
    >
      <Routes>
        {/* Public routes */}
        <Route
          path="/"
          element={
            <PageTransition>
              {user ? <Navigate to="/dashboard" replace /> : <Landing />}
            </PageTransition>
          }
        />
        <Route
          path="/login"
          element={
            <PageTransition>
              {user ? <Navigate to="/dashboard" replace /> : <Login />}
            </PageTransition>
          }
        />
        <Route
          path="/register"
          element={
            <PageTransition>
              {user ? <Navigate to="/dashboard" replace /> : <Register />}
            </PageTransition>
          }
        />

        {/* Dynamic dashboard redirect */}
        <Route path="/dashboard" element={<RoleBasedRedirect />} />

        {/* Unauthorized route */}
        <Route
          path="/unauthorized"
          element={
            <PageTransition>
              <Unauthorized />
            </PageTransition>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin", "superadmin"]}>
              <PageTransition>
                <AdminLayout />
              </PageTransition>
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
            <ProtectedRoute allowedRoles={["supervisor"]}>
              <PageTransition>
                <SupervisorLayout />
              </PageTransition>
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={<Navigate to="/supervisor/dashboard" replace />}
          />
          <Route path="dashboard" element={<SupervisorDashboard />} />
          <Route path="teams" element={<TeamEvaluation />} />
          <Route path="projects" element={<ProjectEvaluation />} />
          <Route path="notifications" element={<SupervisorNotifications />} />
          <Route path="reports" element={<SupervisorReports />} />
          <Route path="analytics" element={<SupervisorAnalytics />} />
        </Route>

        {/* Student routes */}
        <Route
          path="/student/*"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <PageTransition>
                <StudentLayout />
              </PageTransition>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/student/dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="team" element={<TeamView />} />
          <Route path="project" element={<ProjectSubmission />} />
          <Route path="team/management" element={<StudentTeamManagement />} />
          <Route path="team/chat" element={<TeamChatPage />} />
          <Route path="results" element={<ResultsPage />} />
        </Route>

        {/* Catch-all route */}
        <Route
          path="*"
          element={
            <PageTransition>
              <NotFound />
            </PageTransition>
          }
        />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
