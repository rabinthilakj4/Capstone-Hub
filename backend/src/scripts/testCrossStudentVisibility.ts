import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { getPublishedProjects, createProject } from '../controllers/projectController';

async function testCrossStudentVisibility() {
  console.log('==================================================');
  console.log('   TESTING STUDENT A -> STUDENT B PROJECT VISIBILITY ');
  console.log('==================================================\n');

  // 1. Get CSE and ECE departments
  const cseDept = await prisma.department.findFirst({ where: { department_code: 'CSE' } }) || await prisma.department.findFirst();
  const eceDept = await prisma.department.findFirst({ where: { department_code: 'ECE' } }) || await prisma.department.findFirst();

  if (!cseDept || !eceDept) {
    console.error('Departments not found');
    return;
  }

  const hashedPassword = await bcrypt.hash('TestPass123!', 10);

  // 2. Setup Student A (CSE, 3rd Year)
  const studentA = await prisma.user.upsert({
    where: { email: 'studentA.cs23@bitsathy.ac.in' },
    update: { department_id: cseDept.department_id, profile_completed: true, status: 'ACTIVE' },
    create: {
      name: 'Student A (CSE)',
      email: 'studentA.cs23@bitsathy.ac.in',
      password_hash: hashedPassword,
      role: 'STUDENT',
      department_id: cseDept.department_id,
      email_verified: true,
      profile_completed: true,
      student_profile: {
        create: {
          year: '3rd Year',
          skills: JSON.stringify(['React', 'Node.js', 'Python']),
          interests: JSON.stringify(['AI', 'Web']),
          preferred_domains: JSON.stringify(['Artificial Intelligence']),
          availability: 'Available',
          portfolio_links: '[]'
        }
      }
    },
    include: { student_profile: true, department: true }
  });

  // Ensure Student A has student_profile
  await prisma.studentProfile.upsert({
    where: { user_id: studentA.user_id },
    update: { year: '3rd Year' },
    create: {
      user_id: studentA.user_id,
      year: '3rd Year',
      skills: JSON.stringify(['React', 'Node.js', 'Python']),
      interests: JSON.stringify(['AI', 'Web']),
      preferred_domains: JSON.stringify(['Artificial Intelligence']),
      availability: 'Available',
      portfolio_links: '[]'
    }
  });

  // 3. Setup Student B (CSE, 3rd Year - Same Dept & Year as A)
  const studentB = await prisma.user.upsert({
    where: { email: 'studentB.cs23@bitsathy.ac.in' },
    update: { department_id: cseDept.department_id, profile_completed: true, status: 'ACTIVE' },
    create: {
      name: 'Student B (CSE)',
      email: 'studentB.cs23@bitsathy.ac.in',
      password_hash: hashedPassword,
      role: 'STUDENT',
      department_id: cseDept.department_id,
      email_verified: true,
      profile_completed: true,
      student_profile: {
        create: {
          year: '3rd Year',
          skills: JSON.stringify(['React', 'Node.js', 'Python']),
          interests: JSON.stringify(['AI', 'Web']),
          preferred_domains: JSON.stringify(['Artificial Intelligence']),
          availability: 'Available',
          portfolio_links: '[]'
        }
      }
    },
    include: { student_profile: true, department: true }
  });

  await prisma.studentProfile.upsert({
    where: { user_id: studentB.user_id },
    update: { year: '3rd Year' },
    create: {
      user_id: studentB.user_id,
      year: '3rd Year',
      skills: JSON.stringify(['React', 'Node.js', 'Python']),
      interests: JSON.stringify(['AI', 'Web']),
      preferred_domains: JSON.stringify(['Artificial Intelligence']),
      availability: 'Available',
      portfolio_links: '[]'
    }
  });

  // 4. Setup Student C (ECE, 3rd Year - Different Dept)
  const studentC = await prisma.user.upsert({
    where: { email: 'studentC.ec23@bitsathy.ac.in' },
    update: { department_id: eceDept.department_id, profile_completed: true, status: 'ACTIVE' },
    create: {
      name: 'Student C (ECE)',
      email: 'studentC.ec23@bitsathy.ac.in',
      password_hash: hashedPassword,
      role: 'STUDENT',
      department_id: eceDept.department_id,
      email_verified: true,
      profile_completed: true,
      student_profile: {
        create: {
          year: '3rd Year',
          skills: JSON.stringify(['Embedded C', 'IoT']),
          interests: JSON.stringify(['Hardware']),
          preferred_domains: JSON.stringify(['Internet of Things (IoT)']),
          availability: 'Available',
          portfolio_links: '[]'
        }
      }
    },
    include: { student_profile: true, department: true }
  });

  await prisma.studentProfile.upsert({
    where: { user_id: studentC.user_id },
    update: { year: '3rd Year' },
    create: {
      user_id: studentC.user_id,
      year: '3rd Year',
      skills: JSON.stringify(['Embedded C', 'IoT']),
      interests: JSON.stringify(['Hardware']),
      preferred_domains: JSON.stringify(['Internet of Things (IoT)']),
      availability: 'Available',
      portfolio_links: '[]'
    }
  });

  console.log('[STEP 1] Created test users:');
  console.log(` - Student A: ${studentA.email} (Dept: ${cseDept.department_name}, ID: ${cseDept.department_id})`);
  console.log(` - Student B: ${studentB.email} (Dept: ${cseDept.department_name}, ID: ${cseDept.department_id})`);
  console.log(` - Student C: ${studentC.email} (Dept: ${eceDept.department_name}, ID: ${eceDept.department_id})\n`);

  // 5. Clean existing projects created by test users
  await prisma.project.deleteMany({
    where: { created_by: { in: [studentA.user_id, studentB.user_id, studentC.user_id] } }
  });

  // 6. Student A creates a Project
  console.log('[STEP 2] Student A creating project...');
  const reqCreate: any = {
    user: {
      user_id: studentA.user_id,
      email: studentA.email,
      role: 'STUDENT',
      name: studentA.name,
      department_id: studentA.department_id
    },
    body: {
      title: 'AI Smart Healthcare System Test Project',
      abstract: 'An automated diagnostic system using machine learning and React dashboard.',
      problem_statement: 'Healthcare diagnostics are delayed in rural areas.',
      proposed_solution: 'AI based triaging system.',
      domain: 'Artificial Intelligence & Machine Learning',
      description: 'Comprehensive health monitoring',
      objectives: ['Deploy ML model', 'Build React dashboard'],
      required_skills: ['Python', 'React', 'Machine Learning'],
      required_departments: [cseDept.department_id],
      eligible_years: ['3rd Year', '4th Year'],
      team_size: 4,
      technologies: ['React', 'Python', 'FastAPI'],
      hardware_requirements: 'None',
      expected_outcome: 'Working prototype',
      duration: '2 Semesters',
      difficulty_level: 'Intermediate',
      preferred_mentor_expertise: ['Machine Learning']
    }
  };

  let createResData: any = null;
  const resCreate: any = {
    status: (code: number) => ({
      json: (data: any) => { createResData = data; return data; }
    }),
    json: (data: any) => { createResData = data; return data; }
  };

  await createProject(reqCreate, resCreate);
  console.log('Project creation response:', createResData?.success ? 'SUCCESS' : 'FAILED', createResData?.message);
  console.log('Created Project ID:', createResData?.project?.project_id);
  console.log('Created Project status:', createResData?.project?.status);
  console.log('Created Project target_department_id:', createResData?.project?.target_department_id);
  console.log('Created Project required_departments:', createResData?.project?.required_departments);
  console.log('Created Project eligible_years:', createResData?.project?.eligible_years);

  // 7. Student B logs in & calls getPublishedProjects
  console.log('\n[STEP 3] Student B (same CSE dept & year) fetching Browse Projects...');
  const reqB: any = {
    user: {
      user_id: studentB.user_id,
      email: studentB.email,
      role: 'STUDENT',
      name: studentB.name,
      department_id: studentB.department_id
    },
    query: {}
  };

  let resBData: any = null;
  const resB: any = {
    status: (code: number) => ({
      json: (data: any) => { resBData = data; return data; }
    }),
    json: (data: any) => { resBData = data; return data; }
  };

  await getPublishedProjects(reqB, resB);
  console.log(`Student B API Result Count: ${resBData?.count}`);
  console.log(`Student B Projects Returned:`, resBData?.projects?.map((p: any) => ({
    id: p.project_id,
    title: p.title,
    created_by: p.created_by,
    target_dept: p.target_department_id,
    req_depts: p.required_departments,
    match_score: p.match_score
  })));

  // 8. Student C (different ECE dept) calls getPublishedProjects
  console.log('\n[STEP 4] Student C (different ECE dept) fetching Browse Projects...');
  const reqC: any = {
    user: {
      user_id: studentC.user_id,
      email: studentC.email,
      role: 'STUDENT',
      name: studentC.name,
      department_id: studentC.department_id
    },
    query: {}
  };

  let resCData: any = null;
  const resC: any = {
    status: (code: number) => ({
      json: (data: any) => { resCData = data; return data; }
    }),
    json: (data: any) => { resCData = data; return data; }
  };

  await getPublishedProjects(reqC, resC);
  console.log(`Student C API Result Count: ${resCData?.count}`);
  console.log(`Student C Projects Returned:`, resCData?.projects?.map((p: any) => ({
    id: p.project_id,
    title: p.title,
    created_by: p.created_by
  })));
}

testCrossStudentVisibility()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
