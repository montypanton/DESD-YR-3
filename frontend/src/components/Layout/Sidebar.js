import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Check if we're in the admin or finance section
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isFinanceRoute = location.pathname.startsWith('/finance');
  const isAdmin = user?.role === 'ADMIN' || user?.is_superuser === true;
  const isFinance = user?.role === 'FINANCE';

  const isActive = (path) => {
    return location.pathname === path ? 'bg-indigo-700' : '';
  };

  // Different styling for admin and finance sidebar
  const sidebarClass = isAdminRoute 
    ? "w-64 bg-purple-900 text-white h-screen hidden md:block"
    : isFinanceRoute
    ? "w-64 bg-green-800 text-white h-screen hidden md:block" 
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
                  to="/finance/reports" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance/reports')} hover:bg-green-700`}
                >
                  <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Financial Reports</span>
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
            
            {/* ML Engineer routes */}
            {(user?.role === 'ADMIN' || user?.role === 'ML_ENGINEER') && (
              <li>
                <Link 
                  to="/ml-models" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/ml-models')} hover:bg-gray-700`}
                >
                  ML Models
                </Link>
              </li>
            )}
            
            {/* Finance section link */}
            {(user?.role === 'ADMIN' || user?.role === 'FINANCE') && (
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
                        <path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                      <span>Finance Portal</span>
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
