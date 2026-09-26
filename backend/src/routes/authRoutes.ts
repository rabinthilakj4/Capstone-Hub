import { Router } from 'express';
import { register, login, verifyOtp, resendOtp, googleLogin, logout, getCurrentUser, adminSendOtp, adminVerifyOtp, confirmGoogleStudentRegistration } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/google-login', googleLogin);
router.post('/confirm-google-student-registration', confirmGoogleStudentRegistration);
router.post('/logout', logout);
router.get('/me', authenticateToken, getCurrentUser);

// Secure Admin Email + OTP Authentication Routes
router.post('/admin/send-otp', adminSendOtp);
router.post('/admin/verify-otp', adminVerifyOtp);

export default router;

