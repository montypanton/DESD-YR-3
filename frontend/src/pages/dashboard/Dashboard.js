import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/authService';
import { Card, Spin, Statistic, Row, Col, Button, Divider, Tag } from 'antd';
import { 
  FileAddOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PieChartOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';

// Utility function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

// Component for Recent Claims
const RecentClaimsList = ({ claims, loading }) => {
  const { darkMode } = useTheme();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spin size="large" />
      </div>
    );
  }

  if (!claims || claims.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 dark:text-gray-400">No claims submitted yet.</p>
        <Link to="/submit-claim" className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center">
          Submit your first claim
          <svg className="w-4 h-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {claims.map((claim) => (
        <div key={claim.id} className={`p-4 rounded-lg shadow-sm border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex justify-between">
            <div>
              <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {claim.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ref: {claim.reference_number}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date(claim.created_at).toLocaleDateString('en-GB', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div>
              <Tag className={`px-2 py-1 text-xs rounded-full ${
                claim.status === 'APPROVED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                claim.status === 'REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                claim.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              }`}>
                {claim.status}
              </Tag>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Settlement: </span>
              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {claim.decided_settlement_amount !== null && claim.decided_settlement_amount !== undefined ? (
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(claim.decided_settlement_amount)}</span>
                ) : claim.ml_prediction?.settlement_amount ? (
                  formatCurrency(claim.ml_prediction.settlement_amount)
                ) : (
                  'Pending'
                )}
              </span>
            </div>
            <Link 
              to={`/claims/${claim.id}`} 
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
      
      <div className="text-center pt-2">
        <Link 
          to="/predictions" 
          className="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline"
        >
          View All Claims
        </Link>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [dashboardData, setDashboardData] = useState({
    total_claims: 0,
    approved_claims: 0,
    rejected_claims: 0,
    pending_claims: 0,
    total_claimed: 0,
    approved_settlements: 0,
    recent_claims: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Try the consolidated endpoint first (which uses consistent field names)
        try {
          const dashboardResponse = await apiClient.get('/api/claims/dashboard/');
          if (dashboardResponse.data) {
            console.log('Dashboard data from consolidated endpoint:', dashboardResponse.data);
            setDashboardData(dashboardResponse.data);
            setError(null);
            return;
          }
        } catch (consolidated_err) {
          console.warn('Could not fetch from consolidated endpoint, trying fallback', consolidated_err);
        }
        
        // Fallback to the original endpoint
        const dashboardResponse = await apiClient.get('/claims/dashboard/');
        console.log('Dashboard data from original endpoint:', dashboardResponse.data);
        setDashboardData(dashboardResponse.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className={`space-y-8 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Error message */}
      {error && (
        <div className={`p-4 rounded-md border-l-4 ${darkMode ? 'bg-red-900 text-red-200 border-red-500' : 'bg-red-50 text-red-700 border-red-500'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleOutlined className="h-5 w-5 text-red-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <Card 
        className={`rounded-xl shadow-md overflow-hidden transition-colors duration-200 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
      >
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 -m-6 p-6 mb-6">
          <h1 className="text-2xl font-bold text-white">
            Welcome, {user?.first_name || 'User'}!
          </h1>
          <p className="mt-2 text-blue-100 text-lg">
            Insurance Claims Dashboard
          </p>
        </div>
        <div className="pt-2">
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Here's a summary of your claims activity. Submit new claims or check the status of existing ones.
          </p>
          <div className="mt-4 flex space-x-4">
            <Button 
              type="primary" 
              icon={<FileAddOutlined />} 
              size="large"
              className={darkMode ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600' : ''}
            >
              <Link to="/submit-claim">Submit New Claim</Link>
            </Button>
            <Button 
              icon={<FileTextOutlined />} 
              size="large"
            >
              <Link to="/predictions">View All Claims</Link>
            </Button>
          </div>
        </div>
      </Card>

      {/* Claims Statistics */}
      <Card 
        className={`rounded-xl shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
        title={
          <div className={`text-lg font-medium flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <PieChartOutlined className="mr-2" /> Claims Statistics
          </div>
        }
        loading={loading}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Total Claims</span>}
              value={dashboardData.total_claims}
              valueStyle={{ color: darkMode ? '#a5b4fc' : '#4f46e5' }}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Completed Claims</span>}
              value={dashboardData.approved_claims || dashboardData.recent_claims.filter(claim => claim.status === 'APPROVED').length}
              valueStyle={{ color: darkMode ? '#93c5fd' : '#3b82f6' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Pending Claims</span>}
              value={dashboardData.pending_claims || 0}
              valueStyle={{ color: darkMode ? '#fcd34d' : '#f59e0b' }}
              prefix={<ClockCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Total Settlements</span>}
              value={formatCurrency(dashboardData.approved_settlements || dashboardData.total_settlements || 0)}
              valueStyle={{ color: darkMode ? '#86efac' : '#10b981' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Recent Claims */}
      <Card 
        className={`rounded-xl shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
        title={
          <div className={`text-lg font-medium flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            <FileTextOutlined className="mr-2" /> Recent Claims
          </div>
        }
      >
        <RecentClaimsList claims={dashboardData.recent_claims} loading={loading} />
      </Card>

      {/* How to Submit a Claim */}
      <Card 
        className={`rounded-xl shadow-md ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}
        title={
          <div className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            How to Submit a Claim
          </div>
        }
      >
        <div className="space-y-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${darkMode ? 'bg-indigo-900 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <span className="text-lg font-bold">1</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Start a New Claim</h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Click the "Submit New Claim" button to begin the claims process. You'll need to provide details about the incident.
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${darkMode ? 'bg-indigo-900 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <span className="text-lg font-bold">2</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Describe the Incident</h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Provide a clear and detailed description of what happened. Include when, where, and how the incident occurred, along with any relevant details.
              </p>
            </div>
          </div>
          
          <div className="flex">
            <div className="flex-shrink-0">
              <div className={`flex items-center justify-center h-10 w-10 rounded-full ${darkMode ? 'bg-indigo-900 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                <span className="text-lg font-bold">3</span>
              </div>
            </div>
            <div className="ml-4">
              <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Wait for Assessment</h3>
              <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                Our AI system will analyze your claim and provide an initial settlement recommendation. You can then review and adjust if needed.
              </p>
            </div>
          </div>
        </div>
        <Divider className={darkMode ? 'border-gray-700' : 'border-gray-200'} />
        <div className="text-center">
          <Link to="/submit-claim">
            <Button 
              type="primary" 
              size="large"
              icon={<FileAddOutlined />}
              className={darkMode ? 'bg-indigo-600 hover:bg-indigo-700 border-indigo-600' : ''}
            >
              Submit a Claim Now
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;