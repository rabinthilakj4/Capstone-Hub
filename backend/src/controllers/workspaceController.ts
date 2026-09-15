import { Response } from 'express';
import { MilestoneStatus, TaskStatus, UserRole } from 'shared';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { calculateProjectHealthAndRisk } from '../services/healthEngine';
import { logAuditAction } from '../services/auditLogger';

export const getWorkspaceData = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        creator: { select: { user_id: true, student_id: true, name: true, email: true, department: true, student_profile: true } },
        mentor: { select: { user_id: true, name: true, email: true, department: true } },
        team: {
          include: {
            members: {
              include: {
                student: {
                  select: {
                    user_id: true,
                    student_id: true,
                    name: true,
                    email: true,
                    department: true,
                    student_profile: true
                  }
                }
              }
            }
          }
        },
        tasks: {
          include: {
            assignee: { select: { name: true } },
            comments: { include: { user: { select: { name: true } } } }
          },
          orderBy: { created_at: 'desc' }
        },
        milestones: { orderBy: { deadline: 'asc' } },
        documents: {
          include: { uploader: { select: { name: true } } },
          orderBy: { created_at: 'desc' }
        },
        messages: {
          include: { sender: { select: { name: true, role: true } } },
          orderBy: { created_at: 'asc' }
        },
        meetings: { orderBy: { created_at: 'desc' } },
        evaluations: {
          include: { evaluator: { select: { name: true } } },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project workspace not found.' });
    }

    // Access control check: User must be Leader, Team Member, Assigned Mentor, or Admin
    const userId = req.user?.user_id;
    const isLeader = project.created_by === userId;
    const isMember = project.team?.members?.some((m: any) => m.student?.user_id === userId || m.user_id === userId);
    const isMentor = project.mentor_id === userId;
    const isAdmin = req.user?.role === UserRole.ADMIN;

    if (!isLeader && !isMember && !isMentor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to access this project workspace.' });
    }

    const healthData = await calculateProjectHealthAndRisk(projectId);

    return res.json({
      success: true,
      workspace: {
        project: {
          ...project,
          objectives: JSON.parse(project.objectives),
          required_skills: JSON.parse(project.required_skills),
          required_departments: JSON.parse(project.required_departments),
          technologies: JSON.parse(project.technologies),
          preferred_mentor_expertise: JSON.parse(project.preferred_mentor_expertise)
        },
        health: healthData,
        tasks: project.tasks,
        milestones: project.milestones,
        documents: project.documents,
        messages: project.messages,
        meetings: project.meetings,
        evaluations: project.evaluations.map(e => ({
          ...e,
          rubric_scores: JSON.parse(e.rubric_scores || '{}')
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load workspace data.', error: (error as Error).message });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;
    const { title, description, assigned_to, priority, due_date } = req.body;

    if (!title || !assigned_to || !due_date) {
      return res.status(400).json({ success: false, message: 'Task title, assignee, and due date are required.' });
    }

    const task = await prisma.task.create({
      data: {
        project_id: projectId,
        created_by: req.user.user_id,
        assigned_to,
        title,
        description: description || '',
        priority: priority || 'MEDIUM',
        due_date,
        status: 'TODO'
      },
      include: { assignee: { select: { name: true } } }
    });

    // Notify assignee
    await prisma.notification.create({
      data: {
        user_id: assigned_to,
        type: 'TASK',
        message: `New task assigned to you: "${title}".`
      }
    });

    return res.status(201).json({ success: true, message: 'Task created!', task });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
};

export const updateTaskStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ success: false, message: 'Status is required.' });

    const task = await prisma.task.update({
      where: { task_id: taskId },
      data: { status }
    });

    return res.json({ success: true, message: 'Task status updated!', task });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update task status.' });
  }
};

export const submitMilestone = async (req: AuthRequest, res: Response) => {
  try {
    const { milestoneId } = req.params;
    const { submission_url, submission_notes } = req.body;

    const milestone = await prisma.milestone.update({
      where: { milestone_id: milestoneId },
      data: {
        status: 'SUBMITTED',
        submission_url: submission_url || '',
        submission_notes: submission_notes || '',
        submitted_at: new Date()
      },
      include: { project: true }
    });

    // Notify assigned mentor if any
    if (milestone.project.mentor_id) {
      await prisma.notification.create({
        data: {
          user_id: milestone.project.mentor_id,
          type: 'MILESTONE',
          message: `Milestone "${milestone.title}" submitted for project "${milestone.project.title}".`
        }
      });
    }

    return res.json({ success: true, message: 'Milestone submitted for review!', milestone });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit milestone.' });
  }
};

export const reviewMilestone = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== UserRole.MENTOR && req.user.role !== UserRole.ADMIN)) {
      return res.status(403).json({ success: false, message: 'Only mentors and admins can review milestones.' });
    }

    const { milestoneId } = req.params;
    const { status, feedback, rating } = req.body; // status: APPROVED or REVISION_REQUESTED

    const milestone = await prisma.milestone.update({
      where: { milestone_id: milestoneId },
      data: {
        status: status || 'APPROVED',
        feedback: feedback || '',
        rating: rating ? Number(rating) : 5,
        approved_by: req.user.user_id
      },
      include: { project: true }
    });

    // Notify project creator
    await prisma.notification.create({
      data: {
        user_id: milestone.project.created_by,
        type: 'MILESTONE',
        message: `Milestone "${milestone.title}" was ${milestone.status === 'APPROVED' ? 'APPROVED' : 'flagged for revision'}.`
      }
    });

    return res.json({ success: true, message: 'Milestone review submitted!', milestone });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to review milestone.' });
  }
};

