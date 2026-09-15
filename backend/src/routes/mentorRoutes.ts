import { Router } from 'express';
import {
  getRecommendedMentors,
  getAllMentors,
  requestMentorship,
  acceptMentorshipRequest,
  acceptProjectDirectly,
  rejectMentorshipRequest,
  rejectProjectDirectly,
  unassignMentor,
  getMentorAssignedProjects,
  getAllStudentProjects
} from '../controllers/mentorController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from 'shared';

const router = Router();

router.get('/all-student-projects', authenticateToken, requireRole(UserRole.MENTOR), getAllStudentProjects);
router.get('/student-projects', authenticateToken, requireRole(UserRole.MENTOR), getAllStudentProjects);
router.get('/recommended', authenticateToken, getRecommendedMentors);
router.get('/recommendations/:projectId?', authenticateToken, getRecommendedMentors);
router.get('/all', authenticateToken, getAllMentors);
router.post('/request', authenticateToken, requireRole(UserRole.STUDENT), requestMentorship);
router.post('/', authenticateToken, requireRole(UserRole.STUDENT), requestMentorship);
router.get('/requests', authenticateToken, requireRole(UserRole.MENTOR), getMentorAssignedProjects);
router.get('/assigned', authenticateToken, requireRole(UserRole.MENTOR), getMentorAssignedProjects);

// Direct project accept/reject/unassign
router.post('/project/:projectId/accept', authenticateToken, requireRole(UserRole.MENTOR), acceptProjectDirectly);
router.post('/project/:projectId/reject', authenticateToken, requireRole(UserRole.MENTOR), rejectProjectDirectly);
router.post('/project/:projectId/unassign', authenticateToken, unassignMentor);
router.delete('/project/:projectId/unassign', authenticateToken, unassignMentor);

// Request ID based accept/reject for direct mentorship requests
router.post('/requests/:requestId/accept', authenticateToken, requireRole(UserRole.MENTOR), acceptMentorshipRequest);
router.patch('/requests/:requestId/accept', authenticateToken, requireRole(UserRole.MENTOR), acceptMentorshipRequest);
router.patch('/:requestId/accept', authenticateToken, requireRole(UserRole.MENTOR), acceptMentorshipRequest);

router.post('/requests/:requestId/reject', authenticateToken, requireRole(UserRole.MENTOR), rejectMentorshipRequest);
router.patch('/requests/:requestId/reject', authenticateToken, requireRole(UserRole.MENTOR), rejectMentorshipRequest);
router.patch('/:requestId/reject', authenticateToken, requireRole(UserRole.MENTOR), rejectMentorshipRequest);

export default router;
