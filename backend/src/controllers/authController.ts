import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from 'shared';
import prisma from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { isValidEmailFormat, sendOtpEmail, validateUniversityEmail, getSmtpTransporter } from '../services/emailService';
import { generateNextStudentId } from '../utils/studentIdGenerator';
import { resolveDepartment } from '../utils/departmentResolver';

const JWT_SECRET = process.env.JWT_SECRET || 'capstone_hub_jwt_super_secret_key_2026_antigravity';
const ALLOWED_DOMAINS = (process.env.ALLOWED_UNIVERSITY_DOMAINS || 'bitsathy.ac.in,university.edu').split(',');

export function parseBitSathyEmail(email: string) {
  const parts = email.trim().toLowerCase().split('@');
  const local = parts[0] || '';
  const domain = parts[1] || '';

  // Student format: ends with .deptCode+yearShort (e.g. rabinthilakj.cb24, john.cs23, alex.ece22)
  const studentRegex = /^(.+)\.([a-z]{2,4})([0-9]{2})$/i;
  const matchStudent = local.match(studentRegex);

  if (matchStudent) {
    const [, rawNamePart, deptCode, yearShort] = matchStudent;
    const formattedName = rawNamePart
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
    return {
      isBitSathy: domain === 'bitsathy.ac.in',
      role: UserRole.STUDENT,
      name: formattedName,
      deptCode: deptCode.toUpperCase(),
      joiningYear: `20${yearShort}`
    };
  }

  // Staff / Faculty format: any email without student batch suffix (e.g. drsmith, gayathirib, faculty, john.doe)
  const formattedName = local
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return {
    isBitSathy: domain === 'bitsathy.ac.in',
    role: UserRole.MENTOR,
    name: formattedName,
    deptCode: 'FACULTY',
    joiningYear: ''
  };
}

function safeJsonParse(val: any, fallback: any = []): any {
  if (Array.isArray(val)) return val;
  if (!val || typeof val !== 'string') return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (e) {
    return fallback;
  }
}

