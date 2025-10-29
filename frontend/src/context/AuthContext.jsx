import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults - remove /api from baseURL since components include it
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  axios.defaults.baseURL = apiUrl;
  console.log('Axios base URL set to:', apiUrl);

  // Add token to requests if it exists
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Ensure token is attached on every request and handle 401 globally
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      const currentToken = localStorage.getItem('token');
      console.log('Making request to:', config.url, 'with base URL:', config.baseURL);
      if (currentToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error?.response?.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          // Try to get user profile from our backend
          const response = await axios.get('/api/auth/profile');
          setUser(response.data.user);
        } catch (error) {
          console.error('Failed to get user profile:', error);
          localStorage.removeItem('token');
          setToken(null);
          delete axios.defaults.headers.common['Authorization'];
          // Force re-login on unauthorized
          if (error?.response?.status === 401) {
            try { window?.location && (window.location.href = '/login'); } catch {}
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (loginData) => {
    try {
      // Use real backend authentication
      const response = await axios.post('/api/auth/login', {
        email: loginData.email || loginData.username,
        password: loginData.password
      });
      
      if (response.data.success) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return { success: true, user: user };
      } else {
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.msg || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put('/api/auth/profile', profileData);
      // If backend returns updated user, store it
      if (response?.data?.user) {
        setUser(response.data.user);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || error.response?.data?.error || 'Profile update failed'
      };
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isStudent: user?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 