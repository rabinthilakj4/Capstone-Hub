import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { detectSkillGaps } from '../services/matchingEngine';

export const getSkillGapAnalysis = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const result = await detectSkillGaps(projectId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to analyze team skill gaps.' });
  }
};