function formatUserResponse(user: any) {
  return {
    user_id: user.user_id,
    student_id: user.student_id,
    register_number: user.student_id,
    name: user.name,
    email: user.email,
    role: user.role,
    department_id: user.department_id,
    department_name: user.department?.department_name || 'Engineering',
    profile_completed: user.profile_completed,
    student_profile: user.student_profile ? {
      ...user.student_profile,
      year: user.student_profile.year || '1st Year',
      phone: user.student_profile.phone || '',
      skills: safeJsonParse(user.student_profile.skills),
      interests: safeJsonParse(user.student_profile.interests),
      portfolio_links: safeJsonParse(user.student_profile.portfolio_links),
      preferred_domains: safeJsonParse(user.student_profile.preferred_domains)
    } : undefined,
    mentor_profile: user.mentor_profile ? {
      ...user.mentor_profile,
      employee_id: user.mentor_profile.employee_id || user.student_id || '',
      designation: user.mentor_profile.designation || 'Assistant Professor',
      years_experience: user.mentor_profile.years_experience || 0,
      expertise: safeJsonParse(user.mentor_profile.expertise),
      subjects_handled: safeJsonParse(user.mentor_profile.subjects_handled),
      skills: safeJsonParse(user.mentor_profile.skills),
      research_interests: safeJsonParse(user.mentor_profile.research_interests),
      preferred_domains: safeJsonParse(user.mentor_profile.preferred_domains)
    } : undefined
  };
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, department_id, skills, interests, year, phone, student_id, register_number } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Strict RFC 5322 Email Format Validation
    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address format. Please enter a valid email address (e.g., student@domain.com).'
      });
    }

    if (role === 'ADMIN' || (role as string) === UserRole.ADMIN) {
      return res.status(400).json({
        success: false,
        message: 'Admin role cannot be selected during normal registration. Only Student and Faculty roles are allowed.'
      });
    }

    const parsedInfo = parseBitSathyEmail(cleanEmail);
    const assignedRole = (role || parsedInfo.role) as UserRole;
    const finalName = name || parsedInfo.name;

    const emailCheck = validateUniversityEmail(cleanEmail, assignedRole);
    if (!emailCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: emailCheck.message
      });
    }

    // 2. Check if user ALREADY exists in permanent User database table
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail }
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.'
      });
    }

    // 3. Robust Department Foreign Key Resolution
    const deptRecord = await resolveDepartment(department_id || parsedInfo.deptCode);
    const finalDeptId = deptRecord ? deptRecord.department_id : 15;
    let pendingStudentId: string | null = null;
    if (assignedRole === UserRole.STUDENT || (assignedRole as string) === 'STUDENT') {
      const userProvidedId = String(student_id || register_number || '').trim();
      pendingStudentId = userProvidedId || (await generateNextStudentId(finalDeptId, year || '1st Year'));
    }

    const password_hash = await bcrypt.hash(password || 'DefaultPassword@2026', 10);

    // Create user directly in permanent User table (No SMTP OTP required)
    const newUser = await prisma.user.create({
      data: {
        name: finalName,
        email: cleanEmail,
        password_hash,
        role: assignedRole,
        department_id: finalDeptId,
        student_id: pendingStudentId,
        email_verified: true,
        status: 'ACTIVE',
        profile_completed: true,
        ...(assignedRole === UserRole.STUDENT || (assignedRole as string) === 'STUDENT'
          ? {
              student_profile: {
                create: {
                  year: year || '1st Year',
                  phone: phone || '',
                  skills: JSON.stringify(skills || []),
                  interests: JSON.stringify(interests || []),
                  experience: 'Student User',
                  availability: 'Available',
                  portfolio_links: '[]',
                  preferred_domains: '[]'
                }
              }
            }
          : {
              mentor_profile: {
                create: {
                  expertise: JSON.stringify(skills || []),
                  research_interests: JSON.stringify(interests || []),
                  availability: 'Available',
                  mentoring_capacity: 5
                }
              }
            })
      },
      include: { department: true, student_profile: true, mentor_profile: true }
    });

    const token = jwt.sign(
      { user_id: newUser.user_id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: formatUserResponse(newUser)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Registration failed.', error: (error as Error).message });
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp_code } = req.body;

    if (!email || !otp_code) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    const submittedOtp = String(otp_code).trim();

    // 1. Check PendingRegistration table
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: cleanEmail }
    });

    if (pending) {
      if (pending.otp_code !== submittedOtp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your email and try again.' });
      }

      if (new Date() > new Date(pending.expires_at)) {
        return res.status(400).json({ success: false, message: 'OTP code has expired. Please click "Resend OTP".' });
      }

      // Check if user was already created in User table
      const alreadyUser = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail } },
        include: { department: true, student_profile: true, mentor_profile: true }
      });

      if (alreadyUser) {
        const updated = await prisma.user.update({
          where: { user_id: alreadyUser.user_id },
          data: { email_verified: true },
          include: { department: true, student_profile: true, mentor_profile: true }
        });

        await prisma.pendingRegistration.delete({ where: { email: cleanEmail } }).catch(() => {});

        const token = jwt.sign(
          { user_id: updated.user_id, email: updated.email, role: updated.role, name: updated.name },
          JWT_SECRET,
          { expiresIn: '1d' }
        );

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000
        });

        return res.json({
          success: true,
          message: 'Account verified successfully!',
          token,
          user: formatUserResponse(updated)
        });
      }

      let finalStudentId: string | null = pending.student_id;
      if (pending.role === UserRole.STUDENT || (pending.role as string) === 'STUDENT') {
        if (!finalStudentId) {
          finalStudentId = await generateNextStudentId(pending.department_id, pending.year || '1st Year');
        } else {
          const existingUserWithId = await prisma.user.findFirst({
            where: { student_id: finalStudentId }
          });
          if (existingUserWithId) {
            finalStudentId = await generateNextStudentId(pending.department_id, pending.year || '1st Year');
          }
        }
      } else {
        finalStudentId = null;
      }

      // 🔒 CREATE USER PERMANENTLY IN DATABASE NOW (ONLY AFTER OTP VERIFIED)
      const newUser = await prisma.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          password_hash: pending.password_hash,
          role: pending.role,
          department_id: pending.department_id,
          student_id: finalStudentId,
          email_verified: true, // Marked verified!
          status: 'ACTIVE',
          profile_completed: true,
          ...(pending.role === UserRole.STUDENT
            ? {
                student_profile: {
                  create: {
                    year: pending.year || '1st Year',
                    phone: pending.phone || '',
                    skills: pending.skills || '[]',
                    interests: pending.interests || '[]',
                    experience: 'Student User',
                    availability: 'Available',
                    portfolio_links: '[]',
                    preferred_domains: pending.interests || '[]'
                  }
                }
              }
            : {
                mentor_profile: {
                  create: {
                    expertise: pending.skills || '[]',
                    research_interests: pending.interests || '[]',
                    availability: 'Available',
                    mentoring_capacity: 5,
                    current_load: 0
                  }
                }
              })
        },
        include: {
          department: true,
          student_profile: true,
          mentor_profile: true
        }
      });

      // Cleanup pending registration & OTP tables
      await prisma.pendingRegistration.delete({ where: { email: cleanEmail } }).catch(() => {});
      await prisma.otpVerification.delete({ where: { email: cleanEmail } }).catch(() => {});

      const token = jwt.sign(
        { user_id: newUser.user_id, email: newUser.email, role: newUser.role, name: newUser.name },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        message: 'Account created and verified successfully!',
        token,
        user: formatUserResponse(newUser)
      });
    }

    // 2. Fallback check for existing users in OtpVerification
    const otpRecord = await prisma.otpVerification.findUnique({
      where: { email: cleanEmail }
    });

    if (otpRecord) {
      if (otpRecord.otp_code !== submittedOtp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your email and try again.' });
      }

      if (new Date() > new Date(otpRecord.expires_at)) {
        return res.status(400).json({ success: false, message: 'OTP code has expired. Please click "Resend OTP".' });
      }

      const existingUser = await prisma.user.findFirst({
        where: { email: { equals: cleanEmail } },
        include: { department: true, student_profile: true, mentor_profile: true }
      });

      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'No registration found for this email address. Please register.' });
      }

      const updatedUser = await prisma.user.update({
        where: { user_id: existingUser.user_id },
        data: { email_verified: true },
        include: { department: true, student_profile: true, mentor_profile: true }
      });

      await prisma.otpVerification.delete({ where: { email: cleanEmail } }).catch(() => {});

      const token = jwt.sign(
        { user_id: updatedUser.user_id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        message: 'Email address verified successfully!',
        token,
        user: formatUserResponse(updatedUser)
      });
    }

    return res.status(400).json({
      success: false,
      message: 'No pending registration found for this email address. Please register.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'OTP verification failed.', error: (error as Error).message });
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    // Check if user is already verified in permanent User table
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail } }
    });

    if (existingUser && existingUser.email_verified) {
      return res.status(400).json({
        success: false,
        message: 'Account is already registered and verified. Please sign in.'
      });
    }

    // Check pending registration table first
    const pending = await prisma.pendingRegistration.findUnique({
      where: { email: cleanEmail }
    });

    if (pending) {
      const otpData = await sendOtpEmail(cleanEmail);

      // Invalidate previous OTP and update with fresh OTP
      await prisma.pendingRegistration.update({
        where: { email: cleanEmail },
        data: {
          otp_code: otpData.otp_code,
          expires_at: otpData.expires_at,
          created_at: new Date()
        }
      });

      return res.json({
        success: true,
        message: `A new 6-digit OTP code has been sent to ${cleanEmail}.`,
        dev_otp: otpData.otp_code
      });
    }

    // If unverified account exists in User table
    if (existingUser && !existingUser.email_verified) {
      const otpData = await sendOtpEmail(cleanEmail);
      return res.json({
        success: true,
        message: `A new 6-digit OTP code has been sent to ${cleanEmail}.`,
        dev_otp: otpData.otp_code
      });
    }

    return res.status(404).json({
      success: false,
      message: 'No pending registration found for this email address. Please register first.'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to resend OTP.', error: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Backend Format Check
    if (!isValidEmailFormat(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address format.' });
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: cleanEmail }
      },
      include: {
        department: true,
        student_profile: true,
        mentor_profile: true
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect email or password.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect email or password.' });
    }

    // 🔒 Block login if email is unverified
    if (!user.email_verified) {
      const otpData = await sendOtpEmail(cleanEmail);
      return res.status(403).json({
        success: false,
        requireVerification: true,
        email: cleanEmail,
        message: `Please verify your email before logging in. A 6-digit OTP verification code has been sent to ${cleanEmail}.`,
        dev_otp: otpData.otp_code
      });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Login failed.', error: (error as Error).message });
  }
};

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminEmail = (process.env.ADMIN_EMAIL || 'rabinthilakj@gmail.com').trim().toLowerCase();

    const isAdmin = cleanEmail === adminEmail;
    const isBitSathy = cleanEmail.endsWith('@bitsathy.ac.in');

    // 🔒 1. REJECT UNAUTHORIZED GOOGLE ACCOUNTS (neither authorized Admin email nor @bitsathy.ac.in)
    if (!isAdmin && !isBitSathy) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. Only official @bitsathy.ac.in accounts or authorized Admin accounts are permitted.'
      });
    }

    // 2. FETCH EXISTING USER RECORD
    let user = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      include: {
        department: true,
        student_profile: true,
        mentor_profile: true
      }
    });

    let defaultDept = await prisma.department.findFirst();
    if (!defaultDept) {
      defaultDept = await prisma.department.create({
        data: { department_name: 'Computer Science & Engineering', department_code: 'CSE' }
      });
    }

    const defaultPassword = await bcrypt.hash('GoogleAuth@2026', 10);

    if (isAdmin) {
      // 🛡️ ADMIN GOOGLE ACCOUNT HANDLER
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: name || 'Rabin Thilak J',
            email: cleanEmail,
            password_hash: defaultPassword,
            role: 'ADMIN',
            department_id: null,
            email_verified: true,
            status: 'ACTIVE',
            profile_completed: true // Admin skips student/staff onboarding completely!
          },
          include: {
            department: true,
            student_profile: true,
            mentor_profile: true
          }
        });
      } else if (user.role !== 'ADMIN' || !user.profile_completed || user.department_id !== null) {
        user = await prisma.user.update({
          where: { user_id: user.user_id },
          data: { role: 'ADMIN', department_id: null, profile_completed: true },
          include: {
            department: true,
            student_profile: true,
            mentor_profile: true
          }
        });
      }
    } else {
      // 🎓 STUDENT / STAFF GOOGLE ACCOUNT HANDLER (@bitsathy.ac.in)
      const parsedInfo = parseBitSathyEmail(cleanEmail);
      const assignedRole = parsedInfo.role;
      const parsedName = name || parsedInfo.name;

      const userDept = (await resolveDepartment(parsedInfo.deptCode)) || defaultDept;
      const targetDeptId = userDept.department_id;

      if (!user) {
        if (assignedRole === UserRole.STUDENT || (assignedRole as string) === 'STUDENT') {
          // 🔒 FIRST-TIME STUDENT GOOGLE SIGN-IN: DO NOT CREATE ANY USER OR STUDENT RECORD IN DB YET!
          const tempToken = jwt.sign(
            { tempRegistration: true, email: cleanEmail, name: parsedName, department_id: targetDeptId, joiningYear: parsedInfo.joiningYear },
            JWT_SECRET,
            { expiresIn: '30m' }
          );

          return res.json({
            success: true,
            isNewUser: true,
            requirePersonalDetails: true,
            tempToken,
            pendingStudent: {
              email: cleanEmail,
              name: parsedName,
              department_id: targetDeptId,
              department_name: userDept.department_name,
              joiningYear: parsedInfo.joiningYear || '2024'
            }
          });
        }

        // For MENTOR / FACULTY accounts, create staff profile as before
        user = await prisma.user.create({
          data: {
            name: parsedName,
            email: cleanEmail,
            password_hash: defaultPassword,
            role: assignedRole,
            department_id: targetDeptId,
            student_id: null,
            email_verified: true,
            status: 'ACTIVE',
            profile_completed: false,
            mentor_profile: {
              create: {
                expertise: JSON.stringify([]),
                research_interests: JSON.stringify([]),
                availability: 'Available',
                mentoring_capacity: 5,
                current_load: 0
              }
            }
          },
          include: {
            department: true,
            student_profile: true,
            mentor_profile: true
          }
        });
      } else {
        // Self-heal: Ensure existing student/mentor has corresponding profile object attached
        if (user.role === 'STUDENT' && !user.student_profile) {
          const sp = await prisma.studentProfile.create({
            data: {
              user_id: user.user_id,
              skills: JSON.stringify([]),
              interests: JSON.stringify([]),
              experience: `BIT Sathy Student (${parsedInfo.joiningYear || '2024'} Batch)`,
              availability: 'Available',
              portfolio_links: JSON.stringify([]),
              preferred_domains: JSON.stringify([])
            }
          });
          user.student_profile = sp;
        } else if (user.role === 'MENTOR' && !user.mentor_profile) {
          const mp = await prisma.mentorProfile.create({
            data: {
              user_id: user.user_id,
              expertise: JSON.stringify([]),
              research_interests: JSON.stringify([]),
              availability: 'Available',
              mentoring_capacity: 5,
              current_load: 0
            }
          });
          user.mentor_profile = mp;
        }
      }
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      isNewUser: false,
      requirePersonalDetails: false,
      token,
      user: formatUserResponse(user)
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Google Authentication failed.', error: error.message });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: {
        department: true,
        student_profile: true,
        mentor_profile: true
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user: formatUserResponse(user)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch current user.' });
  }
};

