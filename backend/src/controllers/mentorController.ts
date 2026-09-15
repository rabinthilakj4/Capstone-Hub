import { Response } from 'express';
import { UserRole } from 'shared';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { calculateMentorMatchScore, getActiveMatchingWeights } from '../services/matchingEngine';
import { logAuditAction } from '../services/auditLogger';

export const getRecommendedMentors = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let projectId = req.params.projectId || (req.query.projectId as string) || (req.query.project_id as string);

    let project: any = null;
    if (projectId && projectId !== 'project-1') {
      project = await prisma.project.findUnique({
        where: { project_id: projectId },
        include: {
          mentor: { include: { department: true, student_profile: true } },
          mentorship_requests: true
        }
      });
    }

    // Auto-resolve project for student if not explicitly found or if 'project-1' was passed
    if (!project && req.user.role === UserRole.STUDENT) {
      project = await prisma.project.findFirst({
        where: {
          OR: [
            { created_by: req.user.user_id },
            { team: { members: { some: { student_id: req.user.user_id } } } }
          ]
        },
        include: {
          mentor: { include: { department: true, student_profile: true } },
          mentorship_requests: true
        },
        orderBy: { created_at: 'desc' }
      });
      if (project) {
        projectId = project.project_id;
      }
    }

    const userDeptId = req.user.department_id ? Number(req.user.department_id) : undefined;

    // Filter mentors by department
    let mentors: any[] = await prisma.user.findMany({
      where: {
        role: 'MENTOR',
        status: 'ACTIVE',
        ...(userDeptId ? { department_id: userDeptId } : {})
      },
      include: {
        mentor_profile: true,
        department: true,
        student_profile: true
      }
    });

    // If project has an assigned mentor who isn't in mentors list (e.g. cross-department mentor), include them!
    if (project && project.mentor_id && !mentors.some(m => m.user_id === project.mentor_id)) {
      const assignedMentorUser = await prisma.user.findUnique({
        where: { user_id: project.mentor_id },
        include: {
          mentor_profile: true,
          department: true,
          student_profile: true
        }
      });
      if (assignedMentorUser) {
        mentors.push(assignedMentorUser);
      }
    }

    const weights = await getActiveMatchingWeights();

    const formattedProj = project ? {
      required_skills: typeof project.required_skills === 'string' ? JSON.parse(project.required_skills || '[]') : project.required_skills,
      preferred_mentor_expertise: typeof project.preferred_mentor_expertise === 'string' ? JSON.parse(project.preferred_mentor_expertise || '[]') : project.preferred_mentor_expertise,
      domain: project.domain,
      abstract: project.abstract
    } : null;

    const mentorResults = await Promise.all(
      mentors
        .filter(m => m.mentor_profile)
        .map(async (m) => {
          const mp = m.mentor_profile;
          const expertise = typeof mp.expertise === 'string' ? JSON.parse(mp.expertise || '[]') : mp.expertise;
          const researchInterests = typeof mp.research_interests === 'string' ? JSON.parse(mp.research_interests || '[]') : mp.research_interests;

          const activeProjectsCount = await prisma.project.count({
            where: {
              mentor_id: m.user_id,
              status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] }
            }
          });

          const capacity = mp.mentoring_capacity || 5;
          const workloadPercentage = Math.min(100, Math.round((activeProjectsCount / capacity) * 100));
          const remainingCapacity = Math.max(0, capacity - activeProjectsCount);
          const isFullyBooked = activeProjectsCount >= capacity;

          const isAssigned = Boolean(project && project.mentor_id === m.user_id);
          const isRequested = Boolean(project && Array.isArray(project.mentorship_requests) && project.mentorship_requests.some((r: any) => r.mentor_id === m.user_id && r.status === 'PENDING'));

          let scoreResult = { totalScore: 85, breakdown: {} };
          if (formattedProj) {
            const mentorData = {
              expertise,
              research_interests: researchInterests,
              availability: mp.availability,
              mentoring_capacity: capacity,
              current_load: activeProjectsCount,
              department_name: m.department?.department_name || 'Engineering'
            };
            scoreResult = calculateMentorMatchScore(mentorData, formattedProj, weights.mentor);
          }

          return {
            mentor_id: m.user_id,
            user_id: m.user_id,
            staff_id: m.student_id || m.user_id,
            name: m.name,
            email: m.email,
            phone: m.student_profile?.phone || '',
            department: m.department?.department_name || 'Engineering',
            department_id: m.department_id,
            expertise,
            research_interests: researchInterests,
            availability: isAssigned ? 'Assigned Mentor' : isFullyBooked ? 'Fully Booked' : mp.availability,
            mentoring_capacity: capacity,
            current_load: activeProjectsCount,
            activeProjectsCount,
            workloadPercentage,
            remainingCapacity,
            isFullyBooked,
            matchScore: isAssigned ? 100 : scoreResult.totalScore,
            matchBreakdown: scoreResult.breakdown,
            assignment_status: isAssigned ? 'ASSIGNED' : isRequested ? 'REQUESTED' : 'RECOMMENDED',
            isAssigned,
            isRequested
          };
        })
    );

    // Filter out RECOMMENDED mentors with matchScore < 60 (keep ASSIGNED and REQUESTED mentors)
    const filteredMentors = mentorResults.filter(m => {
      if (m.isAssigned || m.isRequested) return true;
      return (m.matchScore || 0) >= 60;
    });

    // Sort: ASSIGNED mentors first, then REQUESTED, then RECOMMENDED by match score
    filteredMentors.sort((a, b) => {
      if (a.isAssigned && !b.isAssigned) return -1;
      if (b.isAssigned && !a.isAssigned) return 1;
      if (a.isRequested && !b.isRequested) return -1;
      if (b.isRequested && !a.isRequested) return 1;
      return (b.matchScore || 0) - (a.matchScore || 0);
    });

    const assignedMentor = filteredMentors.find(m => m.isAssigned) || null;

    return res.json({
      success: true,
      count: filteredMentors.length,
      assignedMentor,
      mentors: filteredMentors
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch recommended mentors.', error: (error as Error).message });
  }
};

