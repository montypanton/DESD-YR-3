import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => {
    return location.pathname === path ? 'bg-indigo-700' : '';
  };

  return (
    <aside className="w-64 bg-gray-800 text-white h-screen hidden md:block">
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
            
            {(user?.role === 'ADMIN' || user?.role === 'FINANCE') && (
              <li>
                <Link 
                  to="/finance" 
                  className={`block py-2.5 px-4 rounded transition ${isActive('/finance')} hover:bg-gray-700`}
                >
                  Finance
                </Link>
              </li>
            )}
            
            {user?.role === 'ADMIN' && (
              <>
                <li className="pt-4 pb-2">
                  <span className="px-4 text-xs font-semibold text-gray-400 uppercase">Admin</span>
                </li>
                <li>
                  <Link 
                    to="/admin/users" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/admin/users')} hover:bg-gray-700`}
                  >
                    User Management
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/admin/activity-logs" 
                    className={`block py-2.5 px-4 rounded transition ${isActive('/admin/activity-logs')} hover:bg-gray-700`}
                  >
                    Activity Logs
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
