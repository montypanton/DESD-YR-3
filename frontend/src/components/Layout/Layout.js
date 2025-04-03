import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900">ML Platform</Link>
              </div>
              <nav className="ml-6 flex space-x-8">
                <Link to="/dashboard" className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link to="/predictions" className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-900">
                  Predictions
                </Link>
                {user && user.role === 'ML_ENGINEER' && (
                  <Link to="/ml-models" className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-900">
                    ML Models
                  </Link>
                )}
                {user && user.role === 'FINANCE' && (
                  <Link to="/finance" className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-900">
                    Finance
                  </Link>
                )}
                {user && user.role === 'ADMIN' && (
                  <div className="relative group">
                    <button className="inline-flex items-center px-1 pt-1 text-gray-600 hover:text-gray-900">
                      Admin
                    </button>
                    <div className="absolute left-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                      <Link to="/admin/users" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        User Management
                      </Link>
                      <Link to="/admin/activity-logs" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Activity Logs
                      </Link>
                    </div>
                  </div>
                )}
              </nav>
            </div>
            <div className="flex items-center">
              <div className="ml-3 relative group">
                <div>
                  <button className="max-w-xs flex items-center text-sm rounded-full focus:outline-none">
                    <span className="sr-only">Open user menu</span>
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-500 text-white">
                      {user && user.first_name ? user.first_name[0] : 'U'}
                    </span>
                  </button>
                </div>
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10 hidden group-hover:block">
                  <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Your Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow bg-gray-50">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ML Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;