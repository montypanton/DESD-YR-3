import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Card, Space, Typography, Alert } from 'antd';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const ClaimsList = () => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/claims/');
        setClaims(response.data);
      } catch (error) {
        console.error('Error fetching claims:', error);
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
      render: (amount) => `$${parseFloat(amount).toFixed(2)}`,
    },
    {
      title: 'Settlement',
      dataIndex: 'ml_prediction',
      key: 'settlement',
      render: (ml_prediction) => ml_prediction ? 
        `$${parseFloat(ml_prediction.settlement_amount).toFixed(2)}` : 
        'Pending Assessment',
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
      render: (date) => new Date(date).toLocaleDateString(),
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
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3}>My Insurance Claims</Title>
          <Button type="primary" onClick={() => navigate('/claims/new')}>
            Submit New Claim
          </Button>
        </div>
        
        <Alert
          message="AI-Powered Claims Processing"
          description="Our system uses machine learning to assess and determine the optimal settlement amount for your insurance claims."
          type="info"
          showIcon
        />
        
        <Table 
          columns={columns} 
          dataSource={claims} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Space>
    </Card>
  );
};

export default ClaimsList;
