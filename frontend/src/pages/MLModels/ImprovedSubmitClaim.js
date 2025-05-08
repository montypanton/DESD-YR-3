import React, { useEffect } from 'react';
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
      <ImprovedClaimForm />
    </div>
  );
};

export default ImprovedSubmitClaim;