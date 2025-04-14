import {
  Bell,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Settings,
  Star,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const CACHE_KEYS = {
  TOKEN: "token",
  USER: "user",
  AUTH_DATA: "auth_data",
};

const StudentLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);

  // Fallback to localStorage if user is null
  useEffect(() => {
    if (user) {
      setUserData(user);
    } else {
      try {
        const storedUser = localStorage.getItem(CACHE_KEYS.USER);
        if (storedUser) {
          setUserData(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to parse stored user data:", e);
      }
    }
  }, [user]);

  // Redirect if still no user data
  useEffect(() => {
    if (!user && !userData) {
      navigate("/login");
    }
  }, [userData, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Get initials for avatar
  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const navigation = [
    {
      name: "Dashboard",
      path: "/student/dashboard",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      name: "Team",
      path: "/student/team/management",
      icon: <Users className="w-4 h-4" />,
    },
    {
      name: "Chat",
      path: "/student/team/chat",
      icon: <MessageSquare className="w-4 h-4" />,
    },
    {
      name: "Projects",
      path: "/student/projects",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      name: "Results",
      path: "/student/results",
      icon: <Star className="w-4 h-4" />,
    },
    {
      name: "Messages",
      path: "/student/messages",
      icon: <Bell className="w-4 h-4" />,
    },
    {
      name: "Deadlines",
      path: "/student/deadlines",
      icon: <Calendar className="w-4 h-4" />,
    },
    {
      name: "Profile",
      path: "/student/profile",
      icon: <User className="w-4 h-4" />,
    },
  ];

  // If we don't have user data yet, show a loading state
  if (!user && !userData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out border-r border-gray-100 dark:border-gray-700/30 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:z-0 lg:h-screen`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100 dark:border-gray-700/30">
          <Link to="/student/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-md flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
              </svg>
            </div>
            <span className="text-lg font-medium bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-violet-400">
              Portal
            </span>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <div className="flex items-center p-2 mb-6 rounded-lg">
            <Avatar className="h-9 w-9 mr-3 ring-2 ring-white/10 dark:ring-gray-800/60">
              <AvatarImage
                src={
                  userData?.profilePicture ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    userData?.fullName || "User"
                  )}&background=6366F1&color=fff`
                }
                alt={userData?.fullName || "User"}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                {getInitials(userData?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                {userData?.fullName || "User"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {userData?.email || "user@example.com"}
              </p>
            </div>
          </div>

          <nav className="space-y-1 mt-2">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/40"
                  }
                `}
              >
                <span
                  className={`mr-2.5 ${
                    location.pathname === item.path
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {item.icon}
                </span>
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 dark:border-gray-700/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen max-h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700/30 h-16 flex items-center px-4 md:px-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="mr-4 p-1.5 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1 font-medium text-gray-700 dark:text-gray-200 text-sm">
            {location.pathname.includes("/dashboard")
              ? "Dashboard"
              : location.pathname.includes("/team/management")
              ? "Team Management"
              : location.pathname.includes("/team/chat")
              ? "Team Chat"
              : location.pathname.includes("/projects")
              ? "Projects"
              : location.pathname.includes("/profile")
              ? "Profile"
              : location.pathname.includes("/results")
              ? "Results"
              : location.pathname.includes("/messages")
              ? "Messages"
              : location.pathname.includes("/deadlines")
              ? "Deadlines"
              : ""}
          </div>

          <div className="flex items-center space-x-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-8 w-8"
              onClick={toggleTheme}
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8 p-0 ml-1.5"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={
                        userData?.profilePicture ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          userData?.fullName || "User"
                        )}&background=6366F1&color=fff`
                      }
                      alt={userData?.fullName || "User"}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white">
                      {getInitials(userData?.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {userData?.fullName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {userData?.email || "user@example.com"}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => navigate("/student/profile")}
                  className="cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigate("/student/settings")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="container mx-auto py-4 px-4 md:px-6 max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentLayout;