export const getAllMentors = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const projectId = req.params.projectId || (req.query.projectId as string) || (req.query.project_id as string);

    let project: any = null;
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { project_id: projectId },
        include: { mentorship_requests: true }
      });
    }

    if (!project && req.user.role === UserRole.STUDENT) {
      project = await prisma.project.findFirst({
        where: {
          OR: [
            { created_by: req.user.user_id },
            { team: { members: { some: { student_id: req.user.user_id } } } }
          ]
        },
        include: { mentorship_requests: true },
        orderBy: { created_at: 'desc' }
      });
    }

    // Fetch all active staff/faculty members across ALL departments (no department filter)
    const mentors: any[] = await prisma.user.findMany({
      where: {
        role: 'MENTOR',
        status: 'ACTIVE'
      },
      include: {
        mentor_profile: true,
        department: true
      },
      orderBy: { name: 'asc' }
    });

    const mentorList = await Promise.all(
      mentors
        .filter(m => m.mentor_profile)
        .map(async (m) => {
          const mp = m.mentor_profile!;
          const expertise = typeof mp.expertise === 'string' ? JSON.parse(mp.expertise || '[]') : mp.expertise;
          const researchInterests = typeof mp.research_interests === 'string' ? JSON.parse(mp.research_interests || '[]') : mp.research_interests;

          // Compute dynamic active projects count from live Project table
          const activeProjectsCount = await prisma.project.count({
            where: {
              mentor_id: m.user_id,
              status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] }
            }
          });

          const capacity = mp.mentoring_capacity || 5;
          const workloadPercentage = Math.min(100, Math.round((activeProjectsCount / capacity) * 100));
          const remainingCapacity = Math.max(0, capacity - activeProjectsCount);
          const isFullyBooked = activeProjectsCount >= capacity;

          const isAssigned = Boolean(project && project.mentor_id === m.user_id);
          const isRequested = Boolean(
            project &&
            Array.isArray(project.mentorship_requests) &&
            project.mentorship_requests.some((r: any) => r.mentor_id === m.user_id && r.status === 'PENDING')
          );

          return {
            mentor_id: m.user_id,
            user_id: m.user_id,
            name: m.name,
            email: m.email,
            department: m.department?.department_name || 'Engineering',
            department_id: m.department_id,
            role: 'Faculty Mentor',
            expertise,
            research_interests: researchInterests,
            availability: isAssigned ? 'Assigned Mentor' : isFullyBooked ? 'Fully Booked' : mp.availability,
            mentoring_capacity: capacity,
            current_load: activeProjectsCount,
            activeProjectsCount,
            workloadPercentage,
            remainingCapacity,
            isFullyBooked,
            isAssigned,
            isRequested
          };
        })
    );

    return res.json({ success: true, count: mentorList.length, mentors: mentorList });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch all mentors.', error: (error as Error).message });
  }
};

