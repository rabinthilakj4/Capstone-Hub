import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { logAuditAction } from '../services/auditLogger';

export const getSystemStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
    const totalFaculty = await prisma.user.count({ where: { role: 'MENTOR' } });
    const totalDepartments = await prisma.department.count();
    const totalProjects = await prisma.project.count();
    const pendingProjectsCount = await prisma.project.count({ where: { status: 'PENDING' } });

    // Project Requests Counts (Cross-Department Sharing Requests)
    const pendingRequestsCount = await prisma.notification.count({
      where: { type: 'PROJECT_INVITE', status: 'PENDING' }
    });

    const acceptedProjectsCount = await prisma.project.count({ where: { status: 'PUBLISHED' } });
    const rejectedProjectsCount = await prisma.project.count({ where: { status: 'REJECTED' } });

    // Mentor utilization
    const mentors = await prisma.mentorProfile.findMany();
    let totalCap = 0;
    let totalLoad = 0;
    mentors.forEach(m => {
      totalCap += m.mentoring_capacity;
      totalLoad += m.current_load;
    });
    const mentorUtilization = totalCap === 0 ? 0 : Math.round((totalLoad / totalCap) * 100);

    // Department Breakdown
    const depts = await prisma.department.findMany({
      include: {
        users: {
          where: {
            role: { in: ['STUDENT', 'MENTOR'] },
            status: 'ACTIVE',
            profile_completed: true
          }
        }
      }
    });

    const departmentCounts = depts.map(d => ({
      department_id: d.department_id,
      department_name: d.department_name,
      department_code: d.department_code,
      count: d.users.length
    }));

    return res.json({
      success: true,
      stats: {
        totalStudents,
        totalFaculty,
        totalDepartments,
        totalProjects,
        pendingProjectRequests: pendingRequestsCount + pendingProjectsCount,
        acceptedProjects: acceptedProjectsCount,
        rejectedProjects: rejectedProjectsCount,
        mentorUtilization,
        departmentCounts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch admin stats.' });
  }
};

export const getAdminStudents = async (req: AuthRequest, res: Response) => {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      include: {
        department: true,
        student_profile: true
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = students.map(s => {
      let skillsArray: string[] = [];
      let interestsArray: string[] = [];
      try {
        if (s.student_profile?.skills) {
          skillsArray = typeof s.student_profile.skills === 'string' ? JSON.parse(s.student_profile.skills) : s.student_profile.skills;
        }
      } catch (e) {}
      try {
        if (s.student_profile?.interests) {
          interestsArray = typeof s.student_profile.interests === 'string' ? JSON.parse(s.student_profile.interests) : s.student_profile.interests;
        }
      } catch (e) {}

      return {
        user_id: s.user_id,
        register_number: s.student_id || 'N/A',
        name: s.name,
        email: s.email,
        department_id: s.department_id,
        department_name: s.department?.department_name || 'Engineering',
        year: s.student_profile?.year || '1st Year',
        phone: s.student_profile?.phone || 'N/A',
        skills: Array.isArray(skillsArray) ? skillsArray : [],
        interests: Array.isArray(interestsArray) ? interestsArray : [],
        status: s.status,
        created_at: s.created_at
      };
    });

    return res.json({ success: true, count: formatted.length, students: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
};

export const getAdminFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'MENTOR' },
      include: {
        department: true,
        mentor_profile: true
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = faculty.map(f => {
      let expertiseArray: string[] = [];
      try {
        if (f.mentor_profile?.expertise) {
          expertiseArray = JSON.parse(f.mentor_profile.expertise);
        }
      } catch (e) {}

      return {
        user_id: f.user_id,
        name: f.name,
        email: f.email,
        department_id: f.department_id,
        department_name: f.department?.department_name || 'Engineering',
        designation: expertiseArray.length > 0 ? expertiseArray.join(', ') : 'Faculty Mentor',
        status: f.status,
        capacity: f.mentor_profile?.mentoring_capacity || 5,
        current_load: f.mentor_profile?.current_load || 0,
        created_at: f.created_at
      };
    });

    return res.json({ success: true, count: formatted.length, faculty: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch faculty.' });
  }
};

export const getAdminDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const depts = await prisma.department.findMany({
      include: {
        users: {
          where: {
            role: { in: ['STUDENT', 'MENTOR'] },
            status: 'ACTIVE',
            profile_completed: true
          }
        }
      },
      orderBy: { department_id: 'asc' }
    });

    const formatted = depts.map(d => ({
      department_id: d.department_id,
      department_code: d.department_code || `DEPT-${d.department_id}`,
      department_name: d.department_name,
      status: d.status || 'ACTIVE',
      total_users: d.users.length
    }));

    return res.json({ success: true, count: formatted.length, departments: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
};

export const getAdminProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      include: {
        creator: {
          include: { department: true }
        },
        mentor: {
          select: { name: true, email: true }
        },
        target_department: {
          select: { department_id: true, department_name: true }
        },
        team: true
      },
      orderBy: { created_at: 'desc' }
    });

    // Fetch department list to map department IDs in required_departments
    const depts = await prisma.department.findMany({ orderBy: { department_id: 'asc' } });
    const deptMap = new Map<number, string>();
    depts.forEach(d => deptMap.set(d.department_id, d.department_name));

    const formatted = projects.map(p => {
      let reqDepts: any[] = [];
      try {
        const parsed = JSON.parse(p.required_departments || '[]');
        reqDepts = parsed.map((id: any) => deptMap.get(Number(id)) || `Dept ${id}`);
      } catch (e) {}

      let targetDeptName = p.target_department?.department_name;
      if (!targetDeptName && p.target_department_id) {
        targetDeptName = deptMap.get(p.target_department_id);
      }

      return {
        project_id: p.project_id,
        project_code: p.project_code,
        team_code: p.team?.team_code || null,
        title: p.title,
        description: p.description || p.abstract,
        owner_name: p.creator?.name || 'Unknown',
        owner_email: p.creator?.email || 'N/A',
        owner_department: p.creator?.department?.department_name || 'N/A',
        target_department_id: p.target_department_id,
        target_department_name: targetDeptName || null,
        target_departments: targetDeptName || (reqDepts.length > 0 ? reqDepts.join(', ') : 'All Departments'),
        mentor_name: p.mentor?.name || 'No Faculty Assigned',
        status: p.status,
        created_at: p.created_at
      };
    });

    return res.json({ success: true, count: formatted.length, projects: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch projects.' });
  }
};

export const getAdminProjectRequests = async (req: AuthRequest, res: Response) => {
  try {
    const requests = await prisma.notification.findMany({
      where: { type: 'PROJECT_INVITE' },
      include: {
        user: {
          include: { department: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Populate project and sender details for each request
    const formatted = await Promise.all(
      requests.map(async r => {
        let projectTitle = 'Shared Project';
        let senderName = 'Student User';
        let senderDept = 'Department';

        if (r.project_id) {
          const proj = await prisma.project.findUnique({
            where: { project_id: r.project_id },
            include: { creator: { include: { department: true } } }
          });
          if (proj) {
            projectTitle = proj.title;
            senderName = proj.creator?.name || 'Student User';
            senderDept = proj.creator?.department?.department_name || 'Department';
          }
        }

        return {
          request_id: r.notification_id,
          project_id: r.project_id,
          project_title: projectTitle,
          sender_name: senderName,
          sender_department: senderDept,
          target_department: r.user?.department?.department_name || 'Target Department',
          recipient_user: r.user?.name,
          status: r.status, // PENDING, ACCEPTED, REJECTED
          message: r.message,
          created_at: r.created_at
        };
      })
    );

    return res.json({ success: true, count: formatted.length, requests: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch project requests.' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, search, year } = req.query;

    const whereClause: any = {};
    if (role) whereClause.role = String(role);
    if (year && year !== 'All') {
      whereClause.student_profile = { year: String(year) };
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: String(search) } },
        { email: { contains: String(search) } }
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        department: true,
        student_profile: true,
        mentor_profile: true
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = users.map(u => ({
      ...u,
      student_profile: u.student_profile ? {
        ...u.student_profile,
        skills: typeof u.student_profile.skills === 'string' ? JSON.parse(u.student_profile.skills || '[]') : u.student_profile.skills,
        interests: typeof u.student_profile.interests === 'string' ? JSON.parse(u.student_profile.interests || '[]') : u.student_profile.interests
      } : null,
      mentor_profile: u.mentor_profile ? {
        ...u.mentor_profile,
        expertise: typeof u.mentor_profile.expertise === 'string' ? JSON.parse(u.mentor_profile.expertise || '[]') : u.mentor_profile.expertise
      } : null
    }));

    return res.json({ success: true, count: formatted.length, users: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
};

export const toggleUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { userId } = req.params;
    const { status } = req.body; // ACTIVE or INACTIVE

    const user = await prisma.user.update({
      where: { user_id: userId },
      data: { status }
    });

    await logAuditAction(req.user.user_id, 'TOGGLE_USER_STATUS', 'USER', userId, `Changed status to ${status}`);

    return res.json({ success: true, message: `User status changed to ${status}`, user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to toggle user status.' });
  }
};

export const getPendingProjects = async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'PENDING' },
      include: {
        creator: { select: { name: true, email: true, department: true } }
      },
      orderBy: { created_at: 'asc' }
    });

    return res.json({ success: true, count: projects.length, projects });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending projects.' });
  }
};

export const reviewProjectApproval = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;
    const { action } = req.body; // APPROVE, REJECT

    let status = 'PUBLISHED';
    if (action === 'REJECT') status = 'REJECTED';

    const project = await prisma.project.update({
      where: { project_id: projectId },
      data: { status }
    });

    await prisma.notification.create({
      data: {
        user_id: project.created_by,
        type: 'PROJECT',
        message: `Your project "${project.title}" has been ${status === 'PUBLISHED' ? 'APPROVED' : status}.`
      }
    });

    await logAuditAction(req.user.user_id, 'PROJECT_APPROVAL', 'PROJECT', projectId, `Project approval action: ${action}`);

    return res.json({ success: true, message: `Project ${status === 'PUBLISHED' ? 'Approved' : action}`, project });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process project approval.' });
  }
};

export const getMatchingWeightsSetting = async (req: AuthRequest, res: Response) => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'MATCHING_WEIGHTS' }
    });
    const value = setting ? JSON.parse(setting.value) : null;
    return res.json({ success: true, weights: value });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
};

export const updateMatchingWeightsSetting = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { team, mentor } = req.body;

    const setting = await prisma.systemSetting.upsert({
      where: { key: 'MATCHING_WEIGHTS' },
      create: { key: 'MATCHING_WEIGHTS', value: JSON.stringify({ team, mentor }) },
      update: { value: JSON.stringify({ team, mentor }) }
    });

    await logAuditAction(req.user.user_id, 'UPDATE_MATCHING_WEIGHTS', 'SYSTEM', 'MATCHING_WEIGHTS', 'Updated matching weight configuration');

    return res.json({ success: true, message: 'Matching weights updated!', weights: JSON.parse(setting.value) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update matching weights.' });
  }
};

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, role: true } } },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    return res.json({ success: true, logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

export const createDepartment = async (req: AuthRequest, res: Response) => {
  try {
    const { department_name, department_code } = req.body;
    if (!department_name) return res.status(400).json({ success: false, message: 'Department name is required.' });

    const dept = await prisma.department.create({
      data: {
        department_name,
        department_code: department_code || department_name.substring(0, 5).toUpperCase()
      }
    });

    return res.status(201).json({ success: true, message: 'Department created!', department: dept });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create department.' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { userId } = req.params;

    if (userId === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { user_id: userId },
      select: { name: true, email: true, role: true }
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Unassign any mentored projects to prevent foreign key issues and reflect "No Faculty Assigned"
    await prisma.project.updateMany({
      where: { mentor_id: userId },
      data: { mentor_id: null }
    });

    // Cleanup pending registrations and OTP verification records for the email if present
    await prisma.pendingRegistration.deleteMany({ where: { email: existingUser.email } }).catch(() => {});
    await prisma.otpVerification.deleteMany({ where: { email: existingUser.email } }).catch(() => {});

    await prisma.user.delete({ where: { user_id: userId } });

    await logAuditAction(
      req.user.user_id,
      'DELETE_USER',
      'USER',
      userId,
      `Permanently deleted user ${existingUser.name} (${existingUser.email}) [${existingUser.role}]`
    );

    return res.json({
      success: true,
      message: `User ${existingUser.name} (${existingUser.email}) deleted successfully.`
    });
  } catch (error: any) {
    console.error('Failed to delete user:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete user due to a server error.'
    });
  }
};

export const getAdminMessages = async (req: AuthRequest, res: Response) => {
  try {
    const messages = await prisma.message.findMany({
      include: {
        sender: { select: { user_id: true, name: true, email: true, role: true } },
        project: { select: { project_id: true, title: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = messages.map(m => ({
      message_id: m.message_id,
      sender_id: m.sender_id,
      sender_name: m.sender?.name || 'Unknown',
      sender_email: m.sender?.email || 'N/A',
      sender_role: m.sender?.role || 'N/A',
      project_id: m.project_id,
      project_title: m.project?.title || 'General',
      content: m.content,
      created_at: m.created_at
    }));

    return res.json({ success: true, count: formatted.length, messages: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { messageId } = req.params;

    const existingMessage = await prisma.message.findUnique({
      where: { message_id: messageId }
    });

    if (!existingMessage) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    await prisma.message.delete({ where: { message_id: messageId } });

    await logAuditAction(
      req.user.user_id,
      'DELETE_MESSAGE',
      'MESSAGE',
      messageId,
      `Deleted message ID ${messageId}`
    );

    return res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;

    const existingProject = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { title: true }
    });

    if (!existingProject) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    await prisma.project.delete({ where: { project_id: projectId } });

    await logAuditAction(
      req.user.user_id,
      'DELETE_PROJECT',
      'PROJECT',
      projectId,
      `Deleted project "${existingProject.title}"`
    );

    return res.json({ success: true, message: `Project "${existingProject.title}" deleted successfully.` });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
};

export const adminUnassignMentor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: { mentor: true }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (!project.mentor_id) {
      return res.status(400).json({ success: false, message: 'Project does not currently have an assigned faculty mentor.' });
    }

    const previousMentorId = project.mentor_id;
    const previousMentorName = project.mentor?.name || 'Faculty Member';

    await prisma.$transaction(async (tx) => {
      // 1. Clear mentor_id on project
      await tx.project.update({
        where: { project_id: projectId },
        data: { mentor_id: null }
      });

      // 2. Mark any associated mentorship requests for this mentor & project as REJECTED
      await tx.mentorshipRequest.updateMany({
        where: { project_id: projectId, mentor_id: previousMentorId },
        data: { status: 'REJECTED' }
      });

      // 3. Recalculate previous mentor active load
      const activeCount = await tx.project.count({
        where: { mentor_id: previousMentorId, status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] } }
      });

      await tx.mentorProfile.update({
        where: { user_id: previousMentorId },
        data: { current_load: Math.max(0, activeCount) }
      }).catch(() => {});

      // 4. Notify creator and previous mentor
      await tx.notification.create({
        data: {
          user_id: project.created_by,
          type: 'MENTORSHIP',
          message: `System Administrator removed faculty mentor (${previousMentorName}) from your project "${project.title}".`
        }
      });

      await tx.notification.create({
        data: {
          user_id: previousMentorId,
          type: 'MENTORSHIP',
          message: `System Administrator unassigned you from project "${project.title}".`
        }
      });
    });

    await logAuditAction(
      req.user.user_id,
      'ADMIN_UNASSIGN_MENTOR',
      'PROJECT',
      projectId,
      `Admin unassigned faculty mentor ${previousMentorName} (${previousMentorId}) from project "${project.title}"`
    );

    return res.json({
      success: true,
      message: `Faculty mentor ${previousMentorName} removed successfully from "${project.title}".`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to unassign mentor.', error: error.message });
  }
};

export const adminAssignMentor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;
    const mentorId = req.body.mentorId || req.body.mentor_id;

    if (!mentorId) {
      return res.status(400).json({ success: false, message: 'Mentor ID is required.' });
    }

    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    if (project.mentor_id) {
      return res.status(400).json({
        success: false,
        message: 'Project already has an assigned faculty mentor. Remove the current mentor first.'
      });
    }

    const targetMentor = await prisma.user.findUnique({
      where: { user_id: mentorId, role: 'MENTOR' },
      include: { mentor_profile: true }
    });

    if (!targetMentor) {
      return res.status(404).json({ success: false, message: 'Faculty mentor user not found.' });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Assign mentor_id to project
      await tx.project.update({
        where: { project_id: projectId },
        data: { mentor_id: mentorId }
      });

      // 2. Create or update MentorshipRequest as ACCEPTED
      const existingReq = await tx.mentorshipRequest.findFirst({
        where: { project_id: projectId, mentor_id: mentorId }
      });

      if (existingReq) {
        await tx.mentorshipRequest.update({
          where: { request_id: existingReq.request_id },
          data: { status: 'ACCEPTED', response_note: 'Assigned by System Administrator' }
        });
      } else {
        await tx.mentorshipRequest.create({
          data: {
            project_id: projectId,
            mentor_id: mentorId,
            status: 'ACCEPTED',
            response_note: 'Assigned directly by System Administrator'
          }
        });
      }

      // 3. Expire all other pending requests for this project
      await tx.mentorshipRequest.updateMany({
        where: {
          project_id: projectId,
          mentor_id: { not: mentorId },
          status: 'PENDING'
        },
        data: { status: 'EXPIRED' }
      });

      // 4. Update mentor profile current_load
      const activeCount = await tx.project.count({
        where: { mentor_id: mentorId, status: { notIn: ['COMPLETED', 'ARCHIVED', 'REJECTED'] } }
      });

      await tx.mentorProfile.update({
        where: { user_id: mentorId },
        data: { current_load: activeCount }
      }).catch(() => {});

      // 5. Notify creator & new mentor
      await tx.notification.create({
        data: {
          user_id: project.created_by,
          type: 'MENTORSHIP',
          message: `System Administrator assigned Prof./Dr. ${targetMentor.name} as mentor for your project "${project.title}".`
        }
      });

      await tx.notification.create({
        data: {
          user_id: mentorId,
          type: 'MENTORSHIP',
          message: `System Administrator assigned you as mentor for project "${project.title}".`
        }
      });
    });

    await logAuditAction(
      req.user.user_id,
      'ADMIN_ASSIGN_MENTOR',
      'PROJECT',
      projectId,
      `Admin assigned faculty mentor ${targetMentor.name} (${mentorId}) to project "${project.title}"`
    );

    return res.json({
      success: true,
      message: `Faculty mentor ${targetMentor.name} assigned successfully to "${project.title}".`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to assign mentor.', error: error.message });
  }
};
