import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if token exists
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    // If token exists, validate it and get user data
    const validateToken = async () => {
      if (storedToken) {
        try {
          const response = await authService.getCurrentUser();
          setUser(response.data);
          setLoading(false);
        } catch (error) {
          // If token is invalid or expired, clear state
          console.error('Token validation failed:', error);
          logout();
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    validateToken();
  }, []);
  
  // Set token in localStorage when it changes
  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      // Set the token for API requests
      authService.setAuthToken(token);
    } else {
      localStorage.removeItem('token');
      authService.removeAuthToken();
    }
  }, [token]);
  
  // Save user in localStorage when it changes
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
      const response = await authService.login(credentials);
      
      setUser(response.data.user);
      setToken(response.data.access);
      
      // Store refresh token (if using JWT)
      if (response.data.refresh) {
        localStorage.setItem('refreshToken', response.data.refresh);
      }
      
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      setError(null);
      const response = await authService.register(userData);
      return response.data;
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    // Call backend to blacklist token if using JWT
    authService.logout()
      .then(() => console.log('Logged out successfully'))
      .catch((error) => console.error('Logout error:', error))
      .finally(() => {
        // Clear auth state regardless of API response
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
      await authService.changePassword(passwordData);
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
    changePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};