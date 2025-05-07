import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Card, Space, Typography, Alert, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getClaims } from '../../services/claimService';
import { useTheme } from '../../context/ThemeContext';

const { Title } = Typography;

const ClaimsList = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { darkMode } = useTheme();

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getClaims();
        setClaims(response.data);
      } catch (error) {
        console.error('Error fetching claims:', error);
        setError('Failed to load claims. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchClaims();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'PROCESSING': return 'blue';
      case 'COMPLETED': return 'cyan';
      case 'PENDING':
      default: return 'orange';
    }
  };

  const columns = [
    {
      title: 'Reference',
      dataIndex: 'reference_number',
      key: 'reference_number',
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Claimed Amount',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount) => amount ? `£${parseFloat(amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
    },
    {
      title: 'Settlement',
      dataIndex: 'ml_prediction',
      key: 'settlement',
      render: (ml_prediction, record) => {
        // First check if there's a decided amount, which takes precedence
        if (record.decided_settlement_amount !== null && record.decided_settlement_amount !== undefined) {
          return `£${parseFloat(record.decided_settlement_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        // Otherwise show ML prediction if available
        return ml_prediction ? 
          `£${parseFloat(ml_prediction.settlement_amount).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 
          'Pending Assessment';
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Date Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/claims/${record.id}`)}>
            View Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card className={darkMode ? 'bg-gray-800 text-white' : ''}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} className={darkMode ? 'text-white' : ''}>My Insurance Claims</Title>
          <Button type="primary" onClick={() => navigate('/claims/new')}>
            Submit New Claim
          </Button>
        </div>
        
        <Alert
          message="AI-Powered Claims Processing"
          description="Our system uses machine learning to assess and determine the optimal settlement amount for your insurance claims."
          type="info"
          showIcon
          className={darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : ''}
        />
        
        {error && (
          <Alert
            message="Error"
            description={error}
            type="error"
            showIcon
            className="mb-4"
          />
        )}
        
        {loading && claims.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          <Table 
            columns={columns} 
            dataSource={claims} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }}
            className={darkMode ? 'ant-table-dark' : ''}
            locale={{ emptyText: 'No claims found' }}
          />
        )}
      </Space>
    </Card>
  );
};

export default ClaimsList;
