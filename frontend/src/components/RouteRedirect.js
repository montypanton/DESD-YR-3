import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * A component that redirects users from /claims/new to /submit-claim
 * This helps maintain compatibility with both routes
 */
const RouteRedirect = ({ from, to }) => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  
  return null;
};

export default RouteRedirect;
