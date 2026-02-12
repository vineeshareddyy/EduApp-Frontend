import React, { createContext, useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  // Updated login to accept userType parameter
  const login = async (email, password, userType = null) => {
    try {
      console.log('AuthContext: Starting login process for:', email, 'Type:', userType);
      const response = await authService.login(email, password, userType);
      console.log('AuthContext: Login successful', response.data.user);
      setUser(response.data.user);
      return response;
    } catch (error) {
      console.error('AuthContext: Login failed', error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      console.log('AuthContext: Logout successful');
    } catch (error) {
      console.error('AuthContext: Logout error', error);
      setUser(null);
    }
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};