export const adminSendOtp = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // STRICT CHECK: Only rabinthilakj@gmail.com is authorized!
    if (cleanEmail !== 'rabinthilakj@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized Admin Email. Access denied.'
      });
    }

    // Rate Limiting & Cooldown Check: Ensure minimum 30 seconds between OTP requests
    const existingOtp = await prisma.otpVerification.findUnique({
      where: { email: cleanEmail }
    });

    if (existingOtp) {
      const secondsSinceLastCreated = (Date.now() - new Date(existingOtp.created_at).getTime()) / 1000;
      if (secondsSinceLastCreated < 30) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(30 - secondsSinceLastCreated)} seconds before requesting a new OTP.`
        });
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration per requirements

    // Save in OtpVerification DB table
    await prisma.otpVerification.upsert({
      where: { email: cleanEmail },
      create: {
        email: cleanEmail,
        otp_code: otpCode,
        expires_at: expiresAt,
      },
      update: {
        otp_code: otpCode,
        expires_at: expiresAt,
        created_at: new Date(),
      }
    });

    // Send via Gmail SMTP
    const smtpUser = process.env.SMTP_USER ? process.env.SMTP_USER.trim() : '';
    const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.trim().replace(/\s+/g, '') : '';
    const smtpFrom = process.env.SMTP_FROM ? process.env.SMTP_FROM.trim() : smtpUser;

    if (smtpUser && smtpPass) {
      try {
        const transporter = getSmtpTransporter();
        await transporter.sendMail({
          from: `"Capstone Hub Admin" <${smtpFrom}>`,
          to: cleanEmail,
          subject: 'Capstone Hub - Admin Security Login OTP',
          text: `Your Admin Login OTP code is ${otpCode}. This code expires in 5 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #0f172a; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #4f46e5; margin-top: 0;">Capstone Hub Admin Portal</h2>
              <p>Your single-use Admin Login OTP is:</p>
              <h1 style="letter-spacing: 6px; color: #4f46e5; font-family: monospace; font-size: 36px; background-color: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center;">${otpCode}</h1>
              <p style="color: #64748b; font-size: 13px;">This OTP will expire in <strong>5 minutes</strong>.</p>
              <p style="color: #ef4444; font-size: 12px; font-weight: bold; margin-top: 20px;">Do NOT share this code with anyone.</p>
            </div>
          `
        });
        console.log(`[ADMIN OTP] ✅ SMTP Email sent to ${cleanEmail}`);
      } catch (smtpErr: any) {
        console.error(`[ADMIN OTP ERROR] SMTP Delivery failed:`, smtpErr);
      }
    }

    return res.json({
      success: true,
      message: `Admin verification OTP sent to ${cleanEmail}. Please enter the 6-digit code.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to send Admin OTP.', error: error.message });
  }
};

