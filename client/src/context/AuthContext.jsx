import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  getStoredUser,
  setSession,
  clearSession,
  loginUser,
  registerUser,
  fetchCurrentUser,
} from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  // Logout handler clears storage and local state
  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  // Validate stored token on mount with the backend
  useEffect(() => {
    let isMounted = true;

    const verifyExistingAuth = async () => {
      const storedToken = getStoredToken();
      if (!storedToken) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const response = await fetchCurrentUser();
        if (isMounted && response?.user) {
          setUser(response.user);
          setToken(storedToken);
          setSession(storedToken, response.user);
        }
      } catch (err) {
        // If token has expired or is invalid, clear session safely
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyExistingAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  // Sign In
  const login = async ({ email, password }) => {
    const data = await loginUser({ email, password });
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  // Sign Up
  const register = async ({ name, email, password, role }) => {
    const data = await registerUser({ name, email, password, role });
    if (data.token && data.user) {
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  // Update locally stored user profile details
  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => {
      const data = typeof updatedUserData === 'function' ? updatedUserData(prev) : updatedUserData;
      const merged = {
        ...prev,
        ...data,
        ...(data?.profile !== undefined
          ? {
              profile: {
                ...(prev?.profile || {}),
                ...data.profile,
              },
            }
          : {}),
      };
      setSession(getStoredToken(), merged);
      return merged;
    });
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    role: user?.role || null,
    isCandidate: user?.role === 'candidate',
    isRecruiter: user?.role === 'recruiter',
    loading,
    login,
    register,
    logout,
    updateUser,
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

export default AuthContext;
