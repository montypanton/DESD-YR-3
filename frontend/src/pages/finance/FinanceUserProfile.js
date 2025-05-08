import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, Spin, message, Tabs, Descriptions, Tag, Card, Timeline, Button, Table } from 'antd';
import { 
  UserOutlined, 
  HomeOutlined, 
  ArrowLeftOutlined,
  MailOutlined,
  PhoneOutlined,
  BankOutlined,
  IdcardOutlined,
  FileTextOutlined,
  FilePdfOutlined,
  DollarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { apiClient } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';
import { getUnbilledRecords, createInvoice } from '../../services/financeService';

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
  const [mlRecords, setMlRecords] = useState([]);
  const [mlRecordsLoading, setMlRecordsLoading] = useState(true);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/account/users/${id}/`);
        setUser(response.data);
        fetchUserClaims(response.data.id);
        fetchUserMlRecords(response.data.id);
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
    
    const fetchUserMlRecords = async (userId) => {
      try {
        setMlRecordsLoading(true);
        // Get unbilled ML usage records for this user
        const response = await getUnbilledRecords({ user: userId });
        
        // Enhance records with ML model name and claim reference
        const enhancedRecords = await Promise.all((response.data.results || response.data || []).map(async (record) => {
          // If the record has a claim_id but no claim_reference, try to get the reference
          if (record.claim_id && !record.claim_reference) {
            try {
              const claimResponse = await apiClient.get(`/claims/${record.claim_id}/`);
              record.claim_reference = claimResponse.data.reference_number || `#${record.claim_id}`;
            } catch (error) {
              console.error(`Error fetching claim reference for claim ${record.claim_id}:`, error);
              record.claim_reference = `#${record.claim_id}`;
            }
          }
          
          // Add ML model name if available
          if (record.ml_model_id && !record.ml_model_name) {
            try {
              const mlModelResponse = await apiClient.get(`/ml/models/${record.ml_model_id}/`);
              record.ml_model_name = mlModelResponse.data.name || 'Unknown Model';
            } catch (error) {
              console.error(`Error fetching ML model name for model ${record.ml_model_id}:`, error);
              record.ml_model_name = 'Unknown Model';
            }
          }
          
          return record;
        }));
        
        setMlRecords(enhancedRecords);
      } catch (error) {
        console.error('Error fetching ML usage records:', error);
        message.warning('Could not load ML usage billing data');
      } finally {
        setMlRecordsLoading(false);
      }
    };

    if (id) {
      fetchUserDetails();
    }
  }, [id]);
  
  const handleGenerateInvoice = async () => {
    if (mlRecords.length === 0) {
      message.warning('No unbilled ML usage records to generate an invoice');
      return;
    }
    
    try {
      setGeneratingInvoice(true);
      
      const recordIds = mlRecords.map(record => record.id);
      
      // Create invoice data
      const invoiceData = {
        title: `ML Usage Invoice for ${user.first_name} ${user.last_name}`,
        billing_record_ids: recordIds,
        notes: `Automated invoice generated for ML usage by ${user.first_name} ${user.last_name} (${user.email})`,
        user_id: user.id
      };
      
      // Create the invoice
      const response = await createInvoice(invoiceData);
      
      message.success('ML usage invoice generated successfully');
      
      // Navigate to the invoice detail page
      navigate(`/finance/invoices/${response.data.id}`);
    } catch (error) {
      console.error('Error generating invoice:', error);
      message.error('Failed to generate ML usage invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

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
          
          <TabPane 
            tab={
              <span>
                <DollarOutlined />
                ML Usage Billing
              </span>
            } 
            key="ml-billing"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  ML Usage Billing
                </h2>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  onClick={() => handleGenerateInvoice()}
                  loading={generatingInvoice}
                >
                  Generate ML Usage Invoice
                </Button>
              </div>
              
              {mlRecordsLoading ? (
                <div className="flex justify-center py-8">
                  <Spin />
                  <span className="ml-3">Loading ML usage data...</span>
                </div>
              ) : (
                <>
                  {mlRecords.length > 0 ? (
                    <div>
                      <div className={`mb-4 p-4 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-50 text-blue-800'}`}>
                        <div className="flex items-center">
                          <InfoCircleOutlined className="mr-2" />
                          <span>Showing unbilled ML model usage records for this user.</span>
                        </div>
                      </div>
                      
                      <Table
                        dataSource={mlRecords}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                        className={darkMode ? 'ant-table-dark' : ''}
                        columns={[
                          {
                            title: 'Claim Reference',
                            dataIndex: 'claim_reference',
                            key: 'claim_reference',
                            render: (text, record) => (
                              <Link to={`/finance/claims/${record.claim_id}`}>
                                {text || `#${record.claim_id}`}
                              </Link>
                            ),
                          },
                          {
                            title: 'ML Model',
                            dataIndex: 'ml_model_name',
                            key: 'ml_model_name',
                          },
                          {
                            title: 'Date',
                            dataIndex: 'created_at',
                            key: 'created_at',
                            render: (text) => formatDate(text),
                            sorter: (a, b) => new Date(b.created_at) - new Date(a.created_at),
                            defaultSortOrder: 'descend',
                          },
                          {
                            title: 'Rate',
                            dataIndex: 'rate',
                            key: 'rate',
                            render: (text) => `$${parseFloat(text).toFixed(2)}`,
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <DollarOutlined style={{ fontSize: '2rem' }} />
                      <p className="mt-2">No unbilled ML usage records found for this user.</p>
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