export const adminVerifyOtp = async (req: Request, res: Response) => {
  try {
    const { email, otp_code } = req.body;
    if (!email || !otp_code) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // STRICT CHECK: Only rabinthilakj@gmail.com is authorized!
    if (cleanEmail !== 'rabinthilakj@gmail.com') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized Admin Email.'
      });
    }

    const submittedOtp = String(otp_code).trim();

    const otpRecord = await prisma.otpVerification.findUnique({
      where: { email: cleanEmail }
    });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'No active OTP request found. Please request a new OTP.' });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      await prisma.otpVerification.delete({ where: { email: cleanEmail } }).catch(() => {});
      return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new OTP.' });
    }

    if (otpRecord.otp_code !== submittedOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check your email and try again.' });
    }

    // OTP IS VALID! Delete used OTP record
    await prisma.otpVerification.delete({ where: { email: cleanEmail } }).catch(() => {});

    // Ensure default department exists for admin
    let adminDept = await prisma.department.findFirst();
    if (!adminDept) {
      adminDept = await prisma.department.create({
        data: { department_name: 'Computer Science & Engineering', department_code: 'CSE' }
      });
    }

    // Find or create Admin account in User table
    let adminUser = await prisma.user.findFirst({
      where: { email: cleanEmail },
      include: { department: true }
    });

    if (!adminUser) {
      const dummyPassword = await bcrypt.hash('AdminSecurePassword@2026', 10);
      adminUser = await prisma.user.create({
        data: {
          name: 'Rabin Thilak J',
          email: cleanEmail,
          password_hash: dummyPassword,
          role: 'ADMIN',
          department_id: adminDept.department_id,
          email_verified: true,
          status: 'ACTIVE',
          profile_completed: true
        },
        include: { department: true }
      });
    } else {
      // Ensure user role is ADMIN and status is ACTIVE
      if (adminUser.role !== 'ADMIN' || adminUser.status !== 'ACTIVE' || !adminUser.email_verified) {
        adminUser = await prisma.user.update({
          where: { user_id: adminUser.user_id },
          data: { role: 'ADMIN', status: 'ACTIVE', email_verified: true },
          include: { department: true }
        });
      }
    }

    const token = jwt.sign(
      { user_id: adminUser.user_id, email: adminUser.email, role: 'ADMIN', name: adminUser.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Admin Authentication Successful!',
      token,
      user: formatUserResponse(adminUser)
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Admin verification failed.', error: error.message });
  }
};

