import React, { useState, useEffect } from 'react';
import { Card, Descriptions, Tag, Spin, Button, Typography, Divider, message, Alert } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiClient } from '../../services/authService';

const { Title, Text } = Typography;

const ClaimDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClaimDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching claim details for ID:', id);
        const response = await apiClient.get(`/claims/${id}/`);
        console.log('Claim details response:', response.data);
        setClaim(response.data);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'green';
      case 'REJECTED': return 'red';
      case 'PROCESSING': return 'blue';
      case 'PENDING':
      default: return 'orange';
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}><Spin size="large" /></div>;
  }

  if (!claim) {
    return <div>Claim not found</div>;
  }

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title level={3}>Insurance Claim Details</Title>
        <Button onClick={() => navigate('/predictions')}>Back to Claims</Button>
      </div>

      {claim.ml_prediction && (
        <Alert
          message="AI Assessment Complete"
          description={`Our AI system has analyzed your claim and determined a settlement amount of $${parseFloat(claim.ml_prediction.settlement_amount).toFixed(2)}`}
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Descriptions bordered column={1}>
        <Descriptions.Item label="Reference Number">{claim.reference_number}</Descriptions.Item>
        <Descriptions.Item label="Title">{claim.title}</Descriptions.Item>
        <Descriptions.Item label="Claimed Amount">${parseFloat(claim.amount).toFixed(2)}</Descriptions.Item>
        {claim.ml_prediction && (
          <Descriptions.Item label="Settlement Amount">
            ${parseFloat(claim.ml_prediction.settlement_amount).toFixed(2)}
          </Descriptions.Item>
        )}
        <Descriptions.Item label="Status">
          <Tag color={getStatusColor(claim.status)}>{claim.status}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Submitted On">{new Date(claim.created_at).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Last Updated">{new Date(claim.updated_at).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="Description">{claim.description}</Descriptions.Item>
      </Descriptions>

      <Divider orientation="left">Claim Details</Divider>
      
      <Card type="inner" title="Incident Information">
        {claim.claim_data && Object.entries(claim.claim_data).map(([key, value]) => (
          <p key={key}>
            <Text strong>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: </Text>
            <Text>{value}</Text>
          </p>
        ))}
      </Card>
    </Card>
  );
};

export default ClaimDetail;