export const requestMentorship = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const projectId = req.body.projectId || req.body.project_id;
    const mentorId = req.body.mentorId || req.body.mentor_id || req.body.staffId || req.body.staff_id;

    if (!projectId || !mentorId) {
      return res.status(400).json({ success: false, message: 'Project ID and Mentor ID are required.' });
    }

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
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

    // SERVER-SIDE TEAM LEADER AUTHORIZATION ENFORCEMENT (Rules 2, 3 & 4)
    const isCreator = project.created_by === req.user.user_id;
    const isTeamLeader = project.team?.members.some(
      (m: any) => m.student_id === req.user?.user_id && (m.role === 'Leader' || m.role === 'LEADER')
    );

    if (!isCreator && !isTeamLeader) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only the project Team Leader can assign or request a mentor for this project.'
      });
    }

    // Check if project already has an assigned mentor
    if (project.mentor_id) {
      return res.status(400).json({
        success: false,
        message: 'This project already has an assigned mentor.'
      });
    }

    // Check uniqueness constraint: prevent duplicate PENDING request for same project and mentor
    const existingReq = await prisma.mentorshipRequest.findFirst({
      where: {
        project_id: projectId,
        mentor_id: mentorId,
        status: 'PENDING'
      }
    });

    if (existingReq) {
      return res.status(200).json({
        success: true,
        message: 'A pending mentorship request already exists for this mentor and project.',
        request: existingReq
      });
    }

    const mentorshipReq = await prisma.mentorshipRequest.create({
      data: {
        project_id: projectId,
        mentor_id: mentorId,
        status: 'PENDING',
        response_note: req.body.message || req.body.notes || ''
      },
      include: {
        project: true
      }
    });

    // Notify mentor
    await prisma.notification.create({
      data: {
        user_id: mentorId,
        type: 'MENTORSHIP',
        message: `New mentorship request received from ${req.user.name} for project "${mentorshipReq.project.title}".`
      }
    });

    return res.status(201).json({ success: true, message: 'Mentorship request sent successfully!', request: mentorshipReq });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to send mentorship request.', error: (error as Error).message });
  }
};

export const acceptMentorshipRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ success: false, message: 'Only faculty mentors can accept requests.' });
    }

    const requestId = req.params.requestId || req.params.id;

    // First-Come-First-Accept atomic database transaction locking
    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.mentorshipRequest.findUnique({
        where: { request_id: requestId },
        include: { project: true }
      });

      if (!request) {
        throw new Error('Mentorship request not found.');
      }

      if (request.mentor_id !== req.user!.user_id) {
        throw new Error('Unauthorized to respond to this request.');
      }

      if (request.status !== 'PENDING') {
        throw new Error(`This request is no longer pending (Status: ${request.status}).`);
      }

      // Concurrency check: Verify project has NOT already been accepted by another mentor
      const currentProject = await tx.project.findUnique({
        where: { project_id: request.project_id }
      });

      if (!currentProject) {
        throw new Error('Project not found.');
      }

      if (currentProject.mentor_id) {
        throw new Error('This project has already been accepted by another faculty member.');
      }

      // Check maximum 5 active project capacity cap
      const activeProjectsCount = await tx.project.count({
        where: {
          mentor_id: req.user!.user_id,
          status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] }
        }
      });

      if (activeProjectsCount >= 5) {
        throw new Error('Cannot accept request: You have reached the maximum capacity of 5 active capstone projects.');
      }

      // Assign mentor to project
      await tx.project.update({
        where: { project_id: request.project_id },
        data: { mentor_id: req.user!.user_id }
      });

      // Mark this mentorship request as ACCEPTED
      await tx.mentorshipRequest.update({
        where: { request_id: requestId },
        data: { status: 'ACCEPTED' }
      });

      // Expire all other pending requests for this project across all faculty members
      await tx.mentorshipRequest.updateMany({
        where: {
          project_id: request.project_id,
          request_id: { not: requestId },
          status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
      });

      // Update mentor load
      await tx.mentorProfile.update({
        where: { user_id: req.user!.user_id },
        data: { current_load: activeProjectsCount + 1 }
      }).catch(() => {});

      // Send notification to project creator
      await tx.notification.create({
        data: {
          user_id: currentProject.created_by,
          type: 'MENTORSHIP',
          message: `Prof./Dr. ${req.user!.name} accepted your mentorship request for "${currentProject.title}"!`
        }
      });

      return currentProject;
    });

    await logAuditAction(req.user.user_id, 'ACCEPT_MENTORSHIP', 'PROJECT', result.project_id, `Accepted mentorship for ${result.title}`);

    return res.json({ success: true, message: 'Mentorship request accepted successfully!' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to accept request.' });
  }
};

