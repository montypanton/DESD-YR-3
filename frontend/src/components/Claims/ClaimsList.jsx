import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Card, Space, Typography, Alert, Spin, Tooltip } from 'antd';
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
          return (
            <Tooltip title="Final settlement amount decided by finance">
              <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
                £{parseFloat(record.decided_settlement_amount).toLocaleString('en-GB', 
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Tooltip>
          );
        }
        
        // Check if ML prediction exists directly
        if (ml_prediction && ml_prediction.settlement_amount) {
          return (
            <Tooltip title="ML predicted settlement amount">
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                £{parseFloat(ml_prediction.settlement_amount).toLocaleString('en-GB', 
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Tooltip>
          );
        }
        
        // Check if ml_settlement_amount is available (from serializer direct access)
        if (record.ml_settlement_amount) {
          return (
            <Tooltip title="ML predicted settlement amount">
              <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
                £{parseFloat(record.ml_settlement_amount).toLocaleString('en-GB', 
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </Tooltip>
          );
        }
        
        // No ML prediction available
        return (
          <Tooltip title="No ML prediction available">
            <span style={{ color: '#999999' }}>Pending Assessment</span>
          </Tooltip>
        );
      },
      sorter: (a, b) => {
        // First try to sort by decided amount
        if (a.decided_settlement_amount !== null && b.decided_settlement_amount !== null) {
          return parseFloat(a.decided_settlement_amount) - parseFloat(b.decided_settlement_amount);
        }
        
        // Next try ML prediction
        const valueA = a.ml_prediction?.settlement_amount || a.ml_settlement_amount || 0;
        const valueB = b.ml_prediction?.settlement_amount || b.ml_settlement_amount || 0;
        return parseFloat(valueA) - parseFloat(valueB);
      }
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
          message="Automated Claims Processing"
          description="Our system now automatically approves all claims and uses machine learning to determine the optimal settlement amount instantly."
          type="success"
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
