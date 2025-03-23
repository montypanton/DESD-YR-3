import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to add auth token to requests
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

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't already tried to refresh the token
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          // If no refresh token, just logout
          return Promise.reject(error);
        }
        
        const response = await axios.post(`${API_URL}/account/token/refresh/`, {
          refresh: refreshToken,
        });
        
        // Save the new token
        localStorage.setItem('token', response.data.access);
        
        // Update the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
        
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, logout and reject
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
  // Set token for API requests
  setAuthToken: (token) => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  },
  
  // Remove auth token
  removeAuthToken: () => {
    delete api.defaults.headers.common['Authorization'];
  },
  
  // Register new user
  register: (userData) => {
    return api.post('/account/register/', userData);
  },
  
  // Login user
  login: (credentials) => {
    return api.post('/account/login/', credentials);
  },
  
  // Logout user
  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/account/logout/', { refresh: refreshToken });
  },
  
  // Get current user data
  getCurrentUser: () => {
    return api.get('/account/profile/');
  },
  
  // Update user profile
  updateProfile: (profileData) => {
    return api.put('/account/profile/', profileData);
  },
  
  // Change password
  changePassword: (passwordData) => {
    return api.post('/account/change-password/', passwordData);
  },
};

// Create and export API client for other services to use
export const apiClient = api;