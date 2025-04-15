import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Create an API client instance
export const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
});

// Add request interceptor to include auth token in requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth service with actual implementation
const authService = {
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },
  
  login: async (credentials) => {
    return await apiClient.post('/account/login/', credentials);
  },
  
  register: async (userData) => {
    return await apiClient.post('/account/register/', userData);
  },
  
  logout: async () => {
    return await apiClient.post('/account/logout/');
  },
  
  updateProfile: async (profileData) => {
    return await apiClient.put('/account/profile/', profileData);
  },
  
  changePassword: async (passwordData) => {
    return await apiClient.post('/account/change-password/', passwordData);
  }
};

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (storedToken && storedUser) {
        try {
          // Set the token for API requests
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          // Verify the token is valid by making a request to user profile
          await apiClient.get('/account/profile/');
          
          // If request is successful, token is valid
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setLoading(false);
        } catch (error) {
          // Token is invalid or expired
          console.error('Token validation error:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    validateToken();
  }, []);
  
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);
  
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = async (credentials) => {
    try {
      setError(null);
      console.log('Attempting login with credentials:', credentials);
      const response = await authService.login(credentials);
      console.log('Login successful, full API response:', response);
      
      // Extract the user and token from the response
      const userData = response.data.user;
      const accessToken = response.data.access;
      
      // Enhanced debugging for admin detection
      console.log('Original user data from backend:', userData);
      console.log('User role before processing:', userData.role);
      console.log('Is superuser flag:', userData.is_superuser);
      console.log('Is staff flag:', userData.is_staff);
      
      // Ensure superusers are treated as admins in the frontend - more explicit comparison
      if ((userData.is_superuser === true || userData.is_staff === true) && userData.role !== 'ADMIN') {
        console.log('Detected superuser/staff - explicitly setting role to ADMIN');
        userData.role = 'ADMIN';
      }
      
      console.log('Final user role after processing:', userData.role);
      
      // Store the processed user data
      setUser(userData);
      setToken(accessToken);
      
      if (response.data.refresh) {
        localStorage.setItem('refreshToken', response.data.refresh);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      console.error('Error response:', error.response?.data);
      
      // Try to extract the most meaningful error message
      const errorMessage = 
        error.response?.data?.detail || 
        error.response?.data?.non_field_errors?.[0] ||
        error.response?.data?.error || 
        (typeof error.response?.data === 'string' ? error.response.data : 'Login failed');
      
      setError(errorMessage);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      console.log('Registering with data:', userData);
      const response = await authService.register(userData);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response data:', error.response?.data);
      
      if (error.response?.data) {
        // Pass through the detailed error data from the backend
        throw error;
      } else {
        setError('Registration failed');
        throw error;
      }
    }
  };

  const logout = () => {
    authService.logout()
      .then(() => console.log('Logged out successfully'))
      .catch((error) => console.error('Logout error:', error))
      .finally(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      });
  };

  const hasRole = (requiredRoles) => {
    if (!user) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.role);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      setUser({ ...user, ...response.data });
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update profile');
      throw error;
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const response = await authService.changePassword(passwordData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to change password');
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    hasRole,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};