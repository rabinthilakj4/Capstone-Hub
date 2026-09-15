import { Router } from 'express';
import {
  getDepartments,
  getSkills,
  updateStudentProfile,
  updateMentorProfile,
  completeOnboarding,
  getUserProjects,
  getNotifications,
  markNotificationsRead
} from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from 'shared';

const router = Router();

router.get('/departments', getDepartments);
router.get('/skills', getSkills);
router.post('/complete-onboarding', authenticateToken, completeOnboarding);
router.put('/student-profile', authenticateToken, requireRole(UserRole.STUDENT), updateStudentProfile);
router.put('/mentor-profile', authenticateToken, requireRole(UserRole.MENTOR), updateMentorProfile);
router.get('/my-projects', authenticateToken, getUserProjects);
router.get('/notifications', authenticateToken, getNotifications);
router.patch('/notifications/read', authenticateToken, markNotificationsRead);

export default router;

