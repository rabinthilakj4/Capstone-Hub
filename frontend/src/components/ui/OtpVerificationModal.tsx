import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, RefreshCw, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  initialMessage?: string;
  devOtp?: string;
  onSuccess: (res: any) => void;
  onClose: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  email,
  initialMessage,
  devOtp,
  onSuccess,
  onClose
}) => {
  const { verifyOtp, resendOtp } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(initialMessage || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval: any;
    if (isOpen && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter a valid 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await verifyOtp(email, otpCode.trim());
      if (res.success) {
        onSuccess(res);
      } else {
        setError(res.message || 'Invalid OTP code. Please check and try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setResending(true);
      setError('');
      const res = await resendOtp(email);
      if (res.success) {
        setInfoMessage(`A new OTP has been sent to ${email}.`);
        setTimer(60);
      } else {
        setError(res.message || 'Failed to resend OTP.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 relative space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Verify Your Email Address</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            We sent a 6-digit verification code to <span className="font-bold text-slate-800">{email}</span>
          </p>
        </div>

        {/* Info Banner */}
        {infoMessage && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-xs font-semibold text-indigo-800 flex items-start gap-2">
            <Mail className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">{infoMessage}</p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Red Notice Banner for Inbox / Spam Check */}
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">
            Didn't receive the OTP? Please check your <span className="underline font-extrabold">Inbox</span> or <span className="underline font-extrabold">Spam/Junk folder</span>.
          </p>
        </div>

        {/* Development Mode OTP Notice for Staff Testing */}
        {devOtp && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Staff Test OTP: <code className="bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded font-mono text-sm tracking-wider">{devOtp}</code></span>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(devOtp)}
              className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-xl transition"
            >
              Fill OTP
            </button>
          </div>
        )}

        {/* OTP Input Form */}
        <form onSubmit={handleVerify} className="space-y-5">
          <div>
            <label className="block text-center text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">
              Enter 6-Digit OTP Code
            </label>
            <input
              type="text"
              autoFocus
              maxLength={6}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="123456"
              className="w-full text-center py-3 px-4 text-2xl font-black tracking-[0.5em] text-slate-900 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-2xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Verifying OTP...</span>
            ) : (
              <>
                <span>Verify & Activate Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Resend Action */}
        <div className="pt-2 border-t text-center flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Didn't receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || timer > 0}
            className="font-bold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400 flex items-center gap-1 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
