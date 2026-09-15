import { Response } from 'express';
import { ProjectStatus, UserRole } from 'shared';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { calculateTeamMatchScore, getActiveMatchingWeights } from '../services/matchingEngine';
import { detectProjectSimilarity } from '../services/similarityEngine';
import { STANDARD_MILESTONES } from 'shared';
import { resolveDepartment } from '../utils/departmentResolver';
import { isYearEligible, isDepartmentEligible } from '../utils/academicYearUtils';
import { getNextProjectAndTeamCode } from '../utils/projectCodeUtils';


export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    if (req.user.role !== UserRole.STUDENT) {
      return res.status(403).json({ success: false, message: 'Only students can create projects.' });
    }

    const {
      title,
      abstract,
      problem_statement,
      proposed_solution,
      domain,
      description,
      objectives,
      required_skills,
      required_departments,
      eligible_years,
      target_department_id,
      team_size,
      technologies,
      hardware_requirements,
      expected_outcome,
      duration,
      difficulty_level,
      preferred_mentor_expertise
    } = req.body;

    if (!title || !abstract || !problem_statement || !proposed_solution || !domain) {
      return res.status(400).json({ success: false, message: 'Please provide all mandatory project details.' });
    }

    // Helper to normalize array or JSON string input
    const parseArrayInput = (input: any): any[] => {
      if (Array.isArray(input)) return input;
      if (typeof input === 'string') {
        try {
          const parsed = JSON.parse(input);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
      return [];
    };

    const parsedDepts = parseArrayInput(required_departments);
    const parsedYears = parseArrayInput(eligible_years);
    const parsedSkills = parseArrayInput(required_skills);
    const parsedObjectives = parseArrayInput(objectives);
    const parsedTechnologies = parseArrayInput(technologies);
    const parsedMentorExp = parseArrayInput(preferred_mentor_expertise);

    // Resolve target department IDs
    let resolvedTargetDeptId: number | null = null;
    let targetDeptIds: number[] = [];

    if (parsedDepts.length > 0) {
      for (const deptItem of parsedDepts) {
        const resolved = await resolveDepartment(deptItem);
        if (resolved && !targetDeptIds.includes(resolved.department_id)) {
          targetDeptIds.push(resolved.department_id);
        }
      }
      if (targetDeptIds.length > 0) {
        resolvedTargetDeptId = targetDeptIds[0];
      }
    } else if (target_department_id !== undefined && target_department_id !== null && target_department_id !== '') {
      const resolved = await resolveDepartment(target_department_id);
      if (resolved) {
        resolvedTargetDeptId = resolved.department_id;
        targetDeptIds.push(resolved.department_id);
      }
    }

    // Default target department to creator's department if none explicitly selected
    if (targetDeptIds.length === 0 && req.user.department_id) {
      const userDept = Number(req.user.department_id);
      if (!isNaN(userDept)) {
        targetDeptIds.push(userDept);
        resolvedTargetDeptId = userDept;
      }
    }

    // Similarity Check
    const similarityResult = await detectProjectSimilarity(title, abstract);

    // Generate atomic sequential human-readable Project ID & Team ID (e.g. P#0001 & T#0001)
    const { projectCode, teamCode } = await getNextProjectAndTeamCode();

    // Initial status: PUBLISHED
    const project = await prisma.project.create({
      data: {
        project_code: projectCode,
        title,
        abstract,
        problem_statement,
        proposed_solution,
        domain,
        description: description || abstract,
        objectives: JSON.stringify(parsedObjectives),
        required_skills: JSON.stringify(parsedSkills),
        required_departments: JSON.stringify(targetDeptIds),
        eligible_years: JSON.stringify(parsedYears),
        target_department_id: resolvedTargetDeptId,
        team_size: Number(team_size || 4),
        technologies: JSON.stringify(parsedTechnologies),
        hardware_requirements: hardware_requirements || 'None',
        expected_outcome: expected_outcome || 'Working prototype & report',
        duration: duration || '1 Semester',
        difficulty_level: difficulty_level || 'Intermediate',
        preferred_mentor_expertise: JSON.stringify(parsedMentorExp),
        status: 'PUBLISHED',
        created_by: req.user.user_id,
        team: {
          create: {
            team_code: teamCode,
            status: 'ACTIVE',
            members: {
              create: [{ student_id: req.user.user_id, role: 'Leader' }]
            }
          }
        }
      },
      include: {
        creator: { select: { name: true, email: true } },
        target_department: true,
        team: true
      }
    });

    // Send department-targeted notifications to students matching target departments
    if (targetDeptIds.length > 0) {
      const matchingStudents = await prisma.user.findMany({
        where: {
          department_id: { in: targetDeptIds },
          user_id: { not: req.user.user_id },
          role: UserRole.STUDENT
        },
        select: { user_id: true }
      });

      if (matchingStudents.length > 0) {
        await prisma.notification.createMany({
          data: matchingStudents.map(s => ({
            user_id: s.user_id,
            type: 'PROJECT_INVITE',
            project_id: project.project_id,
            status: 'PENDING',
            message: `New project invitation: "${project.title}" looking for team members from your department.`
          }))
        });
      }
    }

    // Automatically initialize standard project milestones
    const now = new Date();
    for (const ms of STANDARD_MILESTONES) {
      const deadline = new Date(now.getTime() + ms.deadlineDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await prisma.milestone.create({
        data: {
          project_id: project.project_id,
          title: ms.title,
          deadline,
          status: 'PENDING'
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Project created successfully and published!',
      project,
      similarityWarning: similarityResult.isHighRiskDuplicate ? similarityResult : null
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create project.', error: (error as Error).message });
  }
};

export const getPublishedProjects = async (req: AuthRequest, res: Response) => {
  try {
    const { search, domain, difficulty } = req.query;

    const whereClause: any = {
      status: { in: ['PUBLISHED', 'PENDING', 'PROPOSED', 'APPROVED'] }
    };

    if (search) {
      whereClause.OR = [
        { title: { contains: String(search), mode: 'insensitive' } },
        { abstract: { contains: String(search), mode: 'insensitive' } },
        { domain: { contains: String(search), mode: 'insensitive' } },
        { project_code: { contains: String(search), mode: 'insensitive' } },
        { team: { team_code: { contains: String(search), mode: 'insensitive' } } }
      ];
    }

    if (domain) {
      whereClause.domain = { contains: String(domain), mode: 'insensitive' };
    }

    if (difficulty) {
      whereClause.difficulty_level = String(difficulty);
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            user_id: true,
            name: true,
            email: true,
            department: { select: { department_id: true, department_name: true } }
          }
        },
        mentor: { select: { user_id: true, name: true, email: true } },
        target_department: { select: { department_id: true, department_name: true } },
        team: {
          include: {
            members: {
              include: {
                student: { select: { user_id: true, name: true } }
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const userDeptId = req.user?.department_id ? Number(req.user.department_id) : null;
    const userId = req.user?.user_id;

    // Fetch user's student profile for year filtering
    let studentYear = '';
    if (userId && req.user?.role === UserRole.STUDENT) {
      const stdProf = await prisma.studentProfile.findUnique({
        where: { user_id: userId }
      });
      studentYear = stdProf?.year || '';
    }

    // Fetch user join requests
    const userJoinReqs = userId ? await prisma.joinRequest.findMany({
      where: { student_id: userId }
    }) : [];
    const joinReqMap = new Map(userJoinReqs.map(r => [r.project_id, r.status]));

    // Filter projects based on normalized eligibility rules
    const filteredProjects = projects.filter(p => {
      // 1. Exclude projects created by the logged-in user (Leader)
      if (userId && p.created_by === userId) return false;

      // 2. Exclude projects where user is already a team member
      const isMember = p.team?.members.some(m => m.student_id === userId);
      if (isMember) return false;

      // 3. Department Targeting Filter
      if (userDeptId && req.user?.role === UserRole.STUDENT) {
        const creatorDeptId = p.creator?.department?.department_id || null;
        const deptOk = isDepartmentEligible(
          userDeptId,
          creatorDeptId,
          p.target_department_id,
          p.required_departments
        );
        if (!deptOk) return false;
      }

      // 4. Eligible Year Filter
      if (studentYear && req.user?.role === UserRole.STUDENT) {
        const yearOk = isYearEligible(studentYear, p.eligible_years);
        if (!yearOk) return false;
      }

      return true;
    });


    // Format output
    let results = filteredProjects.map(p => ({
      ...p,
      objectives: JSON.parse(p.objectives || '[]'),
      required_skills: JSON.parse(p.required_skills || '[]'),
      required_departments: JSON.parse(p.required_departments || '[]').map((id: any) => Number(id)).filter((id: number) => !isNaN(id)),
      eligible_years: JSON.parse(p.eligible_years || '[]'),
      technologies: JSON.parse(p.technologies || '[]'),
      preferred_mentor_expertise: JSON.parse(p.preferred_mentor_expertise || '[]'),
      leader_name: p.creator?.name || 'Project Leader',
      department_name: p.creator?.department?.department_name || 'Department',
      target_department_id: p.target_department_id,
      target_department_name: p.target_department?.department_name || null,
      user_join_request_status: joinReqMap.get(p.project_id) || 'NONE'
    }));

    if (req.user && req.user.role === UserRole.STUDENT) {
      const student = await prisma.user.findUnique({
        where: { user_id: req.user.user_id },
        include: { student_profile: true, department: true }
      });

      if (student && student.student_profile) {
        const weights = await getActiveMatchingWeights();
        const stdProfile = {
          skills: JSON.parse(student.student_profile.skills || '[]'),
          interests: JSON.parse(student.student_profile.interests || '[]'),
          preferred_domains: JSON.parse(student.student_profile.preferred_domains || '[]'),
          availability: student.student_profile.availability,
          department_name: student.department?.department_name || ''
        };

        results = results.map(p => {
          const matchResult = calculateTeamMatchScore(stdProfile, p, weights.team);
          return {
            ...p,
            match_score: matchResult.totalScore,
            match_breakdown: matchResult.breakdown
          };
        }).sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
      }
    }

    return res.json({ success: true, count: results.length, projects: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch projects.', error: (error as Error).message });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        creator: { select: { user_id: true, student_id: true, name: true, email: true, department: true, student_profile: true } },
        mentor: { select: { user_id: true, name: true, email: true, department: true, mentor_profile: true } },
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
                    department: true,
                    student_profile: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const targetDeptIds: number[] = JSON.parse(project.required_departments || '[]').map((id: any) => Number(id)).filter((id: number) => !isNaN(id));
    if (project.target_department_id && !targetDeptIds.includes(project.target_department_id)) {
      targetDeptIds.push(project.target_department_id);
    }
    const isCreator = req.user?.user_id === project.created_by;
    const isAdmin = req.user?.role === UserRole.ADMIN;
    const isMentor = req.user?.user_id === project.mentor_id;
    const isFaculty = req.user?.role === UserRole.MENTOR;
    const isMatchingDept = Boolean(req.user?.department_id && (
      (project.target_department_id && Number(req.user.department_id) === project.target_department_id) ||
      targetDeptIds.includes(Number(req.user.department_id))
    ));

    // Department Security Access Control Check
    if (!isCreator && !isAdmin && !isMentor && !isFaculty && targetDeptIds.length > 0 && !isMatchingDept) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This project request is restricted to specific departments.'
      });
    }

    let user_request_status = 'NONE';
    if (req.user) {
      const isMember = project.team?.members.some(m => m.student_id === req.user?.user_id);
      if (isCreator) {
        user_request_status = 'LEADER';
      } else if (isMember) {
        user_request_status = 'ACCEPTED';
      } else {
        const userInvite = await prisma.notification.findFirst({
          where: {
            user_id: req.user.user_id,
            project_id: projectId,
            type: 'PROJECT_INVITE'
          }
        });
        if (userInvite) {
          user_request_status = userInvite.status || 'PENDING';
        } else if (isMatchingDept) {
          user_request_status = 'PENDING';
        }
      }
    }

    const formatted = {
      ...project,
      objectives: JSON.parse(project.objectives || '[]'),
      required_skills: JSON.parse(project.required_skills || '[]'),
      required_departments: targetDeptIds,
      target_department_id: project.target_department_id,
      target_department_name: project.target_department?.department_name || null,
      technologies: JSON.parse(project.technologies || '[]'),
      preferred_mentor_expertise: JSON.parse(project.preferred_mentor_expertise || '[]'),
      leader_name: project.creator?.name || 'Project Leader',
      leader_register_number: project.creator?.student_id || 'N/A',
      leader_email: project.creator?.email || 'N/A',
      leader_phone: project.creator?.student_profile?.phone || '',
      department_name: project.creator?.department?.department_name || 'Department',
      user_request_status,
      team: project.team ? {
        ...project.team,
        members: project.team.members.map(m => ({
          student_id: m.student_id,
          register_number: m.student.student_id || 'N/A',
          name: m.student.name,
          email: m.student.email,
          role: m.role,
          department_name: m.student.department?.department_name || '',
          year: m.student.student_profile?.year || '1st Year',
          phone: m.student.student_profile?.phone || '',
          skills: m.student.student_profile ? JSON.parse(m.student.student_profile.skills || '[]') : [],
          joined_at: m.joined_at
        }))
      } : null
    };

    return res.json({ success: true, project: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch project details.' });
  }
};

export const requestToJoinProject = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.STUDENT) {
      return res.status(403).json({ success: false, message: 'Only students can request to join teams.' });
    }

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: {
        team: { include: { members: true } },
        creator: true
      }
    });

    if (!project || !project.team) {
      return res.status(404).json({ success: false, message: 'Project team not found.' });
    }

    if (project.created_by === req.user.user_id) {
      return res.status(400).json({ success: false, message: 'Project leaders cannot request to join their own project.' });
    }

    if (project.team.members.some(m => m.student_id === req.user?.user_id)) {
      return res.status(400).json({ success: false, message: 'You are already a member of this project team.' });
    }

    if (project.team.members.length >= project.team_size) {
      return res.status(400).json({ success: false, message: 'Team is already at maximum capacity.' });
    }

    // Check if user already has a pending or accepted join request
    const existingReq = await prisma.joinRequest.findUnique({
      where: {
        project_id_student_id: {
          project_id: projectId,
          student_id: req.user.user_id
        }
      }
    });

    if (existingReq) {
      if (existingReq.status === 'PENDING') {
        return res.status(400).json({ success: false, message: 'You already have a pending join request for this project.' });
      }
      if (existingReq.status === 'ACCEPTED') {
        return res.status(400).json({ success: false, message: 'You have already been accepted into this team.' });
      }
    }

    // Create or update JoinRequest in PENDING state
    const joinReq = await prisma.joinRequest.upsert({
      where: {
        project_id_student_id: {
          project_id: projectId,
          student_id: req.user.user_id
        }
      },
      create: {
        project_id: projectId,
        student_id: req.user.user_id,
        status: 'PENDING'
      },
      update: {
        status: 'PENDING',
        created_at: new Date()
      }
    });

    // Send notification to Project Leader
    await prisma.notification.create({
      data: {
        user_id: project.created_by,
        type: 'PROJECT_INVITE',
        project_id: projectId,
        message: `${req.user.name} submitted a request to join your project "${project.title}".`
      }
    });

    return res.json({
      success: true,
      message: `Join request sent to project leader (${project.creator?.name}) for review!`,
      joinRequest: joinReq
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to send join request.', error: error.message });
  }
};

export const getProjectJoinRequests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { projectId } = req.params;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId }
    });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    if (project.created_by !== req.user.user_id && req.user.role !== UserRole.ADMIN) {
      return res.status(403).json({ success: false, message: 'Only the project leader can view join requests.' });
    }

    const requests = await prisma.joinRequest.findMany({
      where: { project_id: projectId },
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
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = requests.map(r => ({
      request_id: r.request_id,
      project_id: r.project_id,
      student_id: r.student_id,
      register_number: r.student.student_id || 'N/A',
      student_name: r.student.name,
      student_email: r.student.email,
      department_name: r.student.department?.department_name || 'N/A',
      year: r.student.student_profile?.year || '1st Year',
      skills: r.student.student_profile ? JSON.parse(r.student.student_profile.skills || '[]') : [],
      status: r.status,
      created_at: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, requests: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch join requests.', error: error.message });
  }
};

export const respondToJoinRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== UserRole.STUDENT) {
      return res.status(403).json({ success: false, message: 'Only students can respond to join requests.' });
    }

    const { request_id, project_id, student_id, action, status } = req.body;

    const finalAction = (action || (status === 'ACCEPTED' ? 'ACCEPT' : status === 'REJECTED' ? 'REJECT' : status))?.toUpperCase();

    if (!finalAction || !['ACCEPT', 'REJECT'].includes(finalAction)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Must be ACCEPT or REJECT.' });
    }

    let joinReq = null;
    if (request_id) {
      joinReq = await prisma.joinRequest.findUnique({
        where: { request_id },
        include: { project: { include: { team: { include: { members: true } } } }, student: true }
      });
    } else if (project_id && student_id) {
      joinReq = await prisma.joinRequest.findUnique({
        where: {
          project_id_student_id: { project_id, student_id }
        },
        include: { project: { include: { team: { include: { members: true } } } }, student: true }
      });
    }

    if (!joinReq) {
      return res.status(404).json({ success: false, message: 'Join request not found.' });
    }

    const project = joinReq.project;
    if (project.created_by !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Only the project leader can accept or reject join requests.' });
    }

    if (finalAction === 'ACCEPT') {
      if (!project.team) {
        return res.status(400).json({ success: false, message: 'Project team does not exist.' });
      }

      if (project.team.members.length >= project.team_size) {
        return res.status(400).json({ success: false, message: 'Team is already at maximum capacity.' });
      }

      // Add to team members if not already added
      const isAlreadyMember = project.team.members.some(m => m.student_id === joinReq!.student_id);
      if (!isAlreadyMember) {
        await prisma.teamMember.create({
          data: {
            team_id: project.team.team_id,
            student_id: joinReq.student_id,
            role: 'Member'
          }
        });
      }

      // Update join request status
      await prisma.joinRequest.update({
        where: { request_id: joinReq.request_id },
        data: { status: 'ACCEPTED' }
      });

      // Send notification to student
      await prisma.notification.create({
        data: {
          user_id: joinReq.student_id,
          type: 'PROJECT_ACCEPT',
          project_id: project.project_id,
          message: `Your request to join project "${project.title}" has been ACCEPTED by project leader ${req.user.name}!`
        }
      });

      return res.json({ success: true, message: `Accepted ${joinReq.student.name} into the project team!` });
    } else {
      // REJECT action
      await prisma.joinRequest.update({
        where: { request_id: joinReq.request_id },
        data: { status: 'REJECTED' }
      });

      // Send notification to student
      await prisma.notification.create({
        data: {
          user_id: joinReq.student_id,
          type: 'PROJECT_REJECT',
          project_id: project.project_id,
          message: `Your request to join project "${project.title}" was declined by the project leader.`
        }
      });

      return res.json({ success: true, message: `Declined join request for ${joinReq.student.name}.` });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to respond to join request.', error: error.message });
  }
};

export const getMyProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const userId = req.user.user_id;
    const isMentor = req.user.role === UserRole.MENTOR;

    const includeOptions = {
      creator: {
        select: {
          user_id: true,
          name: true,
          email: true,
          department: { select: { department_id: true, department_name: true } }
        }
      },
      mentor: { select: { user_id: true, name: true, email: true } },
      mentorship_requests: true,
      team: {
        include: {
          members: {
            include: {
              student: {
                select: {
                  user_id: true,
                  name: true,
                  email: true,
                  department: { select: { department_id: true, department_name: true } }
                }
              }
            }
          }
        }
      }
    };

    let rawMyProjects: any[] = [];
    let rawOtherProjects: any[] = [];

    if (isMentor) {
      // 1. Projects where current staff member is assigned as mentor
      rawMyProjects = await prisma.project.findMany({
        where: { mentor_id: userId },
        include: includeOptions,
        orderBy: { created_at: 'desc' }
      });

      const mentorDeptId = Number(req.user.department_id);
      const mentorDeptIdStr = String(req.user.department_id);
      rawOtherProjects = await prisma.project.findMany({
        where: {
          OR: [
            { creator: { department_id: mentorDeptId } },
            { required_departments: { contains: mentorDeptIdStr } }
          ],
          NOT: { mentor_id: userId }
        },
        include: includeOptions,
        orderBy: { created_at: 'desc' }
      });
    } else {
      // 1. Projects created by current user (Project Leader)
      rawMyProjects = await prisma.project.findMany({
        where: { created_by: userId },
        include: includeOptions,
        orderBy: { created_at: 'desc' }
      });

      // 2. Projects joined by current user where created_by != userId (Team Member)
      rawOtherProjects = await prisma.project.findMany({
        where: {
          created_by: { not: userId },
          team: {
            members: {
              some: { student_id: userId }
            }
          }
        },
        include: includeOptions,
        orderBy: { created_at: 'desc' }
      });
    }

    const formatProject = (p: any, defaultRole: string) => {
      let reqSkills = [];
      let reqDepts = [];
      let objectives = [];
      let technologies = [];
      try { reqSkills = typeof p.required_skills === 'string' ? JSON.parse(p.required_skills) : p.required_skills; } catch (e) {}
      try { reqDepts = typeof p.required_departments === 'string' ? JSON.parse(p.required_departments) : p.required_departments; } catch (e) {}
      try { objectives = typeof p.objectives === 'string' ? JSON.parse(p.objectives) : p.objectives; } catch (e) {}
      try { technologies = typeof p.technologies === 'string' ? JSON.parse(p.technologies) : p.technologies; } catch (e) {}

      let roleName = defaultRole;
      if (isMentor && p.mentor_id === userId) {
        roleName = 'Faculty Mentor';
      }

      return {
        ...p,
        objectives,
        required_skills: reqSkills,
        required_departments: reqDepts,
        technologies,
        leader_name: p.creator?.name || 'Project Leader',
        department_name: p.creator?.department?.department_name || 'Department',
        role: roleName,
        team_member_count: p.team?.members?.length || 1
      };
    };

    const myProjects = rawMyProjects.map(p => formatProject(p, isMentor ? 'Faculty Mentor' : 'Project Leader'));
    const otherProjects = rawOtherProjects.map(p => formatProject(p, isMentor ? 'Department Project' : 'Team Member'));

    return res.json({
      success: true,
      myProjects,
      otherProjects
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch my projects.', error: (error as Error).message });
  }
};
