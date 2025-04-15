import { apiClient } from './authService';

export const getClaims = async () => {
  return await apiClient.get('/claims/');
};

export const getClaimById = async (id) => {
  return await apiClient.get(`/claims/${id}/`);
};

export const createClaim = async (claimData) => {
  return await apiClient.post('/claims/', claimData);
};

export const getDashboardData = async () => {
  return await apiClient.get('/claims/dashboard/');
};