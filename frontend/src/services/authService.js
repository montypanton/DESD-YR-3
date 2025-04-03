import axios from 'axios';

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

// Add response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If the error is 401 and we haven't already tried to refresh
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(
            `${process.env.REACT_APP_API_URL}/account/token/refresh/`,
            { refresh: refreshToken }
          );

          if (res.status === 200) {
            localStorage.setItem('token', res.data.access);
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
            originalRequest.headers['Authorization'] = `Bearer ${res.data.access}`;
            
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          console.log('Error refreshing token', refreshError);
          // If refresh token is expired, logout
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

const authService = {
  setAuthToken: (token) => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  },

  removeAuthToken: () => {
    delete apiClient.defaults.headers.common['Authorization'];
  },

  login: (credentials) => {
    console.log('Login credentials being sent:', credentials);
    // Django REST framework expects username/password by default, not email/password
    return apiClient.post('/account/login/', {
      username: credentials.email, // Try with username instead of email
      password: credentials.password
    });
  },

  register: (userData) => {
    return apiClient.post('/account/register/', userData);
  },

  logout: () => {
    return apiClient.post('/account/logout/');
  },

  updateProfile: (profileData) => {
    return apiClient.put('/account/profile/', profileData);
  },

  changePassword: (passwordData) => {
    return apiClient.post('/account/change-password/', passwordData);
  },

  verifyToken: () => {
    return apiClient.post('/account/token/verify/');
  }
};

export default authService;