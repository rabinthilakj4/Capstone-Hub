import { Router } from 'express';
import {
  getSystemStats,
  getAdminStudents,
  getAdminFaculty,
  getAdminDepartments,
  getAdminProjects,
  getAdminProjectRequests,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  getAdminMessages,
  deleteMessage,
  deleteProject,
  getPendingProjects,
  reviewProjectApproval,
  getMatchingWeightsSetting,
  updateMatchingWeightsSetting,
  getAuditLogs,
  createDepartment,
  adminUnassignMentor,
  adminAssignMentor
} from '../controllers/adminController';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';

const router = Router();

// 🔒 STRICT SECURITY: Authenticate token & require ADMIN credentials
router.use(authenticateToken, requireAdmin);

router.get('/stats', getSystemStats);
router.get('/students', getAdminStudents);
router.get('/faculty', getAdminFaculty);
router.get('/departments', getAdminDepartments);
router.get('/projects', getAdminProjects);
router.delete('/projects/:projectId', deleteProject);
router.post('/projects/:projectId/unassign-mentor', adminUnassignMentor);
router.post('/projects/:projectId/assign-mentor', adminAssignMentor);
router.get('/project-requests', getAdminProjectRequests);
router.get('/users', getAllUsers);
router.delete('/users/:userId', deleteUser);
router.patch('/users/:userId/status', toggleUserStatus);
router.get('/messages', getAdminMessages);
router.delete('/messages/:messageId', deleteMessage);
router.get('/projects/pending', getPendingProjects);
router.post('/projects/:projectId/review', reviewProjectApproval);
router.get('/matching-weights', getMatchingWeightsSetting);
router.put('/matching-weights', updateMatchingWeightsSetting);
router.get('/audit-logs', getAuditLogs);
router.post('/departments', createDepartment);

export default router;
