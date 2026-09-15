import { Router } from 'express';
import { getSkillGapAnalysis } from '../controllers/teamController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/:projectId/skill-gaps', authenticateToken, getSkillGapAnalysis);

export default router;
