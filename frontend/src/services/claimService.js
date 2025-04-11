import { apiClient } from './authService';

export const getDashboardData = async () => {
  return await apiClient.get('/claims/dashboard/');
};

export const getClaimStatistics = async () => {
  return await apiClient.get('/claims/statistics/');
};

export const getRecentClaims = async () => {
  return await apiClient.get('/claims/', { 
    params: { 
      ordering: '-created_at',
      limit: 5 
    } 
  });
};