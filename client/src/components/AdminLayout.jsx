// AdminLayout.jsx
import {
  faBars,
  faCog,
  faSignOutAlt,
  faTimes,
  faUserClock,
  faUserShield,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar toggle */}
      <button
        className="lg:hidden fixed top-5 left-5 z-50 p-2 rounded-md bg-blue-800 text-white"
        onClick={toggleSidebar}
      >
        <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-blue-900 text-white transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:relative lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="px-6 py-4 border-b border-blue-800">
            <div className="flex items-center justify-center">
              <FontAwesomeIcon icon={faUserShield} className="text-2xl mr-2" />
              <h2 className="text-xl font-bold">Admin Panel</h2>
            </div>
          </div>

          {/* User profile */}
          <div className="px-6 py-4 border-b border-blue-800">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Profile" className="w-10 h-10 rounded-full" />
                ) : (
                  <span className="text-lg font-bold">{user?.fullName?.charAt(0) || 'A'}</span>
                )}
              </div>
              <div>
                <p className="font-semibold">{user?.fullName || 'Admin User'}</p>
                <p className="text-xs text-blue-300">{user?.email || 'admin@example.com'}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="py-6 flex-grow">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/admin/dashboard"
                  className="flex items-center px-6 py-3 text-blue-100 hover:bg-blue-800"
                >
                  <FontAwesomeIcon icon={faUserShield} className="mr-3" />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/users"
                  className="flex items-center px-6 py-3 text-blue-100 hover:bg-blue-800"
                >
                  <FontAwesomeIcon icon={faUsers} className="mr-3" />
                  <span>Users</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/pending"
                  className="flex items-center px-6 py-3 text-blue-100 hover:bg-blue-800"
                >
                  <FontAwesomeIcon icon={faUserClock} className="mr-3" />
                  <span>Pending Approvals</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/settings"
                  className="flex items-center px-6 py-3 text-blue-100 hover:bg-blue-800"
                >
                  <FontAwesomeIcon icon={faCog} className="mr-3" />
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </nav>

          {/* Logout */}
          <div className="px-6 py-4 border-t border-blue-800 mt-auto">
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2 text-blue-100 bg-blue-800 rounded-md hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;