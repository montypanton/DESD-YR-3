import React, { useEffect } from 'react';
import { Card, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ImprovedClaimForm from '../../components/Claims/ImprovedClaimForm';

const ImprovedSubmitClaim = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect if not authenticated
    if (!user) {
      navigate('/login');
    }
    
    // Set page title
    document.title = 'Submit Claim | Insurance Claims Platform';
    
    // Clean up on unmount
    return () => {
      document.title = 'Insurance Claims Platform';
    };
  }, [user, navigate]);

  return (
    <div className="submit-claim-container">
      <Alert
        message="Enhanced Claim Submission"
        description="This improved claim form uses our advanced ML prediction system to provide instant settlement estimates with higher accuracy and reliability."
        type="info"
        showIcon
        style={{ marginBottom: 20 }}
      />
      
      <ImprovedClaimForm />
    </div>
  );
};

export default ImprovedSubmitClaim;