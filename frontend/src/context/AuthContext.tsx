import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from 'shared';
import api from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  googleLogin: (email: string, name?: string, credential?: string) => Promise<any>;
  register: (payload: any) => Promise<any>;
  verifyOtp: (email: string, otp_code: string) => Promise<any>;
  adminVerifyOtp: (email: string, otp_code: string) => Promise<any>;
  resendOtp: (email: string) => Promise<any>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseMaybeJson(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      return [];
    }
  }
  return [];
}

function sanitizeUser(u: any): any {
  if (!u) return null;
  return {
    ...u,
    student_profile: u.student_profile ? {
      ...u.student_profile,
      skills: parseMaybeJson(u.student_profile.skills),
      interests: parseMaybeJson(u.student_profile.interests),
      portfolio_links: parseMaybeJson(u.student_profile.portfolio_links),
      preferred_domains: parseMaybeJson(u.student_profile.preferred_domains)
    } : undefined,
    mentor_profile: u.mentor_profile ? {
      ...u.mentor_profile,
      expertise: parseMaybeJson(u.mentor_profile.expertise),
      research_interests: parseMaybeJson(u.mentor_profile.research_interests)
    } : undefined
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refetchUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        setUser(sanitizeUser(res.data.user));
      } else {
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.success && res.data.user) {
      const cleanUser = sanitizeUser(res.data.user);
      setUser(cleanUser);
      return { ...res.data, user: cleanUser };
    }
    return res.data;
  };

  const googleLogin = async (email: string, name?: string, credential?: string) => {
    const res = await api.post('/auth/google-login', { email, name, credential });
    if (res.data.success && res.data.user) {
      const cleanUser = sanitizeUser(res.data.user);
      setUser(cleanUser);
      return { ...res.data, user: cleanUser };
    }
    return res.data;
  };

  const register = async (payload: any) => {
    const res = await api.post('/auth/register', payload);
    if (res.data.success && res.data.user) {
      const cleanUser = sanitizeUser(res.data.user);
      setUser(cleanUser);
      return { ...res.data, user: cleanUser };
    }
    return res.data;
  };

  const verifyOtp = async (email: string, otp_code: string) => {
    const res = await api.post('/auth/verify-otp', { email, otp_code });
    if (res.data.success && res.data.user) {
      const cleanUser = sanitizeUser(res.data.user);
      setUser(cleanUser);
      return { ...res.data, user: cleanUser };
    }
    return res.data;
  };

  const adminVerifyOtp = async (email: string, otp_code: string) => {
    const res = await api.post('/auth/admin/verify-otp', { email, otp_code });
    if (res.data.success && res.data.user) {
      const cleanUser = sanitizeUser(res.data.user);
      setUser(cleanUser);
      return { ...res.data, user: cleanUser };
    }
    return res.data;
  };

  const resendOtp = async (email: string) => {
    const res = await api.post('/auth/resend-otp', { email });
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, register, verifyOtp, adminVerifyOtp, resendOtp, logout, refetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
