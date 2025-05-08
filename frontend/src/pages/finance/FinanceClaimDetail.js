import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Button, 
  Spin, 
  message, 
  Tag, 
  Breadcrumb, 
  Card,
} from 'antd';
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

const FinanceClaimDetail = () => {
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
        
        const response = await apiClient.get(`/claims/${id}/`);
        console.log('Claim data received:', response.data);
        console.log('ML prediction data:', response.data.ml_prediction);
        setClaim(response.data);
        
        // Extract userId based on the data type
        let userId = null;

        // If user is just a number (direct ID)
        if (typeof response.data.user === 'number' || typeof response.data.user === 'string') {
          userId = response.data.user;
        } 
        // If user is an object with an id property
        else if (typeof response.data.user === 'object' && response.data.user !== null) {
          userId = response.data.user.id;
        }
        
        if (userId) {
          fetchUserDetails(userId);
        }
      } catch (error) {
        message.error('Failed to load claim details');
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      fetchClaimDetails();
    }
  }, [id]);
  
  // Fetch complete user details based on user ID
  const fetchUserDetails = async (userId) => {
    if (!userId) {
      return;
    }
    
    try {
      setUserLoading(true);
      const response = await apiClient.get(`/account/users/${userId}/`);
      setUser(response.data);
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
      .replace(/([A-Z])/g, ' $1') // Insert a space before all capital letters
      .replace(/^./, str => str.toUpperCase()) // Capitalize the first letter
      .replace(/_/g, ' '); // Replace underscores with spaces
  };
  
  // Get user information from claim.user or separate user object
  const getUserInfo = () => {
    // If we have the detailed user object, use that
    if (user) {
      return {
        id: user.id,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        role: user.role || '',
        fullName: user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email
      };
    }
    
    // Otherwise use what's available in claim.user
    if (claim?.user) {
      const claimUser = claim.user;
      
      if (typeof claimUser === 'object' && claimUser !== null) {
        return {
          id: claimUser.id,
          firstName: claimUser.first_name || '',
          lastName: claimUser.last_name || '',
          email: claimUser.email || '',
          fullName: claimUser.first_name && claimUser.last_name 
            ? `${claimUser.first_name} ${claimUser.last_name}` 
            : (claimUser.email || 'Unknown User')
        };
      } else {
        // If claim.user is just an ID (number/string)
        return {
          id: claimUser,
          fullName: `User (ID: ${claimUser})`,
          email: 'User details not available'
        };
      }
    }
    
    // Fallback for no user info
    return {
      id: 'N/A',
      firstName: '',
      lastName: '',
      email: '',
      fullName: 'Unknown User'
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
                <Button type="primary" onClick={() => navigate('/finance/claims')}>Back to Claims</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get user information 
  const userInfo = getUserInfo();

  return (
    <div className={`space-y-8 max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>      
      {/* Breadcrumbs */}
      <Breadcrumb className="mb-4">
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
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          {claim.reference_number || `Claim #${claim.id}`}
        </Breadcrumb.Item>
      </Breadcrumb>
      
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-green-500 to-teal-600 px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{claim.title}</h1>
              <p className="mt-2 text-green-100">Reference: {claim.reference_number}</p>
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

      {/* User Information */}
      <div className={`mb-8 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-md rounded-xl overflow-hidden`}>
        <div className={`px-6 py-5 ${darkMode ? 'border-gray-700 bg-teal-900' : 'border-gray-200 bg-teal-100'} border-b`}>
          <div className="flex items-center">
            <UserOutlined className={`mr-2 ${darkMode ? 'text-teal-300' : 'text-teal-700'}`} />
            <h3 className={`text-lg font-medium ${darkMode ? 'text-teal-100' : 'text-teal-900'}`}>Employee Information</h3>
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
            </dl>
          )}
        </div>
      </div>

      {/* Description */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
        <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Claim Description</h3>
        </div>
        <div className="p-6">
          <p className={`whitespace-pre-line ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{claim.description}</p>
        </div>
      </div>

      {/* AI Analysis */}
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

      {/* Claim Details Sections */}
      <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mt-8 mb-6`}>Detailed Claim Information</h2>

      {/* Incident Details */}
      {renderClaimDataSection("Incident Information", [
        'AccidentType', 'AccidentDate', 'ClaimDate', 'AccidentDescription', 
        'PoliceReportFiled', 'WitnessPresent', 'WeatherConditions'
      ])}
      
      {/* Vehicle Details */}
      {renderClaimDataSection("Vehicle Details", [
        'VehicleType', 'VehicleAge', 'SpecialAssetDamage', 
        'SpecialFixes', 'SpecialLoanerVehicle'
      ])}
      
      {/* Personal Information */}
      {renderClaimDataSection("Personal Information", [
        'Gender', 'DriverAge', 'NumberOfPassengers'
      ])}
      
      {/* Injury Details */}
      {renderClaimDataSection("Injury Information", [
        'DominantInjury', 'InjuryDescription', 'InjuryPrognosis',
        'Whiplash', 'MinorPsychologicalInjury', 'SpecialAdditionalInjury'
      ])}
      
      {/* Financial Information */}
      {renderClaimDataSection("Financial Information", [
        'SpecialHealthExpenses', 'SpecialMedications', 'SpecialRehabilitation',
        'SpecialTherapy', 'SpecialEarningsLoss', 'SpecialUsageLoss',
        'SpecialTripCosts', 'SpecialJourneyExpenses', 'GeneralRest',
        'GeneralFixed', 'GeneralUplift', 'SpecialReduction', 'SpecialOverage'
      ])}
      
      {/* Other Information */}
      {renderClaimDataSection("Additional Information", [
        'ExceptionalCircumstances'
      ])}

      {/* Auto-approval Information Section - Replaces the Review Section */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
        <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700 bg-green-900' : 'border-gray-200 bg-green-50'}`}>
          <h3 className={`text-lg font-medium ${darkMode ? 'text-green-100' : 'text-green-800'}`}>Automatic Approval Information</h3>
        </div>
        <div className="p-6">
          <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            All claims are now automatically approved upon submission. This claim has been processed by our AI system and approved.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card
              title="Settlement Information"
              className={darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}
              headStyle={darkMode ? { backgroundColor: '#374151', color: 'white' } : {}}
              bodyStyle={darkMode ? { backgroundColor: '#374151' } : {}}
            >
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>AI-Determined Settlement Amount:</p>
              <p className={`text-xl font-bold mb-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {(() => {
                  // First check decided settlement amount which is now set automatically
                  if (claim.decided_settlement_amount) {
                    return `$${parseFloat(claim.decided_settlement_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                  
                  // Check direct settlement amount field from serializer
                  if (claim.ml_settlement_amount) {
                    return `$${parseFloat(claim.ml_settlement_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                  
                  if (!claim.ml_prediction) {
                    return 'Not available (prediction missing)';
                  }
                  
                  // Try multiple potential paths to get the settlement amount
                  if (typeof claim.ml_prediction.settlement_amount !== 'undefined' && claim.ml_prediction.settlement_amount !== null) {
                    return `$${parseFloat(claim.ml_prediction.settlement_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                  
                  // Fallback to the claimed amount if no prediction is available
                  if (claim.amount && parseFloat(claim.amount) > 0) {
                    return `$${parseFloat(claim.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  }
                  
                  return 'Not available (no settlement data)';
                })()}
              </p>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Claimed Amount:</p>
              <p className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ${parseFloat(claim.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </Card>
            
            <Card
              title="Approval Status"
              className={darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'}
              headStyle={darkMode ? { backgroundColor: '#374151', color: 'white' } : {}}
              bodyStyle={darkMode ? { backgroundColor: '#374151' } : {}}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <div className="p-4 bg-green-100 dark:bg-green-900 rounded-full mb-4">
                  <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />
                </div>
                <p className={`text-xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Automatically Approved
                </p>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {claim.reviewed_at ? 
                    `Processed on ${formatDate(claim.reviewed_at)}` : 
                    'Processed upon submission'}
                </p>
              </div>
            </Card>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-800'}`}>
            <div className="flex items-start">
              <ExclamationCircleOutlined className="text-blue-400 mr-2 mt-1" />
              <div>
                <p className="font-medium">Automatic Claims Processing</p>
                <p className="mt-1 text-sm">
                  Our system now automatically approves all claims and creates corresponding billing records.
                  Settlement amounts are determined by our AI system based on the claim data and historical patterns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between mt-8">
        <Button 
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/finance/claims')}
          size="large"
          className={darkMode ? 'ant-btn-primary-dark' : ''}
        >
          Back to Claims List
        </Button>
      </div>
    </div>
  );
};

export default FinanceClaimDetail;