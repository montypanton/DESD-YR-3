// Handles all authentication-related API logic including attaching tokens to requests 
// and refreshing expired tokens

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/account/token/refresh/`, {
          refresh: refreshToken,
        });
        
        localStorage.setItem('token', response.data.access);
        
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authService = {
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
  
  removeAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },
  
  register: (userData) => {
    return api.post('/account/register/', userData);
  },
  
  login: (credentials) => {
    return api.post('/account/login/', credentials);
  },
  
  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/account/logout/', { refresh: refreshToken });
  },
  
  getCurrentUser: () => {
    return api.get('/account/profile/');
  },
  
  updateProfile: (profileData) => {
    return api.put('/account/profile/', profileData);
  },
  
  changePassword: (passwordData) => {
    return api.post('/account/change-password/', passwordData);
  },
};

export const apiClient = api;