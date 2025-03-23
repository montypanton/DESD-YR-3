import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Layout = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isCurrentPath = (path) => {
    return location.pathname === path;
  };

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', roles: [] },
    { name: 'ML Models', path: '/ml-models', roles: ['ADMIN', 'ML_ENGINEER'] },
    { name: 'Predictions', path: '/predictions', roles: [] },
    { name: 'Finance', path: '/finance', roles: ['ADMIN', 'FINANCE'] },
    { name: 'Users', path: '/admin/users', roles: ['ADMIN'] },
    { name: 'Activity Logs', path: '/admin/activity-logs', roles: ['ADMIN'] },
  ];

  // Filter navigation links based on user role
  const filteredNavLinks = navLinks.filter(link => 
    link.roles.length === 0 || hasRole(link.roles)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">ML Platform</Link>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-4">
              {filteredNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isCurrentPath(link.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            
            {/* User Menu */}
            <div className="relative group">
              <button className="flex items-center text-sm font-medium text-gray-700 group-hover:text-blue-600">
                <span className="mr-2">{user?.first_name || user?.email}</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 hidden group-hover:block">
                <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </nav>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white shadow-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {filteredNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    isCurrentPath(link.path)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <Link
                to="/profile"
                className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="flex-grow bg-gray-50">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white shadow-inner py-4">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ML Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Layout;