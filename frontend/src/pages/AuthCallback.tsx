import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';

function parseJwtPayload(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isProcessed = false;

    const processGoogleUser = async (email: string, name?: string) => {
      if (isProcessed) return;
      isProcessed = true;

      try {
        const res = await googleLogin(email, name || email.split('@')[0]);

        if (res.success && res.user) {
          const role = res.user.role;
          if (!res.user.profile_completed) {
            if (role === 'MENTOR') {
              navigate('/faculty/onboarding', { replace: true });
            } else {
              navigate('/register', { replace: true });
            }
          } else if (role === 'STUDENT') {
            navigate('/student/dashboard', { replace: true });
          } else if (role === 'MENTOR') {
            navigate('/mentor/dashboard', { replace: true });
          } else if (role === 'ADMIN') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        } else {
          setErrorMsg(res?.message || 'Google authentication failed in Capstone Hub.');
        }
      } catch (err: any) {
        const backendMessage = err.response?.data?.message || err.response?.data?.error;
        if (backendMessage) {
          setErrorMsg(backendMessage);
        } else if (err.response?.status === 500 || err.code === 'ERR_BAD_RESPONSE') {
          setErrorMsg('Authentication server error (500). Please check that the backend server is running and try again.');
        } else {
          setErrorMsg(err.message || 'Google authentication error.');
        }
      }
    };

    const initAuthCallback = async () => {
      // 1. First, check URL hash directly for #access_token=... returned by Supabase OAuth
      const hash = window.location.hash;
      if (hash && hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(hash.replace('#', ''));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          const payload = parseJwtPayload(accessToken);
          if (payload && payload.email) {
            const email: string = payload.email;
            const name =
              payload.user_metadata?.full_name ||
              payload.user_metadata?.name ||
              email.split('@')[0];
            await processGoogleUser(email, name);
            return;
          }
        }
      }

      // 2. Second, check active Supabase Auth Session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (session?.user?.email) {
          const sbUser = session.user;
          const email: string = sbUser.email!;
          const name =
            sbUser.user_metadata?.full_name ||
            sbUser.user_metadata?.name ||
            email.split('@')[0];
          await processGoogleUser(email, name);
          return;
        }
      } catch (e: any) {
        // Fallback to auth listener
      }

      // 3. Third, listen for auth state change
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (currentSession?.user?.email) {
          const sbUser = currentSession.user;
          const email: string = sbUser.email!;
          const name =
            sbUser.user_metadata?.full_name ||
            sbUser.user_metadata?.name ||
            email.split('@')[0];
          await processGoogleUser(email, name);
        }
      });

      // 4. Timeout safety: if neither completes within 5 seconds, show clear error
      const timeoutTimer = setTimeout(() => {
        if (!isProcessed) {
          setErrorMsg('Authentication timed out. Unable to retrieve Google user session. Please try signing in again.');
        }
      }, 5000);

      return () => {
        clearTimeout(timeoutTimer);
        authListener.subscription.unsubscribe();
      };
    };

    initAuthCallback();
  }, [navigate, googleLogin]);

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Google Authentication Notice</h2>
          <p className="text-xs text-rose-600 font-medium mb-4">{errorMsg}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-bold">Completing Google Authentication...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting your Google profile to Capstone Hub</p>
      </div>
    </div>
  );
};