export const acceptProjectDirectly = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ success: false, message: 'Only faculty mentors can accept projects.' });
    }

    const { projectId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { project_id: projectId }
      });

      if (!project) {
        throw new Error('Project not found.');
      }

      if (project.mentor_id) {
        throw new Error('This project has already been accepted by another faculty member.');
      }

      const activeProjectsCount = await tx.project.count({
        where: {
          mentor_id: req.user!.user_id,
          status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] }
        }
      });

      if (activeProjectsCount >= 5) {
        throw new Error('Cannot accept project: You have reached the maximum capacity of 5 active capstone projects.');
      }

      // Assign mentor
      await tx.project.update({
        where: { project_id: projectId },
        data: { mentor_id: req.user!.user_id }
      });

      // Create or update MentorshipRequest for this mentor & project as ACCEPTED
      const existingReq = await tx.mentorshipRequest.findFirst({
        where: { project_id: projectId, mentor_id: req.user!.user_id }
      });

      if (existingReq) {
        await tx.mentorshipRequest.update({
          where: { request_id: existingReq.request_id },
          data: { status: 'ACCEPTED' }
        });
      } else {
        await tx.mentorshipRequest.create({
          data: {
            project_id: projectId,
            mentor_id: req.user!.user_id,
            status: 'ACCEPTED',
            response_note: 'Accepted directly from department recommendations'
          }
        });
      }

      // Expire all other pending requests for this project across all faculty members
      await tx.mentorshipRequest.updateMany({
        where: {
          project_id: projectId,
          mentor_id: { not: req.user!.user_id },
          status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
      });

      // Update mentor profile current load
      await tx.mentorProfile.update({
        where: { user_id: req.user!.user_id },
        data: { current_load: activeProjectsCount + 1 }
      }).catch(() => {});

      // Notify project creator
      await tx.notification.create({
        data: {
          user_id: project.created_by,
          type: 'MENTORSHIP',
          message: `Prof./Dr. ${req.user!.name} accepted and joined as mentor for your project "${project.title}"!`
        }
      });

      return project;
    });

    await logAuditAction(req.user.user_id, 'ACCEPT_MENTORSHIP_DIRECT', 'PROJECT', projectId, `Accepted mentorship for ${result.title}`);

    return res.json({ success: true, message: 'Project mentorship accepted successfully!' });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to accept project directly.' });
  }
};

export const unassignMentor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // STRICT ROLE CHECK: Only System Administrators can remove/unassign an assigned faculty mentor
    if (req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Once assigned, only System Administrators can remove or change a faculty mentor.'
      });
    }

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.mentor_id) {
      return res.status(400).json({ success: false, message: 'Project does not currently have an assigned faculty mentor.' });
    }

    const previousMentorId = project.mentor_id;

    await prisma.$transaction(async (tx) => {
      // 1. Clear mentor_id on project
      await tx.project.update({
        where: { project_id: projectId },
        data: { mentor_id: null }
      });

      // 2. Mark any associated mentorship requests as REJECTED
      await tx.mentorshipRequest.updateMany({
        where: { project_id: projectId, mentor_id: previousMentorId },
        data: { status: 'REJECTED' }
      });

      // 3. Recalculate mentor active load
      const activeCount = await tx.project.count({
        where: { mentor_id: previousMentorId, status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] } }
      });

      await tx.mentorProfile.update({
        where: { user_id: previousMentorId },
        data: { current_load: Math.max(0, activeCount) }
      }).catch(() => {});

      // 4. Notify creator
      await tx.notification.create({
        data: {
          user_id: project.created_by,
          type: 'MENTORSHIP',
          message: `Faculty mentor assignment for "${project.title}" has been removed.`
        }
      });
    });

    await logAuditAction(req.user.user_id, 'UNASSIGN_MENTOR', 'PROJECT', projectId, `Removed faculty mentor from project ${project.title}`);

    return res.json({ success: true, message: 'Faculty mentor removed successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to unassign faculty mentor.', error: error.message });
  }
};