export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;
    let title = req.body.title;
    let fileLocation = req.body.file_location;
    let fileSize = 1500000;
    const version = req.body.version || 'v1.0';

    if (req.file) {
      fileLocation = `/uploads/${req.file.filename}`;
      fileSize = req.file.size;
      if (!title || !title.trim()) {
        title = req.file.originalname;
      }
    }

    if (!title || !fileLocation) {
      return res.status(400).json({ success: false, message: 'Please select a file and enter a document title.' });
    }

    const document = await prisma.document.create({
      data: {
        project_id: projectId,
        title,
        uploaded_by: req.user.user_id,
        file_location: fileLocation,
        version,
        file_size: fileSize
      },
      include: { uploader: { select: { name: true } } }
    });

    await logAuditAction(req.user.user_id, 'UPLOAD_DOCUMENT', 'PROJECT', projectId, `Uploaded ${title} (${version})`);

    return res.status(201).json({ success: true, message: 'Document uploaded successfully!', document });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to upload document.' });
  }
};

export const scheduleMeeting = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;
    const { title, scheduled_at, meeting_date, meeting_time, location, meet_link, description } = req.body;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { created_by: true, title: true }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    // STRICT SERVER-SIDE AUTHORIZATION: Only the Project Leader can create meetings
    if (project.created_by !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: '403 Forbidden: Only the Project Leader is authorized to schedule team meetings.'
      });
    }

    // Calculate project-specific meeting number (Meeting 1, Meeting 2, Meeting 3...)
    const meetingCount = await prisma.meeting.count({
      where: { project_id: projectId }
    });
    const meetingNumber = meetingCount + 1;

    // Construct scheduled_at timestamp
    let scheduledDate = new Date();
    if (scheduled_at) {
      scheduledDate = new Date(scheduled_at);
    } else if (meeting_date) {
      const timeStr = meeting_time || '10:00';
      scheduledDate = new Date(`${meeting_date}T${timeStr}:00`);
    }

    const meeting = await prisma.meeting.create({
      data: {
        project_id: projectId,
        meeting_number: meetingNumber,
        host_id: req.user.user_id,
        title: title || `Meeting ${meetingNumber}`,
        description: description || '',
        scheduled_at: scheduledDate,
        location: location || 'Online (Google Meet)',
        meet_link: meet_link || ''
      },
      include: {
        host: { select: { name: true, email: true } }
      }
    });

    await logAuditAction(req.user.user_id, 'SCHEDULE_MEETING', 'PROJECT', projectId, `Scheduled Meeting ${meetingNumber}: ${meeting.title}`);

    return res.status(201).json({
      success: true,
      message: `Meeting ${meetingNumber} scheduled successfully!`,
      meeting
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to schedule meeting.', error: (error as Error).message });
  }
};

export const deleteMeeting = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId, meetingId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { created_by: true }
    });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    // STRICT SERVER-SIDE AUTHORIZATION: Only the Project Leader can delete meetings
    if (project.created_by !== req.user.user_id) {
      return res.status(403).json({
        success: false,
        message: '403 Forbidden: Only the Project Leader is authorized to cancel or delete team meetings.'
      });
    }

    await prisma.meeting.delete({
      where: { meeting_id: meetingId }
    });

    await logAuditAction(req.user.user_id, 'DELETE_MEETING', 'PROJECT', projectId, `Cancelled meeting ${meetingId}`);

    return res.json({ success: true, message: 'Meeting cancelled successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete meeting.' });
  }
};


export const submitEvaluation = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== UserRole.MENTOR && req.user.role !== UserRole.ADMIN)) {
      return res.status(403).json({ success: false, message: 'Evaluations can only be submitted by mentors or admins.' });
    }

    const { projectId } = req.params;
    const { score, feedback, rubric_scores } = req.body;

    const evaluation = await prisma.evaluation.create({
      data: {
        project_id: projectId,
        evaluator_id: req.user.user_id,
        score: Number(score || 85),
        feedback: feedback || '',
        rubric_scores: typeof rubric_scores === 'string' ? rubric_scores : JSON.stringify(rubric_scores || {})
      }
    });

    await logAuditAction(req.user.user_id, 'SUBMIT_EVALUATION', 'PROJECT', projectId, `Submitted final evaluation score: ${score || 85}`);

    return res.status(201).json({ success: true, message: 'Evaluation submitted successfully!', evaluation });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit evaluation.' });
  }
};
