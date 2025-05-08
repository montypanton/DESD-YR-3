import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/authService';
import { 
  Card, Button, Table, Input, Space, message, Tag, Typography, 
  Row, Col, Statistic, Spin, Empty, Tooltip 
} from 'antd';
import { 
  SearchOutlined, DownloadOutlined, CalendarOutlined, 
  FileTextOutlined, PoundOutlined
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { downloadInvoicePdf } from '../../services/financeService';
import { useTheme } from '../../context/ThemeContext';
import moment from 'moment';

const { Title, Text } = Typography;

const MLUsageInvoices = () => {
  const [loading, setLoading] = useState(true);
  const [mlUsageClaims, setMlUsageClaims] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { darkMode } = useTheme();

  useEffect(() => {
    fetchUserMlUsageClaims();
  }, []);

  const fetchUserMlUsageClaims = async () => {
    try {
      setLoading(true);
      // Fetch all claims with ML predictions made by the current user
      const response = await apiClient.get('/claims/');
      
      // Extract claims from response
      const claimsData = response.data.results || response.data || [];
      
      // Filter to only include claims that have used the ML model (have ml_prediction)
      const mlClaims = claimsData.filter(claim => claim.ml_prediction !== null);
      
      // Sort claims by date descending (newest first)
      const sortedClaims = [...mlClaims].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      // Add billing information to each claim
      const claimsWithBilling = await Promise.all(
        sortedClaims.map(async (claim) => {
          try {
            // Get billing rate information for this claim
            const userCompanyResponse = await apiClient.get(`/finance/user-company-rate/?claim_id=${claim.id}`);
            const billingData = userCompanyResponse.data || { rate_per_claim: 0 };
            
            return {
              ...claim,
              billing_rate: billingData.rate_per_claim || 0,
              company_name: billingData.company_name || 'Unknown',
            };
          } catch (err) {
            console.error(`Error fetching billing rate for claim ${claim.id}:`, err);
            return {
              ...claim,
              billing_rate: 0,
              company_name: 'Unknown',
            };
          }
        })
      );
      
      setMlUsageClaims(claimsWithBilling);
      
      // Calculate total billing amount
      const total = claimsWithBilling.reduce(
        (sum, claim) => sum + parseFloat(claim.billing_rate || 0), 
        0
      );
      setTotalAmount(total);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching ML usage claims:', err);
      setError('Failed to load ML usage data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleDownloadInvoice = async (claim) => {
    try {
      message.loading({ content: 'Generating invoice...', key: 'invoiceDownload' });
      
      // Get claim's invoice if it exists
      const invoiceResponse = await apiClient.get(`/finance/claim-invoice/${claim.id}/`);
      
      if (invoiceResponse.data && invoiceResponse.data.invoice_id) {
        // If invoice exists, download it
        const invoiceId = invoiceResponse.data.invoice_id;
        const response = await downloadInvoicePdf(invoiceId);
        
        // Create a blob from the PDF data
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        // Create a link and trigger download
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice_${claim.reference_number}.pdf`);
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        link.remove();
        
        message.success({ content: 'Invoice downloaded successfully', key: 'invoiceDownload' });
      } else {
        // If no invoice exists yet
        message.info({ 
          content: 'No invoice available for this claim yet', 
          key: 'invoiceDownload' 
        });
      }
    } catch (err) {
      console.error('Error downloading invoice:', err);
      message.error({ 
        content: 'Failed to download invoice. Please try again later.', 
        key: 'invoiceDownload' 
      });
    }
  };

  // Filter claims based on search query
  const filteredClaims = mlUsageClaims.filter(claim => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        claim.reference_number.toLowerCase().includes(query) ||
        claim.title.toLowerCase().includes(query) ||
        claim.company_name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const columns = [
    {
      title: 'Claim ID',
      dataIndex: 'reference_number',
      key: 'reference_number',
      render: (text, record) => (
        <Link to={`/claims/${record.id}`} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400">
          {text}
        </Link>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text) => moment(text).format('DD/MM/YYYY'),
      sorter: (a, b) => moment(a.created_at).unix() - moment(b.created_at).unix(),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Insurance Company',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'ML Model Usage Cost',
      dataIndex: 'billing_rate',
      key: 'billing_rate',
      render: (text) => {
        return `£${parseFloat(text).toFixed(2)}`;
      },
      sorter: (a, b) => parseFloat(a.billing_rate) - parseFloat(b.billing_rate),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'APPROVED') color = 'green';
        if (status === 'REJECTED') color = 'red';
        if (status === 'COMPLETED') color = 'blue';
        if (status === 'PENDING') color = 'gold';
        
        return <Tag color={color}>{status}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Download Invoice">
            <Button 
              type="primary" 
              icon={<DownloadOutlined />} 
              onClick={() => handleDownloadInvoice(record)}
              size="small"
            />
          </Tooltip>
          <Link to={`/claims/${record.id}`}>
            <Button size="small">View Details</Button>
          </Link>
        </Space>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <Title level={2} className={darkMode ? 'text-white' : 'text-gray-800'}>
        ML Usage Invoices
      </Title>
      
      <Text className={`block mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        This page shows all your claims that have used the ML model and their associated costs.
      </Text>
      
      {error && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} md={8}>
          <Card className={darkMode ? 'bg-gray-800 text-white' : ''}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : ''}>Total ML Usage Cost</span>}
              value={totalAmount}
              precision={2}
              prefix={<PoundOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={darkMode ? 'bg-gray-800 text-white' : ''}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : ''}>Total Predictions</span>}
              value={mlUsageClaims.length}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className={darkMode ? 'bg-gray-800 text-white' : ''}>
            <Statistic
              title={<span className={darkMode ? 'text-gray-300' : ''}>Last Prediction</span>}
              value={mlUsageClaims.length > 0 ? moment(mlUsageClaims[0].created_at).format('DD/MM/YYYY') : 'N/A'}
              prefix={<CalendarOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>
      
      <div className="flex justify-between items-center mb-4">
        <Input
          placeholder="Search claims..."
          prefix={<SearchOutlined />}
          value={searchQuery}
          onChange={handleSearch}
          style={{ width: 300 }}
          className="mb-4 sm:mb-0"
        />
      </div>
      
      <Card className={darkMode ? 'bg-gray-800' : ''}>
        {loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
            <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading ML usage data...
            </p>
          </div>
        ) : mlUsageClaims.length > 0 ? (
          <Table
            columns={columns}
            dataSource={filteredClaims.map(claim => ({ ...claim, key: claim.id }))}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 'max-content' }}
            className={darkMode ? 'ant-table-dark' : ''}
          />
        ) : (
          <Empty
            description={
              <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                No ML model usage found
              </span>
            }
          />
        )}
      </Card>
    </div>
  );
};

export default MLUsageInvoices;