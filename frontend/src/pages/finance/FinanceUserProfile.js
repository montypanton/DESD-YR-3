import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, Spin, message, Tabs, Descriptions, Tag, Card, Timeline, Button } from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  ArrowLeftOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  IdcardOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { apiClient } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';

const { TabPane } = Tabs;

const FinanceUserProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { darkMode } = useTheme();
  
  const [user, setUser] = useState(null);
  const [userClaims, setUserClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/account/users/${id}/`);
        setUser(response.data);
        fetchUserClaims(response.data.id);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError('Failed to load user profile. Please try again later.');
        message.error('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchUserClaims = async (userId) => {
      try {
        setClaimsLoading(true);
        // Get claims associated with this user
        const response = await apiClient.get(`/claims/?user=${userId}`);
        setUserClaims(response.data.results || response.data || []);
      } catch (error) {
        console.error('Error fetching user claims:', error);
        message.warning('Could not load user claims history');
      } finally {
        setClaimsLoading(false);
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'PROCESSING': return 'blue';
      case 'PENDING': return 'gold';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
          <p className="ml-4">Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4">
          <p>{error}</p>
          <Button 
            type="primary" 
            onClick={() => navigate('/finance/claims')} 
            className="mt-4"
          >
            Back to Claims
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4">
          <p>User not found or you don't have permission to view this profile.</p>
          <Button 
            type="primary" 
            onClick={() => navigate('/finance/claims')} 
            className="mt-4"
          >
            Back to Claims
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <Breadcrumb.Item>
          <Link to="/" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/finance/claims" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <FileTextOutlined /> Claims
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/finance/claims" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <UserOutlined /> Users
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          {user.first_name} {user.last_name}
        </Breadcrumb.Item>
      </Breadcrumb>

      <Button 
        type="primary" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)}
        className="mb-6"
      >
        Back
      </Button>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-md rounded-lg overflow-hidden`}>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`h-24 w-24 rounded-full bg-white ${darkMode ? 'text-indigo-600' : 'text-indigo-500'} flex items-center justify-center`}>
                <UserOutlined style={{ fontSize: '2.5rem' }} />
              </div>
            </div>
            <div className="ml-6">
              <h1 className="text-2xl font-bold text-white">{user.first_name} {user.last_name}</h1>
              <p className="text-indigo-100">{user.email}</p>
              <div className="mt-2">
                <Tag color={user.is_active ? 'green' : 'red'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Tag>
                <Tag color="blue">{user.role}</Tag>
              </div>
            </div>
          </div>
        </div>

        <Tabs 
          defaultActiveKey="profile" 
          className="px-8 pt-6"
          type="card"
        >
          <TabPane 
            tab={
              <span>
                <UserOutlined />
                Profile Information
              </span>
            } 
            key="profile"
          >
            <div className="px-4 py-5 sm:p-6">
              <Descriptions
                bordered
                column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }}
                className={darkMode ? 'dark-descriptions' : ''}
              >
                <Descriptions.Item label="Full Name">{user.first_name} {user.last_name}</Descriptions.Item>
                <Descriptions.Item label="Email">
                  <div className="flex items-center">
                    <MailOutlined className="mr-2" /> 
                    {user.email}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="User Type">{user.role}</Descriptions.Item>
                <Descriptions.Item label="User ID">
                  <div className="flex items-center">
                    <IdcardOutlined className="mr-2" />
                    {user.id}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Department">
                  <div className="flex items-center">
                    <BankOutlined className="mr-2" />
                    {user.department || 'Not specified'}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  <div className="flex items-center">
                    <PhoneOutlined className="mr-2" />
                    {user.phone_number || 'Not available'}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="Account Status">
                  <Tag color={user.is_active ? 'green' : 'red'}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Date Joined">
                  {user.date_joined ? formatDate(user.date_joined) : 'Unknown'}
                </Descriptions.Item>
                {user.last_login && (
                  <Descriptions.Item label="Last Login" span={2}>
                    {formatDate(user.last_login)}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </div>
          </TabPane>

          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                Claims History
              </span>
            } 
            key="claims"
          >
            <div className="px-4 py-5 sm:p-6">
              {claimsLoading ? (
                <div className="flex justify-center py-8">
                  <Spin />
                  <span className="ml-3">Loading claims...</span>
                </div>
              ) : (
                <>
                  <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Claims History ({userClaims.length})
                  </h2>
                  
                  {userClaims.length > 0 ? (
                    <div className="space-y-6">
                      {userClaims.map((claim) => (
                        <Card 
                          key={claim.id} 
                          className={`${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-50'} hover:shadow-md transition-shadow`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-lg font-medium">{claim.title}</div>
                              <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm`}>
                                Reference: {claim.reference_number || `#${claim.id}`}
                              </div>
                              <div className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-sm mt-1`}>
                                Submitted: {formatDate(claim.created_at)}
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <Tag color={getStatusColor(claim.status)}>
                                {claim.status}
                              </Tag>
                              <div className="text-lg font-semibold mt-2">
                                ${parseFloat(claim.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Link
                              to={`/finance/claims/${claim.id}`}
                              className={`text-sm ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                            >
                              View claim details →
                            </Link>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <FileTextOutlined style={{ fontSize: '2rem' }} />
                      <p className="mt-2">No claims found for this user.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default FinanceUserProfile;