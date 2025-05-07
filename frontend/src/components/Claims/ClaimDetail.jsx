import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Spin, message, Tag, Breadcrumb, Input, Alert } from 'antd';
import { 
  ArrowLeftOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined,
  HomeOutlined,
  FileTextOutlined,
  FileDoneOutlined
} from '@ant-design/icons';
import { getClaimById } from '../../services/claimService';
import { apiClient } from '../../services/authService';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const ClaimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const { darkMode } = useTheme();
  const { user } = useAuth();
  // These states are no longer needed for end users
  // const [decidedAmount, setDecidedAmount] = useState('');
  // const [savingDecidedAmount, setSavingDecidedAmount] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClaimDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getClaimById(id);
        if (response && response.data) {
          setClaim(response.data);
          // No longer need to set decidedAmount as end users can't edit it
          // setDecidedAmount(
          //   response.data.decided_settlement_amount !== null && response.data.decided_settlement_amount !== undefined
          //     ? response.data.decided_settlement_amount
          //     : response.data.ml_prediction?.settlement_amount || ''
          // );
        }
      } catch (error) {
        console.error('Error fetching claim details:', error);
        setError('Failed to load claim details. Please try again later.');
        message.error('Failed to load claim details');
      } finally {
        setLoading(false);
      }
    };
  
    if (id) {
      fetchClaimDetails();
    }
  }, [id]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', { 
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
      case 'COMPLETED':
        return <FileDoneOutlined style={{ color: '#1890ff' }} />;
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
      case 'COMPLETED': return 'cyan';
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

  // This function is no longer needed as end users can't edit the settlement amount
  // const saveDecidedAmount = async () => {
  //   try {
  //     if (!decidedAmount || isNaN(parseFloat(decidedAmount))) {
  //       message.error('Please enter a valid settlement amount');
  //       return;
  //     }
  //     
  //     setSavingDecidedAmount(true);
  //     const updatedAmount = parseFloat(decidedAmount);
  //     
  //     await apiClient.put(`/claims/${id}/settlement/`, { settlement_amount: updatedAmount });
  //     
  //     // Update local state to reflect the change
  //     setClaim(prevClaim => ({
  //       ...prevClaim,
  //       decided_settlement_amount: updatedAmount
  //     }));
  //     
  //     message.success('Settlement amount updated successfully');
  //   } catch (error) {
  //     console.error('Error saving settlement amount:', error);
  //     message.error('Failed to save settlement amount');
  //   } finally {
  //     setSavingDecidedAmount(false);
  //   }
  // };

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

  if (error) {
    return (
      <div className={`max-w-6xl mx-auto py-10 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Alert
          message="Error Loading Claim"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
        <Button type="primary" onClick={() => navigate('/claims')}>
          Back to Claims
        </Button>
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
                <Button type="primary" onClick={() => navigate('/claims')}>Back to Claims</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          <Link to="/claims" className={darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}>
            <FileTextOutlined /> Claims History
          </Link>
        </Breadcrumb.Item>
        <Breadcrumb.Item className={darkMode ? 'text-gray-100' : 'text-gray-800'}>
          {claim.reference_number || `Claim #${claim.id}`}
        </Breadcrumb.Item>
      </Breadcrumb>
      
      {/* Header */}
      <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{claim.title}</h1>
              <p className="mt-2 text-blue-100">Reference: {claim.reference_number}</p>
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
              {claim.amount ? `£${parseFloat(claim.amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
            </p>
          </div>
          
          <div className="p-4 sm:px-6 lg:px-8">
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Updated</p>
            <p className={`mt-1 text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(claim.updated_at)}</p>
          </div>
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

      {/* Claim Status & Decision */}
      {claim.status && (claim.status === 'APPROVED' || claim.status === 'REJECTED') && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
          <div className={`px-6 py-5 border-b ${
            claim.status === 'APPROVED' 
              ? (darkMode ? 'border-gray-700 bg-green-900' : 'border-gray-200 bg-green-50')
              : (darkMode ? 'border-gray-700 bg-red-900' : 'border-gray-200 bg-red-50')
          }`}>
            <h3 className={`text-lg font-medium ${
              claim.status === 'APPROVED'
                ? (darkMode ? 'text-green-100' : 'text-green-800')
                : (darkMode ? 'text-red-100' : 'text-red-800')
            }`}>
              Claim {claim.status === 'APPROVED' ? 'Approved' : 'Rejected'}
            </h3>
          </div>
          <div className="p-6">
            {claim.status === 'APPROVED' ? (
              <div>
                <Alert
                  message="Your claim has been approved!"
                  description={`Your claim has been reviewed by our finance team and approved with a settlement amount of £${
                    parseFloat(claim.decided_settlement_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  }. You will receive further instructions about the payment process via email.`}
                  type="success"
                  showIcon
                  className="mb-4"
                />
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} border-2 border-green-500`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Final Settlement Amount</p>
                  <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    £{parseFloat(claim.decided_settlement_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  {claim.reviewed_at && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Decision made on {formatDate(claim.reviewed_at)}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <Alert
                  message="Your claim has been rejected"
                  description="Your claim has been reviewed by our finance team and was not approved at this time. Please review the details below or contact customer support for further assistance."
                  type="error"
                  showIcon
                  className="mb-4"
                />
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Claim Rejected</p>
                  {claim.reviewed_at && (
                    <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Decision made on {formatDate(claim.reviewed_at)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {claim.ml_prediction && (
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}>
          <div className={`px-6 py-5 border-b ${darkMode ? 'border-gray-700 bg-indigo-900' : 'border-gray-200 bg-indigo-50'}`}>
            <h3 className={`text-lg font-medium ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}`}>AI Analysis Results</h3>
          </div>
          <div className="p-6">
            <p className={`mb-4 ${darkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>Our AI system has analyzed your claim and determined the following:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>AI Settlement Recommendation</p>
                <p className={`text-2xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  £{parseFloat(claim.ml_prediction.settlement_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            
            {/* Display information about settlement process - Only show for claims not in final state */}
            {claim.status !== 'APPROVED' && claim.status !== 'REJECTED' && (
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-4`}>
                <Alert
                  message="Your claim is currently under review"
                  description="The AI-predicted settlement amount shown above is an estimate. The final settlement amount will be determined by our finance team during the approval process."
                  type="info"
                  showIcon
                  className="mt-1"
                />
              </div>
            )}
            
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

      {/* Actions */}
      <div className="flex justify-between mt-8">
        <Button 
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/claims')}
          size="large"
          className={darkMode ? 'ant-btn-primary-dark' : ''}
        >
          Back to Claims History
        </Button>
      </div>
    </div>
  );
};

export default ClaimDetail;