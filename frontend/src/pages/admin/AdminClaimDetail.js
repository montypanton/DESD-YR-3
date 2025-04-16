import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Spin, message, Tag, Breadcrumb, Input, Select } from 'antd';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined,
  HomeOutlined,
  FileTextOutlined,
  UserOutlined
} from '@ant-design/icons';
import { apiClient } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';

const { TextArea } = Input;
const { Option } = Select;

const AdminClaimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    const fetchClaimDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching claim details for ID:', id);
        
        const response = await apiClient.get(`/claims/${id}/`);
        console.log('Claim API response:', response.data);
        
        setClaim(response.data);
        
        // Check the user data - could be a number (ID) or an object
        console.log('User data from claim:', response.data.user);
        console.log('User data type:', typeof response.data.user);
        
        // Extract userId based on the data type
        let userId = null;

        // If user is just a number (direct ID)
        if (typeof response.data.user === 'number' || typeof response.data.user === 'string') {
          userId = response.data.user;
          console.log('User ID is directly stored as:', userId);
        } 
        // If user is an object with an id property
        else if (typeof response.data.user === 'object' && response.data.user !== null) {
          userId = response.data.user.id;
          console.log('Extracted userId from object:', userId);
        } 
        else {
          console.log('Unexpected user data format:', response.data.user);
        }
        
        if (userId) {
          console.log('Will fetch user details for userId:', userId);
          fetchUserDetails(userId);
        } else {
          console.log('No valid userId found to fetch user details');
        }
      } catch (error) {
        console.error('Error fetching claim details:', error);
        message.error('Failed to load claim details');
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      fetchClaimDetails();
    }
  }, [id]);
  
  const fetchUserDetails = async (userId) => {
    if (!userId) {
      console.log('fetchUserDetails: No userId provided');
      return;
    }
    
    try {
      console.log('Starting user details fetch for ID:', userId);
      setUserLoading(true);
      
      const response = await apiClient.get(`/account/users/${userId}/`);
      console.log('User API response:', response.data);
      
      setUser(response.data);
      console.log('User state updated with:', response.data);
    } catch (error) {
      console.error('Error fetching user details:', error);
      console.log('Error response:', error.response?.data);
      console.log('Error status:', error.response?.status);
    } finally {
      setUserLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'REJECTED':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'PROCESSING':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      case 'PENDING':
      default:
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'PROCESSING': return 'blue';
      case 'PENDING':
      default: return 'gold';
    }
  };

  const formatClaimField = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ');
  };

  const getUserInfo = () => {
    console.log('getUserInfo called with claim:', claim?.id);
    console.log('Current user state:', user);
    console.log('Current claim.user:', claim?.user);
    
    if (user) {
      console.log('Using detailed user object');
      return {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        role: user.role || '',
        isActive: user.is_active,
        fullName: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email
      };
    }
    
    if (claim?.user) {
      console.log('Using claim.user data');
      const claimUser = claim.user;
      
      console.log('claimUser type:', typeof claimUser);
      if (typeof claimUser === 'object') {
        console.log('claimUser keys:', Object.keys(claimUser));
      }
      
      return {
        id: typeof claimUser === 'object' ? claimUser.id : claimUser,
        firstName: claimUser.first_name || '',
        lastName: claimUser.last_name || '',
        email: claimUser.email || '',
        fullName: claimUser.first_name && claimUser.last_name 
          ? `${claimUser.first_name} ${claimUser.last_name}` 
          : (claimUser.email || 'Unknown User')
      };
    }
    
    console.log('No user data available, using fallback');
    return {
      id: 'N/A',
      firstName: '',
      lastName: '',
      email: '',
      fullName: 'Unknown User',
      role: '',
      isActive: false
    };
  };

  const renderClaimDataSection = (sectionTitle, fields) => {
    if (!claim?.claim_data) return null;
    
    const sectionData = Object.entries(claim.claim_data)
      .filter(([key]) => fields.includes(key))
      .filter(([_, value]) => value !== null && value !== undefined && value !== "");
    
    if (sectionData.length === 0) return null;

    return (
      <div className={`mb-8 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-md rounded-xl overflow-hidden`}>
        <div className={`px-6 py-5 ${darkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}>
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{sectionTitle}</h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            {sectionData.map(([key, value]) => (
              <div key={key} className="sm:col-span-1">
                <dt className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatClaimField(key)}</dt>
                <dd className={`mt-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center justify-center h-64">
          <Spin size="large" />
          <p className={`mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading claim details...</p>
        </div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`${darkMode ? 'bg-red-900 border-red-800' : 'bg-red-50 border-red-500'} border-l-4 p-4 rounded-md`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <CloseCircleOutlined className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-red-200' : 'text-red-800'}`}>Claim not found</h3>
              <p className={`mt-2 text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                We couldn't find the claim you're looking for. It may have been removed or you might not have access to it.
              </p>
              <div className="mt-4">
                <Button type="primary" onClick={() => navigate('/admin/claims')}>Back to Claims</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  console.log('Before getUserInfo - claim.user:', claim.user);
  console.log('Before getUserInfo - user state:', user);
  
  const userInfo = getUserInfo();
  console.log('Generated userInfo:', userInfo);

  return (
    <div className={`space-y-8 max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Breadcrumb className="mb-4">
        <Breadcrumb.Item>
          <Link to="/" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <HomeOutlined /> Home
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <Link to="/admin/claims" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <FileTextOutlined /> Claims
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          {claim.reference_number || `Claim #${claim.id}`}
        </Breadcrumb.Item>
      </Breadcrumb>
      
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{claim.title}</h1>
              <p className="mt-2 text-purple-100">Reference: {claim.reference_number}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Tag 
                icon={getStatusIcon(claim.status)} 
                color={getStatusColor(claim.status)}
                className="text-sm px-3 py-1"
              >
                {claim.status}
              </Tag>
            </div>
          </div>
        </div>
        
        <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          <div className="p-4 sm:px-6 lg:px-8">
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Submitted On</p>
            <p className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(claim.created_at)}</p>
          </div>
          
          <div className="p-4 sm:px-6 lg:px-8">
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Claimed Amount</p>
            <p className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              ${parseFloat(claim.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="p-4 sm:px-6 lg:px-8">
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Updated</p>
            <p className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(claim.updated_at)}</p>
          </div>
        </div>
      </div>

      <div className={`mb-8 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-md rounded-xl overflow-hidden`}>
        <div className={`px-6 py-5 ${darkMode ? 'border-gray-700 bg-purple-900' : 'border-gray-200 bg-purple-100'} border-b`}>
          <div className="flex items-center">
            <UserOutlined className={`mr-2 ${darkMode ? 'text-purple-300' : 'text-purple-700'}`} />
            <h3 className={`text-lg font-medium ${darkMode ? 'text-purple-100' : 'text-purple-900'}`}>User Information</h3>
          </div>
        </div>
        <div className="p-6">
          {userLoading ? (
            <div className="flex justify-center py-4">
              <Spin size="small" />
              <span className="ml-2 text-gray-400">Loading user details...</span>
            </div>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
              <div className="sm:col-span-1">
                <dt className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Full Name</dt>
                <dd className={`mt-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {userInfo.fullName}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</dt>
                <dd className={`mt-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {userInfo.email || 'Not available'}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>User ID</dt>
                <dd className={`mt-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {userInfo.id}
                </dd>
              </div>
              {userInfo.role && (
                <div className="sm:col-span-1">
                  <dt className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Role</dt>
                  <dd className={`mt-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {userInfo.role}
                  </dd>
                </div>
              )}
              {userInfo.isActive !== undefined && (
                <div className="sm:col-span-1">
                  <dt className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</dt>
                  <dd className={`mt-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Tag color={userInfo.isActive ? 'green' : 'red'}>
                      {userInfo.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {userInfo.id !== 'N/A' && typeof userInfo.id !== 'undefined' && userInfo.id !== null && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link 
                to={`/admin/users/${userInfo.id}`}
                className={`inline-flex items-center text-sm ${darkMode ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-800'}`}
              >
                <UserOutlined className="mr-1" />
                View Complete User Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
        <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Claim Description</h3>
        </div>
        <div className="p-6">
          <p className={`whitespace-pre-line ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{claim.description}</p>
        </div>
      </div>

      {claim.ml_prediction && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
          <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700 bg-indigo-900' : 'border-gray-200 bg-indigo-50'}`}>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>AI Analysis Results</h3>
          </div>
          <div className="p-6">
            <p className={`mb-4 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Our AI system has analyzed this claim and determined the following:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Settlement Recommendation</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  ${parseFloat(claim.ml_prediction.settlement_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              {claim.ml_prediction.confidence_score && (
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Confidence Score</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                    {(claim.ml_prediction.confidence_score * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
            
            {claim.ml_prediction.processing_notes && (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Processing Notes</p>
                <p className={`mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{claim.ml_prediction.processing_notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mt-8 mb-6`}>Detailed Claim Information</h2>

      {renderClaimDataSection("Incident Information", [
        'AccidentType', 'AccidentDate', 'ClaimDate', 'AccidentDescription', 
        'PoliceReportFiled', 'WitnessPresent', 'WeatherConditions'
      ])}
      
      {renderClaimDataSection("Vehicle Details", [
        'VehicleType', 'VehicleAge', 'SpecialAssetDamage', 
        'SpecialFixes', 'SpecialLoanerVehicle'
      ])}
      
      {renderClaimDataSection("Personal Information", [
        'Gender', 'DriverAge', 'NumberOfPassengers'
      ])}
      
      {renderClaimDataSection("Injury Information", [
        'DominantInjury', 'InjuryDescription', 'InjuryPrognosis',
        'Whiplash', 'MinorPsychologicalInjury', 'SpecialAdditionalInjury'
      ])}
      
      {renderClaimDataSection("Financial Information", [
        'SpecialHealthExpenses', 'SpecialMedications', 'SpecialRehabilitation',
        'SpecialTherapy', 'SpecialEarningsLoss', 'SpecialUsageLoss',
        'SpecialTripCosts', 'SpecialJourneyExpenses', 'GeneralRest',
        'GeneralFixed', 'GeneralUplift', 'SpecialReduction', 'SpecialOverage'
      ])}
      
      {renderClaimDataSection("Additional Information", [
        'ExceptionalCircumstances'
      ])}

      <div className="flex justify-between mt-8">
        <Button 
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/claims')}
          size="large"
          className={darkMode ? 'ant-btn-primary-dark' : ''}
        >
          Back to Claims List
        </Button>

        {userInfo.id !== 'N/A' && (
          <Link to={`/admin/users/${userInfo.id}`}>
            <Button 
              type="default"
              icon={<UserOutlined />}
              size="large"
            >
              View User Profile
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default AdminClaimDetail;