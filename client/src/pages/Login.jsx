// Login.jsx
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the redirect path from location state or default to dashboard
  const from = location.state?.from || '/';

  useEffect(() => {
    // Check for session expired message
    const params = new URLSearchParams(location.search);
    const sessionExpired = params.get("session") === "expired";
    if (sessionExpired) {
      toast.error("Your session has expired. Please login again.");
    }

    // If user is already logged in, redirect based on role
    if (user) {
      redirectAfterLogin(user);
    }
  }, [user, location]);

  const validateForm = () => {
    const errors = {};

    // Email validation
    if (!credentials.email?.trim()) {
      errors.email = "Email is required";
    } else {
      const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,}$/;
      if (!emailRegex.test(credentials.email.trim())) {
        errors.email = "Please enter a valid email address";
      }
    }

    // Password validation
    if (!credentials.password) {
      errors.password = "Password is required";
    } else if (credentials.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const redirectAfterLogin = (user) => {
    const dashboardRoutes = {
      admin: '/admin/dashboard',
      superadmin: '/admin/dashboard',
      supervisor: '/supervisor/dashboard',
      student: '/student/dashboard'
    };

    const dashboardRoute = dashboardRoutes[user.role];

    if (user.role === 'supervisor' && !user.isApproved) {
      toast.info('Your account is pending approval. You will be notified once approved.');
      return;
    }

    if (dashboardRoute) {
      // Animate transition
      document.body.style.opacity = '0';
      setTimeout(() => {
        navigate(dashboardRoute);
        document.body.style.opacity = '1';
      }, 300);
    } else {
      navigate(from);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const { isValid, errors } = validateForm();
    if (!isValid) {
      const firstError = Object.values(errors)[0];
      toast.error(firstError);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await login(credentials);

      if (result.success) {
        // Login successful - redirection handled by useEffect
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      toast.error(error.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-black to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg p-8 rounded-xl shadow-2xl transform transition-all hover:scale-[1.02] duration-300">
        <div className="text-center">
          <h2 className="mt-6 text-4xl font-bold tracking-tight text-white">
            Welcome Back
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            Sign in to access your account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white rounded-lg bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
                placeholder="Enter your email"
                value={credentials.email}
                onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none relative block w-full px-4 py-3 border border-gray-600 placeholder-gray-400 text-white rounded-lg bg-gray-800/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-blue-400 hover:text-blue-300 transition-colors duration-200">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white transition-all duration-200 ${
                isSubmitting
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2">Signing in...</span>
                </span>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-300 bg-[#000b18]">or</span>
              </div>
            </div>

            <div className="text-center">
              <span className="text-gray-300">Don't have an account? </span>
              <Link
                to="/register"
                className="font-semibold text-blue-400 hover:text-blue-300 transition-colors duration-200"
              >
                Sign up now
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
