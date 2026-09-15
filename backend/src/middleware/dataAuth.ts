import { Response, NextFunction } from 'express';
import { UserRole } from 'shared';
import { AuthRequest } from './auth';
import prisma from '../config/db';

export const requireProjectAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const projectId = req.params.projectId || req.params.id || req.body.project_id || req.query.projectId;

    if (!projectId) {
      return res.status(400).json({ success: false, message: 'Project ID is required for authorization.' });
    }

    // Admins bypass project-level checks
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    const project = await prisma.project.findUnique({
      where: { project_id: String(projectId) },
      include: {
        team: {
          include: {
            members: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // Mentor check
    if (req.user.role === UserRole.MENTOR) {
      if (project.mentor_id === req.user.user_id) {
        return next();
      }
      return res.status(403).json({ success: false, message: '403 Forbidden: You are not assigned to mentor this project.' });
    }

    // Student check
    if (req.user.role === UserRole.STUDENT) {
      const isCreator = project.created_by === req.user.user_id;
      const isTeamMember = project.team?.members.some(m => m.student_id === req.user?.user_id);

      if (isCreator || isTeamMember) {
        return next();
      }
      return res.status(403).json({ success: false, message: '403 Forbidden: You are not a member of this project workspace.' });
    }

    return res.status(403).json({ success: false, message: '403 Forbidden: Access denied.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Authorization check failed.', error: (error as Error).message });
  }
};
