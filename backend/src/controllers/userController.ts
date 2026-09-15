import { Response } from 'express';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from 'shared';
import { resolveDepartment } from '../utils/departmentResolver';

export const getDepartments = async (req: AuthRequest, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
      select: { department_id: true, department_name: true, department_code: true },
      orderBy: { department_id: 'asc' }
    });
    return res.json({ success: true, departments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments.' });
  }
};

export const getSkills = async (req: AuthRequest, res: Response) => {
  try {
    const skills = await prisma.skill.findMany({
      select: { skill_id: true, skill_name: true }
    });
    return res.json({ success: true, skills });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch skills catalog.' });
  }
};

export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      name,
      student_id,
      register_number,
      employee_id,
      phone,
      department_id,
      year,
      designation,
      expertise,
      subjects_handled,
      years_experience,
      skills,
      interests,
      research_interests,
      preferred_domains,
      experience,
      availability,
      portfolio_links,
      mentoring_capacity
    } = req.body;

    const userUpdateData: any = { profile_completed: true };

    if (name && typeof name === 'string' && name.trim().length > 0) {
      userUpdateData.name = name.trim();
    }

    const regNum = String(employee_id || student_id || register_number || '').trim();
    if (regNum) {
      userUpdateData.student_id = regNum;
    }

    if (department_id) {
      const dept = await resolveDepartment(department_id);
      if (dept) {
        userUpdateData.department_id = dept.department_id;
      }
    }

    // 1. Update User record (name, student_id/employee_id, department_id, profile_completed)
    const updatedUser = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: userUpdateData,
      include: {
        department: true,
        student_profile: true,
        mentor_profile: true
      }
    });

    // 2. Update StudentProfile or MentorProfile record
    if (updatedUser.role === UserRole.STUDENT || (updatedUser.role as string) === 'STUDENT') {
      await prisma.studentProfile.upsert({
        where: { user_id: updatedUser.user_id },
        create: {
          user_id: updatedUser.user_id,
          year: year || 'I Year',
          phone: phone || '',
          skills: JSON.stringify(skills || []),
          interests: JSON.stringify(interests || []),
          experience: experience || 'Student User',
          availability: availability || 'Available',
          portfolio_links: JSON.stringify(portfolio_links || []),
          preferred_domains: JSON.stringify(interests || [])
        },
        update: {
          year: year || undefined,
          phone: phone !== undefined ? phone : undefined,
          skills: JSON.stringify(skills || []),
          interests: JSON.stringify(interests || [])
        }
      });
    } else if (updatedUser.role === UserRole.MENTOR || (updatedUser.role as string) === 'MENTOR') {
      const finalEmployeeId = regNum || updatedUser.student_id || '';
      const finalDesignation = designation || 'Assistant Professor';
      const finalExpertise = JSON.stringify(expertise || skills || []);
      const finalSubjects = JSON.stringify(subjects_handled || []);
      const finalYearsExp = Number(years_experience || 0);
      const finalSkills = JSON.stringify(skills || []);
      const finalResearch = JSON.stringify(research_interests || interests || []);
      const finalDomains = JSON.stringify(preferred_domains || []);

      await prisma.mentorProfile.upsert({
        where: { user_id: updatedUser.user_id },
        create: {
          user_id: updatedUser.user_id,
          employee_id: finalEmployeeId,
          designation: finalDesignation,
          expertise: finalExpertise,
          subjects_handled: finalSubjects,
          years_experience: finalYearsExp,
          skills: finalSkills,
          research_interests: finalResearch,
          preferred_domains: finalDomains,
          availability: availability || 'Available',
          mentoring_capacity: Number(mentoring_capacity || 5),
          current_load: 0
        },
        update: {
          employee_id: finalEmployeeId,
          designation: finalDesignation,
          expertise: finalExpertise,
          subjects_handled: finalSubjects,
          years_experience: finalYearsExp,
          skills: finalSkills,
          research_interests: finalResearch,
          preferred_domains: finalDomains,
          availability: availability || 'Available',
          mentoring_capacity: Number(mentoring_capacity || 5)
        }
      });
    }

    // Refetch final complete user object to return to client
    const finalUser = await prisma.user.findUnique({
      where: { user_id: updatedUser.user_id },
      include: {
        department: true,
        student_profile: true,
        mentor_profile: true
      }
    });

    return res.json({
      success: true,
      message: 'Faculty profile setup completed successfully!',
      user: {
        user_id: finalUser!.user_id,
        student_id: finalUser!.student_id,
        register_number: finalUser!.student_id,
        name: finalUser!.name,
        email: finalUser!.email,
        role: finalUser!.role,
        department_id: finalUser!.department_id,
        department_name: finalUser!.department?.department_name || null,
        profile_completed: finalUser!.profile_completed,
        student_profile: finalUser!.student_profile ? {
          ...finalUser!.student_profile,
          skills: JSON.parse(finalUser!.student_profile.skills || '[]'),
          interests: JSON.parse(finalUser!.student_profile.interests || '[]'),
          portfolio_links: JSON.parse(finalUser!.student_profile.portfolio_links || '[]'),
          preferred_domains: JSON.parse(finalUser!.student_profile.preferred_domains || '[]')
        } : undefined,
        mentor_profile: finalUser!.mentor_profile ? {
          ...finalUser!.mentor_profile,
          employee_id: finalUser!.mentor_profile.employee_id || finalUser!.student_id || '',
          designation: finalUser!.mentor_profile.designation || 'Assistant Professor',
          years_experience: finalUser!.mentor_profile.years_experience || 0,
          expertise: JSON.parse(finalUser!.mentor_profile.expertise || '[]'),
          subjects_handled: JSON.parse(finalUser!.mentor_profile.subjects_handled || '[]'),
          skills: JSON.parse(finalUser!.mentor_profile.skills || '[]'),
          research_interests: JSON.parse(finalUser!.mentor_profile.research_interests || '[]'),
          preferred_domains: JSON.parse(finalUser!.mentor_profile.preferred_domains || '[]')
        } : undefined
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Onboarding failed.', error: error.message });
  }
};

export const updateStudentProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { skills, interests, experience, availability, portfolio_links, preferred_domains, department_id, year, phone } = req.body;

    if (department_id) {
      await prisma.user.update({
        where: { user_id: req.user.user_id },
        data: { department_id }
      });
    }

    const updated = await prisma.studentProfile.upsert({
      where: { user_id: req.user.user_id },
      create: {
        user_id: req.user.user_id,
        year: year || '1st Year',
        phone: phone || '',
        skills: JSON.stringify(skills || []),
        interests: JSON.stringify(interests || []),
        experience: experience || '',
        availability: availability || 'Available',
        portfolio_links: JSON.stringify(portfolio_links || []),
        preferred_domains: JSON.stringify(preferred_domains || [])
      },
      update: {
        ...(year ? { year } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(skills ? { skills: JSON.stringify(skills) } : {}),
        ...(interests ? { interests: JSON.stringify(interests) } : {}),
        ...(experience !== undefined ? { experience } : {}),
        ...(availability !== undefined ? { availability } : {}),
        ...(portfolio_links ? { portfolio_links: JSON.stringify(portfolio_links) } : {}),
        ...(preferred_domains ? { preferred_domains: JSON.stringify(preferred_domains) } : {})
      }
    });

    return res.json({
      success: true,
      message: 'Student profile updated successfully!',
      profile: {
        ...updated,
        skills: JSON.parse(updated.skills),
        interests: JSON.parse(updated.interests),
        portfolio_links: JSON.parse(updated.portfolio_links),
        preferred_domains: JSON.parse(updated.preferred_domains)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update student profile.' });
  }
};

export const updateMentorProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { expertise, research_interests, availability, mentoring_capacity, department_id } = req.body;

    if (department_id) {
      await prisma.user.update({
        where: { user_id: req.user.user_id },
        data: { department_id }
      });
    }

    const updated = await prisma.mentorProfile.upsert({
      where: { user_id: req.user.user_id },
      create: {
        user_id: req.user.user_id,
        expertise: JSON.stringify(expertise || []),
        research_interests: JSON.stringify(research_interests || []),
        availability: availability || 'Available',
        mentoring_capacity: mentoring_capacity || 5,
        current_load: 0
      },
      update: {
        ...(expertise ? { expertise: JSON.stringify(expertise) } : {}),
        ...(research_interests ? { research_interests: JSON.stringify(research_interests) } : {}),
        ...(availability !== undefined ? { availability } : {}),
        ...(mentoring_capacity !== undefined ? { mentoring_capacity: Number(mentoring_capacity) } : {})
      }
    });

    return res.json({
      success: true,
      message: 'Mentor profile updated successfully!',
      profile: {
        ...updated,
        expertise: JSON.parse(updated.expertise),
        research_interests: JSON.parse(updated.research_interests)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update mentor profile.' });
  }
};

export const getUserProjects = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    let projects: any[] = [];

    if (req.user.role === UserRole.STUDENT) {
      projects = await prisma.project.findMany({
        where: {
          OR: [
            { created_by: req.user.user_id },
            { team: { members: { some: { student_id: req.user.user_id } } } }
          ]
        },
        include: {
          creator: { select: { user_id: true, name: true, email: true } },
          mentor: { select: { user_id: true, name: true, email: true } },
          team: {
            include: {
              members: {
                include: {
                  student: { select: { user_id: true, name: true, email: true } }
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (req.user.role === UserRole.MENTOR) {
      projects = await prisma.project.findMany({
        where: { mentor_id: req.user.user_id },
        include: {
          creator: { select: { user_id: true, name: true, email: true } },
          team: {
            include: {
              members: {
                include: {
                  student: { select: { user_id: true, name: true, email: true } }
                }
              }
            }
          }
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (req.user.role === UserRole.ADMIN) {
      projects = await prisma.project.findMany({
        take: 20,
        include: {
          creator: { select: { user_id: true, name: true, email: true } },
          mentor: { select: { user_id: true, name: true, email: true } }
        },
        orderBy: { created_at: 'desc' }
      });
    }

    return res.json({ success: true, projects });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user projects.', error: (error as Error).message });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const notifications = await prisma.notification.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { created_at: 'desc' },
      take: 30
    });

    return res.json({ success: true, notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
};

export const markNotificationsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { notification_id } = req.body;

    if (notification_id) {
      await prisma.notification.update({
        where: { notification_id },
        data: { read: true }
      });
    } else {
      await prisma.notification.updateMany({
        where: { user_id: req.user.user_id, read: false },
        data: { read: true }
      });
    }

    return res.json({ success: true, message: 'Notifications updated.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read.' });
  }
};

