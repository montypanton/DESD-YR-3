import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import UserDropdown from './UserDropdown';
import ThemeToggle from '../ThemeToggle';

const AdminNavbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-purple-800 dark:bg-gray-900 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/admin" className="text-xl font-bold text-white flex items-center">
              <svg className="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 4.75L19.25 9L12 13.25L4.75 9L12 4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M9.25 11.75L4.75 14.25L12 18.25L19.25 14.25L14.6722 11.7088" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Admin Portal
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/admin" className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              Dashboard
            </Link>
            
            <Link to="/admin/users" className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              User Management
            </Link>
            
            <Link to="/admin/claims" className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              Claims Management
            </Link>
            
            <Link to="/admin/activity-logs" className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium">
              Activity Logs
            </Link>

            <Link to="/dashboard" className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium flex items-center">
              <span>Exit Admin</span>
              <svg className="ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
          
          {/* Mobile menu button and user dropdown */}
          <div className="md:hidden flex items-center">
            <button 
              className="text-white hover:text-gray-200 focus:outline-none mr-3"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
            <ThemeToggle />
            <div className="ml-3">
              <UserDropdown />
            </div>
          </div>
          
          {/* User dropdown for desktop */}
          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle />
            <UserDropdown />
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-purple-900 dark:bg-gray-800 border-t border-purple-700 dark:border-gray-700 px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link 
            to="/admin" 
            className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Admin Dashboard
          </Link>
          
          <Link 
            to="/admin/users" 
            className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            User Management
          </Link>
          
          <Link 
            to="/admin/claims" 
            className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Claims Management
          </Link>
          
          <Link 
            to="/admin/activity-logs" 
            className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Activity Logs
          </Link>

          <Link 
            to="/dashboard" 
            className="text-white hover:bg-purple-700 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Exit Admin
          </Link>
        </div>
      )}
    </nav>
  );
};

export default AdminNavbar;