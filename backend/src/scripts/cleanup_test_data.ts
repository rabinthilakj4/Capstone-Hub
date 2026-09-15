import prisma from '../config/db';
import bcrypt from 'bcryptjs';

async function cleanupTestData() {
  console.log('==================================================');
  console.log('   STARTING CAPSTONE HUB TEST DATA CLEANUP        ');
  console.log('==================================================\n');

  // 1. Ensure the single Faculty testing account (drsmith@bitsathy.ac.in) exists
  const defaultPassword = await bcrypt.hash('FacultyPassword@2026', 10);
  
  let cseDept = await prisma.department.findFirst({
    where: { department_name: { contains: 'Computer Science' } }
  });
  if (!cseDept) {
    cseDept = await prisma.department.findFirst();
  }
  const deptId = cseDept ? cseDept.department_id : 1;

  const staffAccount = await prisma.user.upsert({
    where: { email: 'drsmith@bitsathy.ac.in' },
    update: {
      name: 'Dr. Smith',
      role: 'MENTOR',
      status: 'ACTIVE',
      profile_completed: true,
      email_verified: true,
      student_id: 'EMP-1001',
      department_id: deptId
    },
    create: {
      name: 'Dr. Smith',
      email: 'drsmith@bitsathy.ac.in',
      password_hash: defaultPassword,
      role: 'MENTOR',
      department_id: deptId,
      student_id: 'EMP-1001',
      email_verified: true,
      status: 'ACTIVE',
      profile_completed: true,
      mentor_profile: {
        create: {
          employee_id: 'EMP-1001',
          designation: 'Associate Professor',
          expertise: JSON.stringify(["Artificial Intelligence & Machine Learning", "Data Science", "Computer Science"]),
          subjects_handled: JSON.stringify(["Data structures", "Algorithms"]),
          years_experience: 15,
          skills: JSON.stringify(["Research Guidance", "Project Mentorship", "Curriculum Design"]),
          research_interests: JSON.stringify(["Artificial Intelligence & Machine Learning", "Data Science & Big Data"]),
          preferred_domains: JSON.stringify(["Mobile App Development", "Web Development", "Cloud Computing"]),
          availability: 'Available',
          mentoring_capacity: 5,
          current_load: 0
        }
      }
    },
    include: {
      department: true,
      mentor_profile: true
    }
  });

  // Ensure mentor profile exists and current_load is reset to 0
  await prisma.mentorProfile.upsert({
    where: { user_id: staffAccount.user_id },
    update: {
      employee_id: 'EMP-1001',
      current_load: 0,
      availability: 'Available'
    },
    create: {
      user_id: staffAccount.user_id,
      employee_id: 'EMP-1001',
      designation: 'Associate Professor',
      expertise: JSON.stringify(["Artificial Intelligence & Machine Learning", "Data Science", "Computer Science"]),
      subjects_handled: JSON.stringify(["Data structures", "Algorithms"]),
      years_experience: 15,
      skills: JSON.stringify(["Research Guidance", "Project Mentorship", "Curriculum Design"]),
      research_interests: JSON.stringify(["Artificial Intelligence & Machine Learning", "Data Science & Big Data"]),
      preferred_domains: JSON.stringify(["Mobile App Development", "Web Development", "Cloud Computing"]),
      availability: 'Available',
      mentoring_capacity: 5,
      current_load: 0
    }
  });

  // Also preserve Admin account if it exists
  const adminAccount = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });

  const keepUserIds = [staffAccount.user_id, adminAccount?.user_id].filter(Boolean) as string[];

  console.log(`[INFO] Preserved Accounts:`);
  console.log(` - Faculty Testing Account: ${staffAccount.name} (${staffAccount.email}) [ID: ${staffAccount.user_id}]`);
  if (adminAccount) {
    console.log(` - Admin Account: ${adminAccount.name} (${adminAccount.email}) [ID: ${adminAccount.user_id}]`);
  }
  console.log();

  // 2. Targeted Deletion of Dependent Data
  const evals = await prisma.evaluation.deleteMany({});
  const meetings = await prisma.meeting.deleteMany({});
  const comments = await prisma.taskComment.deleteMany({});
  const tasks = await prisma.task.deleteMany({});
  const docs = await prisma.document.deleteMany({});
  const msgs = await prisma.message.deleteMany({});
  const milestones = await prisma.milestone.deleteMany({});
  const mReqs = await prisma.mentorshipRequest.deleteMany({});
  const jReqs = await prisma.joinRequest.deleteMany({});
  const teamMembers = await prisma.teamMember.deleteMany({});
  const teams = await prisma.team.deleteMany({});
  const projects = await prisma.project.deleteMany({});
  const notifications = await prisma.notification.deleteMany({});
  const auditLogs = await prisma.auditLog.deleteMany({});
  const otps = await prisma.otpVerification.deleteMany({});
  const pendings = await prisma.pendingRegistration.deleteMany({});
  
  const studentProfiles = await prisma.studentProfile.deleteMany({});
  
  // Count test students and non-preserved faculty before deletion
  const testStudentsCount = await prisma.user.count({
    where: {
      role: 'STUDENT',
      user_id: { notIn: keepUserIds }
    }
  });

  const otherFacultyCount = await prisma.user.count({
    where: {
      role: 'MENTOR',
      user_id: { notIn: keepUserIds }
    }
  });

  // Delete non-preserved Mentor Profiles
  await prisma.mentorProfile.deleteMany({
    where: {
      user_id: { notIn: keepUserIds }
    }
  });

  // Delete non-preserved Users
  const usersDeleted = await prisma.user.deleteMany({
    where: {
      user_id: { notIn: keepUserIds }
    }
  });

  // Verify ProjectCounter sequence is intact and NOT reset
  const counter = await prisma.projectCounter.findUnique({ where: { id: 1 } });

  console.log('\n==================================================');
  console.log('   DATA CLEANUP COMPLETE METRICS REPORT           ');
  console.log('==================================================');
  console.log(`Students removed:                    ${testStudentsCount}`);
  console.log(`Projects removed:                    ${projects.count}`);
  console.log(`Teams removed:                       ${teams.count}`);
  console.log(`Project Members removed:             ${teamMembers.count}`);
  console.log(`Join Requests removed:               ${jReqs.count}`);
  console.log(`Mentor Requests removed:             ${mReqs.count}`);
  console.log(`Meetings removed:                    ${meetings.count}`);
  console.log(`Other related test records removed:  ${evals.count + comments.count + tasks.count + docs.count + msgs.count + milestones.count + notifications.count + auditLogs.count + otps.count + pendings.count}`);
  console.log(`Faculty accounts removed:            ${otherFacultyCount}`);
  console.log('==================================================');
  console.log(`ProjectCounter last_val preserved:   ${counter?.last_val ?? 'N/A'}`);
  console.log('==================================================\n');

  console.log('Exactly ONE Faculty testing account remains.');
  console.log('All other test users, projects, teams, requests, meetings, and related test data have been removed.\n');

  await prisma.$disconnect();
}

cleanupTestData().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