export const confirmGoogleStudentRegistration = async (req: Request, res: Response) => {
  try {
    const { email, name, student_id, register_number, phone, department_id, year, skills } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith('@bitsathy.ac.in')) {
      return res.status(403).json({ success: false, message: 'Only official @bitsathy.ac.in student accounts are allowed.' });
    }

    // Check if user is already registered in User table
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: cleanEmail } },
      include: { department: true, student_profile: true, mentor_profile: true }
    });

    if (existingUser) {
      const token = jwt.sign(
        { user_id: existingUser.user_id, email: existingUser.email, role: existingUser.role, name: existingUser.name },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });

      return res.json({
        success: true,
        message: 'Account already exists. Logged in successfully.',
        token,
        user: formatUserResponse(existingUser)
      });
    }

    // Validate required fields
    const finalName = (name || '').trim();
    const finalStudentId = (student_id || register_number || '').trim().toUpperCase();
    const finalPhone = (phone || '').trim();
    const finalDeptId = Number(department_id);
    const finalYear = year || 'I Year';

    if (!finalName) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!finalStudentId) {
      return res.status(400).json({ success: false, message: 'Register Number / Student ID is required.' });
    }
    if (!finalPhone) {
      return res.status(400).json({ success: false, message: 'Mobile Number is required.' });
    }
    if (!finalDeptId || isNaN(finalDeptId)) {
      return res.status(400).json({ success: false, message: 'Valid Department selection is required.' });
    }

    // Check duplicate student_id
    const existingStudentId = await prisma.user.findFirst({
      where: { student_id: finalStudentId }
    });

    if (existingStudentId) {
      return res.status(400).json({ success: false, message: `Register Number / Student ID "${finalStudentId}" is already registered by another student.` });
    }

    const defaultPassword = await bcrypt.hash('GoogleAuth@2026', 10);
    const parsedInfo = parseBitSathyEmail(cleanEmail);

    // 🔒 PRISMA TRANSACTION: Create User & StudentProfile ONLY AFTER PERSONAL DETAILS ARE CONFIRMED
    const newUser = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: finalName,
          email: cleanEmail,
          password_hash: defaultPassword,
          role: 'STUDENT',
          department_id: finalDeptId,
          student_id: finalStudentId,
          email_verified: true,
          status: 'ACTIVE',
          profile_completed: true,
          student_profile: {
            create: {
              year: finalYear,
              phone: finalPhone,
              skills: JSON.stringify(Array.isArray(skills) ? skills : []),
              interests: JSON.stringify([]),
              experience: `BIT Sathy Student (${parsedInfo.joiningYear || '2024'} Batch)`,
              availability: 'Available',
              portfolio_links: JSON.stringify([]),
              preferred_domains: JSON.stringify([])
            }
          }
        },
        include: {
          department: true,
          student_profile: true,
          mentor_profile: true
        }
      });

      return createdUser;
    });

    const token = jwt.sign(
      { user_id: newUser.user_id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Student account created and confirmed successfully!',
      token,
      user: formatUserResponse(newUser)
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to create student account.', error: error.message });
  }
};

