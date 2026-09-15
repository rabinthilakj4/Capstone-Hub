import { Router } from 'express';
import {
  createProject,
  getPublishedProjects,
  getProjectById,
  requestToJoinProject,
  getProjectJoinRequests,
  respondToJoinRequest,
  getMyProjects
} from '../controllers/projectController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { UserRole } from 'shared';

const router = Router();

router.get('/published', authenticateToken, getPublishedProjects);
router.get('/mine', authenticateToken, getMyProjects);
router.get('/:projectId/join-requests', authenticateToken, requireRole(UserRole.STUDENT), getProjectJoinRequests);
router.get('/:projectId', authenticateToken, getProjectById);
router.post('/create', authenticateToken, requireRole(UserRole.STUDENT), createProject);
router.post('/:projectId/join', authenticateToken, requireRole(UserRole.STUDENT), requestToJoinProject);
router.post('/join-request/respond', authenticateToken, requireRole(UserRole.STUDENT), respondToJoinRequest);

export default router;
