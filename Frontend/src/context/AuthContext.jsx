// context/AuthContext.js (UPDATED)
import React, { createContext, useState, useContext, useEffect } from 'react';
import { initializeSocket, disconnectSocket, getSocket, isSocketConnected } from '../services/socket';
import { authAPI } from '../services/api';

const AuthContext = createContext();

// Safe storage utility
const storage = {
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('localStorage set failed, using sessionStorage:', error);
      try {
        sessionStorage.setItem(key, value);
        return true;
      } catch (sessionError) {
        console.error('All storage options failed:', sessionError);
        return false;
      }
    }
  },

  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('localStorage get failed, trying sessionStorage:', error);
      try {
        return sessionStorage.getItem(key);
      } catch (sessionError) {
        console.error('All storage get options failed:', sessionError);
        return null;
      }
    }
  },

  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('localStorage remove failed:', error);
    }
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn('sessionStorage remove failed:', error);
    }
  }
};

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
  const [storageAvailable, setStorageAvailable] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Test storage availability
      try {
        const test = 'test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        setStorageAvailable(true);
      } catch (e) {
        console.warn('LocalStorage is not available, using memory fallback');
        setStorageAvailable(false);
      }

      const token = storage.getItem('capmis_token');
      console.log('Initial auth check - Token found:', !!token, 'Storage available:', storageAvailable);

      if (token) {
        try {
          const profile = await authAPI.getProfile();
          setUser(profile.user);
        } catch (error) {
          console.error('Profile fetch failed:', error);
          storage.removeItem('capmis_token');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // 🔥 Listen for license revocation in real-time
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLicenseRevoked = (data) => {
      console.log('🚫 License revoked received:', data);

      // Clear auth data
      storage.removeItem('capmis_token');
      setUser(null);
      disconnectSocket();

      // Show message and redirect
      alert(data.message || 'Your license has been revoked. Please contact support.');
      window.location.href = '/login?reason=license_revoked';
    };

    socket.on('license:revoked', handleLicenseRevoked);

    return () => {
      socket.off('license:revoked', handleLicenseRevoked);
    };
  }, [user]); // Re-run when user changes (after login)

  // UPDATED login function
  const login = async (email, password) => {
    try {
      setLoading(true);

      // authAPI.login returns the data object
      const data = await authAPI.login(email, password);

      console.log('🔐 Login response:', data); // Debug log

      // Check if login was successful
      if (data.success && data.token) {
        // Store token
        const stored = storage.setItem('capmis_token', data.token);
        if (!stored) {
          return {
            success: false,
            error: 'Browser storage is blocked. Please check privacy settings.'
          };
        }

        // ✅ IMPORTANT: Set user data immediately
        if (data.user) {
          setUser(data.user);
          console.log('✅ User set in context:', data.user); // Debug log
        }

        //Initialize socket connection with the new token
        console.log('🔐 Login successful, initializing socket with token...');
        initializeSocket(data.token);


        // Also verify socket connected after a short delay
        setTimeout(() => {
          console.log('🔌 Socket connection status after login:', {
            connected: isSocketConnected(),
            socketId: getSocket()?.id
          });
        }, 1000);


        // ✅ Return the redirectTo and user data to the component
        return {
          success: true,
          redirectTo: data.redirectTo || '/dashboard',
          user: data.user,
          needsPasswordChange: data.user?.needsPasswordChange || false
        };
      }

      // If login failed, return the error
      return {
        success: false,
        error: data.error || data.message || 'Login failed'
      };

    } catch (error) {
      console.error('Unexpected login error:', error);
      return {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      console.log('Sending registration data:', userData);
      const data = await authAPI.register(userData);
      console.log('Registration response:', data);

      if (data.success && data.token) {
        const stored = storage.setItem('capmis_token', data.token);
        if (!stored) {
          return { success: false, error: 'Browser storage is blocked. Please check your privacy settings.' };
        }
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.log('Registration catch error:', error);
      return { success: false, error: error.message || 'Registration failed' };
    }
  };

  const updateUser = (userData) => {
    setUser(prevUser => ({
      ...prevUser,
      ...userData
    }));
  };

  
  const logout = async () => {
    try {
      // Call server logout to invalidate token
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local cleanup even if API fails
    } finally {
      // Clear all auth data
      setUser(null);

      // Remove token from all storage
      storage.removeItem('capmis_token');

      // Clear any cached user data
      try {
        localStorage.removeItem('capmis_user');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }

      // Disconnect WebSocket
      disconnectSocket();

      // Redirect to login page
      window.location.href = '/login';
    }
  };

  const isAuthenticated = () => {
    return !!user && !!storage.getItem('capmis_token');
  };

  const value = {
    user,
    login,
    register,
    updateUser,
    logout,
    loading,
    isAuthenticated,
    storageAvailable,
    socket: getSocket(),
    isSocketConnected: () => isSocketConnected(),  // ✅ Add socket connection status to context
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};