export const rejectMentorshipRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ success: false, message: 'Only mentors can reject requests.' });
    }

    const requestId = req.params.requestId || req.params.id;
    const { response_note } = req.body;

    const request = await prisma.mentorshipRequest.findUnique({
      where: { request_id: requestId },
      include: { project: true }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.mentor_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to respond to this request.' });
    }

    await prisma.mentorshipRequest.update({
      where: { request_id: requestId },
      data: { status: 'REJECTED', response_note: response_note || '' }
    });

    // Notify project creator
    await prisma.notification.create({
      data: {
        user_id: request.project.created_by,
        type: 'MENTORSHIP',
        message: `Mentorship request for "${request.project.title}" was declined.`
      }
    });

    return res.json({ success: true, message: 'Mentorship request rejected.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reject request.', error: (error as Error).message });
  }
};

export const rejectProjectDirectly = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ success: false, message: 'Only faculty mentors can reject recommended projects.' });
    }

    const { projectId } = req.params;

    const existingReq = await prisma.mentorshipRequest.findFirst({
      where: { project_id: projectId, mentor_id: req.user.user_id }
    });

    if (existingReq) {
      await prisma.mentorshipRequest.update({
        where: { request_id: existingReq.request_id },
        data: { status: 'REJECTED' }
      });
    } else {
      await prisma.mentorshipRequest.create({
        data: {
          project_id: projectId,
          mentor_id: req.user.user_id,
          status: 'REJECTED',
          response_note: 'Declined from department recommendations'
        }
      });
    }

    return res.json({ success: true, message: 'Project removed from recommendations.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to reject project.', error: error.message });
  }
};

