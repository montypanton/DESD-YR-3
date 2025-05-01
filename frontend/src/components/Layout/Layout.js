import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import UserDropdown from './UserDropdown';
import ThemeToggle from '../ThemeToggle';

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  // Check if current path is an admin route, finance route, or ml-engineer route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isFinanceRoute = location.pathname.startsWith('/finance');
  const isMLEngineerRoute = location.pathname.startsWith('/ml-engineer') || location.pathname.startsWith('/user-interactions');
  
  // Determine if user should see a sidebar
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser === true;
  const isFinance = user?.role === 'FINANCE';
  const isMLEngineer = user?.role === 'ML_ENGINEER';
  
  // Only show sidebar for admin, finance, or ML engineers, or on their respective routes
  const shouldShowSidebar = isAdminRoute || isFinanceRoute || isMLEngineerRoute || isAdmin || isFinance || isMLEngineer;
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Only show top Navbar for routes that aren't admin, finance, or ml-engineer */}
      {!isAdminRoute && !isFinanceRoute && !isMLEngineerRoute && <Navbar />}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (only visible for admin/finance/ml-engineer users or on their routes) */}
        {shouldShowSidebar && <Sidebar />}
        
        {/* Main content */}
        <div className="flex flex-col flex-1">
          {/* Admin header - only for admin routes */}
          {isAdminRoute && (
            <div className="bg-purple-800 dark:bg-gray-900 py-3 px-6 shadow-md flex justify-between items-center">
              <h1 className="text-xl font-bold text-white flex items-center">
                <svg className="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4.75L19.25 9L12 13.25L4.75 9L12 4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9.25 11.75L4.75 14.25L12 18.25L19.25 14.25L14.6722 11.7088" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Admin Portal
              </h1>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <UserDropdown />
              </div>
            </div>
          )}
          
          {/* Finance header - only for finance routes */}
          {isFinanceRoute && (
            <div className="bg-green-700 dark:bg-gray-900 py-3 px-6 shadow-md flex justify-between items-center">
              <h1 className="text-xl font-bold text-white flex items-center">
                <svg className="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8.25V12L14.25 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7.5 3.75H16.5C17.743 3.75 18.75 4.757 18.75 6V18C18.75 19.243 17.743 20.25 16.5 20.25H7.5C6.257 20.25 5.25 19.243 5.25 18V6C5.25 4.757 6.257 3.75 7.5 3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Finance Portal
              </h1>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <UserDropdown />
              </div>
            </div>
          )}
          
          {/* ML Engineer header - only for ml-engineer routes */}
          {isMLEngineerRoute && (
            <div className="bg-indigo-700 dark:bg-gray-900 py-3 px-6 shadow-md flex justify-between items-center">
              <h1 className="text-xl font-bold text-white flex items-center">
                <svg className="h-8 w-8 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.25 13.5L8.25 16.5L12.75 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14.25 3.75H19.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.5 4.5L12.75 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                ML Engineer Portal
              </h1>
              <div className="flex items-center space-x-4">
                <ThemeToggle />
                <UserDropdown />
              </div>
            </div>
          )}
          
          <main className="flex-1 overflow-y-auto p-6 text-gray-900 dark:text-gray-100">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;