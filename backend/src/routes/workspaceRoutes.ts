import { Router } from 'express';
import {
  getWorkspaceData,
  createTask,
  updateTaskStatus,
  submitMilestone,
  reviewMilestone,
  uploadDocument,
  scheduleMeeting,
  deleteMeeting,
  submitEvaluation
} from '../controllers/workspaceController';
import { authenticateToken } from '../middleware/auth';
import { requireProjectAccess } from '../middleware/dataAuth';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use('/:projectId', authenticateToken, requireProjectAccess);

router.get('/:projectId', getWorkspaceData);
router.post('/:projectId/tasks', createTask);
router.patch('/:projectId/tasks/:taskId/status', updateTaskStatus);
router.post('/:projectId/milestones/:milestoneId/submit', submitMilestone);
router.post('/:projectId/milestones/:milestoneId/review', reviewMilestone);
router.post('/:projectId/documents', (req, res, next) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'File upload error.' });
    }
    next();
  });
}, uploadDocument);
router.post('/:projectId/meetings', scheduleMeeting);
router.delete('/:projectId/meetings/:meetingId', deleteMeeting);
router.post('/:projectId/evaluation', submitEvaluation);

export default router;