export const getMentorAssignedProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ success: false, message: 'Mentor access only.' });
    }

    const projects = await prisma.project.findMany({
      where: { mentor_id: req.user.user_id },
      include: {
        creator: { select: { name: true, email: true, student_id: true, student_profile: true, department: true } },
        team: {
          include: {
            members: {
              include: {
                student: { select: { name: true, email: true, student_id: true, department: true, student_profile: true } }
              }
            }
          }
        },
        milestones: true
      }
    });

    const pendingRequests = await prisma.mentorshipRequest.findMany({
      where: {
        mentor_id: req.user.user_id,
        status: 'PENDING',
        project: { mentor_id: null }
      },
      include: {
        project: {
          include: {
            creator: { select: { name: true, email: true, student_id: true, department: true } },
            team: {
              include: {
                members: {
                  include: { student: { select: { name: true, email: true, student_id: true } } }
                }
              }
            }
          }
        }
      },
      orderBy: { requested_at: 'desc' }
    });

    // Fetch projects created by Team Leaders in the SAME department as the logged-in Mentor
    const mentorDeptId = req.user.department_id ? Number(req.user.department_id) : null;

    // Get project IDs that this mentor has already requested, accepted, rejected, or expired
    const mentorRequests = await prisma.mentorshipRequest.findMany({
      where: { mentor_id: req.user.user_id },
      select: { project_id: true }
    });
    const handledProjectIds = mentorRequests.map(r => r.project_id);

    let recommendedProjects: any[] = [];
    if (mentorDeptId) {
      const deptProjects = await prisma.project.findMany({
        where: {
          mentor_id: null,
          status: { in: ['PENDING', 'PUBLISHED'] },
          project_id: { notIn: handledProjectIds },
          creator: {
            department_id: mentorDeptId
          }
        },
        include: {
          creator: { select: { name: true, email: true, student_id: true, department: true } },
          team: {
            include: {
              members: {
                include: { student: { select: { name: true, email: true, student_id: true } } }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
      recommendedProjects = deptProjects;
    }

    return res.json({
      success: true,
      count: projects.length,
      projects,
      pendingRequests,
      recommendedProjects
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch assigned projects.', error: (error as Error).message });
  }
};

export const getAllStudentProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.MENTOR) {
      return res.status(403).json({ success: false, message: 'Only faculty mentors can access student projects.' });
    }

    const { search, department_id, domain, academic_year, status, mentor_status } = req.query;

    const projects = await prisma.project.findMany({
      include: {
        creator: {
          select: {
            user_id: true,
            student_id: true,
            name: true,
            email: true,
            department: { select: { department_id: true, department_name: true } },
            student_profile: true
          }
        },
        mentor: {
          select: {
            user_id: true,
            name: true,
            email: true,
            department: { select: { department_id: true, department_name: true } }
          }
        },
        target_department: { select: { department_id: true, department_name: true } },
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
                    department: { select: { department_id: true, department_name: true } },
                    student_profile: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const parseJsonArray = (val: any) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
      return [];
    };

    let formattedProjects = projects.map(p => {
      const leaderName = p.creator?.name || 'Student Leader';
      const leaderRegisterNumber = p.creator?.student_id || 'N/A';
      const departmentName = p.creator?.department?.department_name || p.target_department?.department_name || 'Engineering';
      const academicYear = p.creator?.student_profile?.year || 'IV Year';
      const mentorStatus = p.mentor_id ? 'Mentor Assigned' : 'Mentor Needed';
      const currentTeamSize = p.team ? p.team.members.length : 1;
      const maxTeamSize = p.team_size || 4;

      const teamMembers = p.team ? p.team.members.map(m => ({
        user_id: m.student?.user_id,
        name: m.student?.name || 'Student Member',
        register_number: m.student?.student_id || 'N/A',
        role: m.role || 'Member',
        department_name: m.student?.department?.department_name || departmentName,
        academic_year: m.student?.student_profile?.year || academicYear
      })) : [{
        user_id: p.creator?.user_id,
        name: leaderName,
        register_number: leaderRegisterNumber,
        role: 'Leader',
        department_name: departmentName,
        academic_year: academicYear
      }];

      return {
        project_id: p.project_id,
        project_code: p.project_code,
        team_code: p.team?.team_code || null,
        title: p.title,
        abstract: p.abstract,
        problem_statement: p.problem_statement,
        proposed_solution: p.proposed_solution,
        domain: p.domain,
        description: p.description || p.abstract,
        objectives: parseJsonArray(p.objectives),
        required_skills: parseJsonArray(p.required_skills),
        required_departments: parseJsonArray(p.required_departments),
        eligible_years: parseJsonArray(p.eligible_years),
        technologies: parseJsonArray(p.technologies),
        hardware_requirements: p.hardware_requirements || 'None',
        expected_outcome: p.expected_outcome,
        duration: p.duration,
        difficulty_level: p.difficulty_level,
        preferred_mentor_expertise: parseJsonArray(p.preferred_mentor_expertise),
        status: p.status,
        created_at: p.created_at,
        creator_user_id: p.creator?.user_id,
        leader_name: leaderName,
        leader_register_number: leaderRegisterNumber,
        department_id: p.creator?.department?.department_id || p.target_department_id,
        department_name: departmentName,
        academic_year: academicYear,
        mentor_id: p.mentor_id,
        mentor_name: p.mentor?.name || null,
        mentor_status: mentorStatus,
        current_team_size: currentTeamSize,
        max_team_size: maxTeamSize,
        team_members: teamMembers
      };
    });

    // In-memory search & filter application if query params present
    if (search) {
      const q = String(search).toLowerCase().trim();
      formattedProjects = formattedProjects.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.leader_name.toLowerCase().includes(q) ||
        p.domain.toLowerCase().includes(q) ||
        p.abstract.toLowerCase().includes(q) ||
        (p.project_code && p.project_code.toLowerCase().includes(q)) ||
        (p.team_code && p.team_code.toLowerCase().includes(q))
      );
    }

    if (department_id && String(department_id) !== 'ALL') {
      formattedProjects = formattedProjects.filter(p =>
        String(p.department_id) === String(department_id) ||
        p.department_name.toLowerCase() === String(department_id).toLowerCase()
      );
    }

    if (domain && String(domain) !== 'ALL') {
      formattedProjects = formattedProjects.filter(p =>
        p.domain.toLowerCase() === String(domain).toLowerCase()
      );
    }

    if (academic_year && String(academic_year) !== 'ALL') {
      formattedProjects = formattedProjects.filter(p =>
        p.academic_year.toLowerCase() === String(academic_year).toLowerCase()
      );
    }

    if (mentor_status && String(mentor_status) !== 'ALL') {
      formattedProjects = formattedProjects.filter(p =>
        p.mentor_status.toLowerCase() === String(mentor_status).toLowerCase()
      );
    }

    if (status && String(status) !== 'ALL') {
      formattedProjects = formattedProjects.filter(p =>
        p.status.toLowerCase() === String(status).toLowerCase()
      );
    }

    return res.json({
      success: true,
      count: formattedProjects.length,
      projects: formattedProjects
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch student projects.', error: error.message });
  }
};


