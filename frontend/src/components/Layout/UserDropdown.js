import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const UserDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Generate initials for the user avatar placeholder
  const getInitials = () => {
    if (!user?.first_name && !user?.last_name) return "U";
    return `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`;
  };
  
  // Determine the profile route based on user's role
  const getProfileRoute = () => {
    if (user?.role === 'ADMIN' || user?.is_superuser === true) {
      return '/admin/profile';
    } else if (user?.role === 'FINANCE') {
      return '/finance/profile';
    } else {
      return '/profile';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center focus:outline-none" 
        onClick={toggleDropdown}
      >
        <div className="w-9 h-9 rounded-full bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-medium hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition-all">
          {getInitials()}
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg overflow-hidden z-10 ring-1 ring-black ring-opacity-5">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.first_name} {user?.last_name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-600">
            <Link 
              to={getProfileRoute()} 
              className="flex items-center px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setIsOpen(false)}
            >
              <span>Profile</span>
            </Link>
            <button 
              className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={handleLogout}
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDropdown;
