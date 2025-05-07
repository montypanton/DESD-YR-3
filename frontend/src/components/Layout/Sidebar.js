import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Check if we're in the admin, finance, or ml-engineer section
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isFinanceRoute = location.pathname.startsWith('/finance');
  const isMLEngineerRoute = location.pathname.startsWith('/ml-engineer') || location.pathname.startsWith('/user-interactions');
  
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser === true;
  const isFinance = user?.role === 'FINANCE';
  const isMLEngineer = user?.role === 'ML_ENGINEER';

  const isActive = (path) => {
    // Handle partial path matching for nested routes
    if (path === '/user-interactions' && location.pathname.startsWith(path)) {
      return 'bg-indigo-700';
    }
    return location.pathname === path ? 'bg-indigo-700' : '';
  };

  // Different styling for admin, finance, and ml-engineer sidebar
  const sidebarClass = isAdminRoute 
    ? "w-64 bg-purple-900 text-white h-screen hidden md:block"
    : isFinanceRoute
    ? "w-64 bg-green-800 text-white h-screen hidden md:block" 
    : isMLEngineerRoute
    ? "w-64 bg-indigo-900 text-white h-screen hidden md:block"
    : "w-64 bg-gray-800 text-white h-screen hidden md:block";

  // If in admin routes, show only admin navigation
  if (isAdminRoute && isAdmin) {
    return (
      <aside className={sidebarClass}>
        <div className="p-4">
          <div className="mb-8 px-4">
            <svg className="h-12 w-12 mx-auto mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.75L19.25 9L12 13.25L4.75 9L12 4.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9.25 11.75L4.75 14.25L12 18.25L19.25 14.25L14.6722 11.7088" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-center font-bold text-lg">Admin Portal</h2>
          </div>
          
          <nav>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/admin" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/admin')} hover:bg-purple-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>Admin Dashboard</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin/users" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/admin/users')} hover:bg-purple-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>User Management</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin/claims" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/admin/claims')} hover:bg-purple-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Claims Management</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/admin/activity-logs" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/admin/activity-logs')} hover:bg-purple-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>Activity Logs</span>
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    );
  }
  
  // If in finance routes, show only finance navigation
  if (isFinanceRoute && (isFinance || isAdmin)) {
    return (
      <aside className={sidebarClass}>
        <div className="p-4">
          <div className="mb-8 px-4">
            <svg className="h-12 w-12 mx-auto mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8.25V12L14.25 14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7.5 3.75H16.5C17.743 3.75 18.75 4.757 18.75 6V18C18.75 19.243 17.743 20.25 16.5 20.25H7.5C6.257 20.25 5.25 19.243 5.25 18V6C5.25 4.757 6.257 3.75 7.5 3.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="text-center font-bold text-lg">Finance Portal</h2>
          </div>
          
          <nav>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/finance/dashboard" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/dashboard')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                    <span>Finance Dashboard</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/finance/usage-analytics" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/usage-analytics')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Usage Analytics</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/finance/billing-rates" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/billing-rates')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    <span>Billing Rates</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/finance/claims" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/claims')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Manage Claims</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/finance/insurance-companies" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/insurance-companies')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2h-1.528A6 6 0 004 9.528V4z" />
                      <path fillRule="evenodd" d="M8 10a4 4 0 00-3.446 6.032l-1.261 1.26a1 1 0 101.414 1.415l1.261-1.261A4 4 0 108 10zm-2 4a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                    </svg>
                    <span>Insurance Companies</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/finance/invoices" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/invoices')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span>Invoices</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/finance/reports" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/reports')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Reports</span>
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    );
  }
  
  // If in ML Engineer routes, show only ML Engineer navigation
  if (isMLEngineerRoute && (isMLEngineer || isAdmin)) {
    return (
      <aside className={sidebarClass}>
        <div className="p-4">
          <div className="mb-8 px-4">
            <svg className="h-12 w-12 mx-auto mb-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.25 13.5L8.25 16.5L12.75 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.25 3.75H19.5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19.5 4.5L12.75 11.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <h2 className="text-center font-bold text-lg">ML Engineer Portal</h2>
          </div>
          
          <nav>
            <ul className="space-y-2">
            <li>
                <Link 
                  to="/ml-engineer/dashboard" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/dashboard')} hover:bg-indigo-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    <span>Dashboard</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/ml-engineer/model-management" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/model-management')} hover:bg-indigo-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    <span>Model Management</span>
                  </div>
                </Link>
              </li>
              
              <li>
                <Link 
                  to="/ml-engineer/user-interactions" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/user-interactions')} hover:bg-indigo-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>User Interactions</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link 
                  to="/ml-engineer/model-performance" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/model-performance')} hover:bg-indigo-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Model Performance</span>
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
    );
  }

  // Regular sidebar for non-admin and non-finance routes
  return (
    <aside className={sidebarClass}>
      <div className="p-4">
        <nav>
          <ul className="space-y-2">
            <li>
              <Link 
                to="/dashboard" 
                className={`block py-2.5 px-4 rounded transition ${isActive('/dashboard')} hover:bg-gray-700`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link 
                to="/predictions" 
                className={`block py-2.5 px-4 rounded transition ${isActive('/predictions')} hover:bg-gray-700`}
              >
                Predictions
              </Link>
            </li>
            
            {/* ML Engineer section */}
            {isMLEngineer && (
              <>
                <li className="pt-4 pb-2">
                  <span className="px-4 text-xs font-semibold text-gray-400 uppercase">ML Engineer</span>
                </li>
                <li>
                  <Link 
                    to="/ml-engineer/dashboard" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/dashboard')} hover:bg-indigo-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
                      </svg>
                      <span>Dashboard</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/ml-engineer/model-management" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/model-management')} hover:bg-indigo-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Model Management</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/ml-engineer/user-interactions" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/ml-engineer/user-interactions')} hover:bg-indigo-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <span>User Interactions</span>
                    </div>
                  </Link>
                </li>
              </>
            )}
            
            {/* Finance section link */}
            {(isAdmin || isFinance) && (
              <>
                <li className="pt-4 pb-2">
                  <span className="px-4 text-xs font-semibold text-gray-400 uppercase">Finance</span>
                </li>
                <li>
                  <Link 
                    to="/finance/dashboard" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/finance/dashboard')} hover:bg-gray-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      <span>Finance Dashboard</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/finance/usage-analytics" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/finance/usage-analytics')} hover:bg-gray-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Usage Analytics</span>
                    </div>
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/finance/billing-rates" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/finance/billing-rates')} hover:bg-gray-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                      </svg>
                      <span>Billing Rates</span>
                    </div>
                  </Link>
                </li>
              </>
            )}
            
            {/* Admin section link (only if user is admin) */}
            {isAdmin && (
              <>
                <li className="pt-4 pb-2">
                  <span className="px-4 text-xs font-semibold text-gray-400 uppercase">Admin</span>
                </li>
                <li>
                  <Link 
                    to="/admin" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/admin')} hover:bg-gray-700`}
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                      </svg>
                      <span>Admin Portal</span>
                    </div>
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
