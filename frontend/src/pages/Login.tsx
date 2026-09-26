import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, AlertCircle, UserCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, googleLogin } = useAuth();

  // If user is already authenticated, automatically redirect to their assigned panel
  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'MENTOR') {
        navigate(user.profile_completed ? '/mentor/dashboard' : '/faculty/onboarding', { replace: true });
      } else if (user.role === 'STUDENT') {
        navigate(user.profile_completed ? '/student/dashboard' : '/register', { replace: true });
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleGoogleClick = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize Google authentication.');
      setGoogleLoading(false);
    }
  };

  const handleFacultyTestClick = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const res = await googleLogin('drsmith@bitsathy.ac.in', 'Dr. Smith');
      if (res.success && res.user) {
        if (!res.user.profile_completed) {
          navigate('/faculty/onboarding');
        } else {
          navigate('/mentor/dashboard');
        }
      } else {
        setError(res.message || 'Failed to log in as Faculty.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to log in as Faculty.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glow elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <img src="/logo.svg" alt="Capstone Hub Logo" className="w-16 h-16 rounded-2xl shadow-xl shadow-indigo-600/40 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">CAPSTONE HUB</h1>
          <p className="text-slate-400 text-sm mt-1">Bannari Amman Institute of Technology Portal</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-slate-100 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <span>Account Sign In</span>
          </h2>

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl font-medium flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Single Main "Sign in with Google" Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading}
            className="w-full py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-bold border border-slate-300 rounded-xl shadow-sm flex items-center justify-center gap-3 transition hover:border-indigo-400 active:scale-[0.99] disabled:opacity-50 text-base"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{googleLoading ? 'Redirecting to Google...' : 'Sign in with Google'}</span>
          </button>

          {/* Test Faculty Login Button for Testing Purposes */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleFacultyTestClick}
              disabled={googleLoading}
              className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200/80 rounded-xl transition text-xs flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Test Faculty Login (drsmith@bitsathy.ac.in)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
