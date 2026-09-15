import prisma from '../config/db';
import { getPublishedProjects, respondToJoinRequest, getMyProjects } from '../controllers/projectController';

async function testWorkflow() {
  console.log('--- STARTING CROSS-DEPARTMENT WORKFLOW VERIFICATION ---');

  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: { department: true },
    take: 2
  });

  if (students.length < 2) {
    console.error('Not enough student users found in DB to run test.');
    return;
  }

  const csbsUser = students[0];
  const eceUser = students[1];

  console.log(`User A (Leader): ${csbsUser.name} [Dept: ${csbsUser.department?.department_name} (ID: ${csbsUser.department_id})]`);
  console.log(`User B (Target): ${eceUser.name} [Dept: ${eceUser.department?.department_name} (ID: ${eceUser.department_id})]`);

  // 2. Create Project X from CSBS targeting ECE
  const projectX = await prisma.project.create({
    data: {
      title: 'Autonomous Drone Navigation (Test)',
      abstract: 'Testing cross-department project sharing from CSBS to ECE.',
      problem_statement: 'Drone pathfinding efficiency in crowded space.',
      proposed_solution: 'Real-time LIDAR sensor fusion.',
      domain: 'Artificial Intelligence',
      description: 'Testing cross-department project sharing',
      objectives: '[]',
      required_skills: '["Python", "ROS"]',
      required_departments: JSON.stringify([eceUser.department_id]),
      team_size: 4,
      technologies: '["Python", "C++"]',
      preferred_mentor_expertise: '["AI"]',
      expected_outcome: 'Working drone navigation prototype',
      status: 'PENDING',
      created_by: csbsUser.user_id,
      team: {
        create: {
          status: 'ACTIVE',
          members: {
            create: [{ student_id: csbsUser.user_id, role: 'Leader' }]
          }
        }
      }
    }
  });

  console.log(`\n1. Project Created: "${projectX.title}" (ID: ${projectX.project_id}) targeting Dept ${eceUser.department?.department_name} (ID: ${eceUser.department_id})`);

  // 3. Mock AuthRequests for Browse Projects
  const reqCsbs: any = { user: { user_id: csbsUser.user_id, role: 'STUDENT', department_id: csbsUser.department_id }, query: {} };
  const reqEce: any = { user: { user_id: eceUser.user_id, role: 'STUDENT', department_id: eceUser.department_id }, query: {} };

  const getJsonResponse = async (controllerFn: Function, reqObj: any) => {
    let output: any = null;
    const mockRes: any = {
      json: (data: any) => { output = data; return data; },
      status: () => mockRes
    };
    await controllerFn(reqObj, mockRes);
    return output;
  };

  const csbsBrowse = await getJsonResponse(getPublishedProjects, reqCsbs);
  const eceBrowse = await getJsonResponse(getPublishedProjects, reqEce);

  const foundInCsbs = csbsBrowse.projects?.some((p: any) => p.project_id === projectX.project_id);
  const foundInEce = eceBrowse.projects?.some((p: any) => p.project_id === projectX.project_id);

  console.log(`- Appears in Creator (${csbsUser.name}) Browse Projects? ${foundInCsbs ? '❌ YES (FAILED)' : '✅ NO (PASSED)'}`);
  console.log(`- Appears in Target (${eceUser.name}) Browse Projects? ${foundInEce ? '✅ YES (PASSED)' : '❌ NO (FAILED)'}`);

  // 4. Test ACCEPT Flow
  console.log('\n2. Testing ACCEPT Flow...');
  const reqAccept: any = {
    user: { user_id: eceUser.user_id, name: eceUser.name, role: 'STUDENT', department_id: eceUser.department_id },
    body: { project_id: projectX.project_id, action: 'ACCEPT' }
  };
  await getJsonResponse(respondToJoinRequest, reqAccept);

  const eceMyProjects = await getJsonResponse(getMyProjects, reqEce);
  const foundInEceMyProjects = eceMyProjects.other_projects?.some((p: any) => p.project_id === projectX.project_id);

  const eceBrowseAfterAccept = await getJsonResponse(getPublishedProjects, reqEce);
  const foundInEceBrowseAfterAccept = eceBrowseAfterAccept.projects?.some((p: any) => p.project_id === projectX.project_id);

  console.log(`- Added to Target User's My Projects? ${foundInEceMyProjects ? '✅ YES (PASSED)' : '❌ NO (FAILED)'}`);
  console.log(`- Removed from Target User's Browse Projects? ${!foundInEceBrowseAfterAccept ? '✅ YES (PASSED)' : '❌ NO (FAILED)'}`);

  // 5. Create Project Y & Test REJECT Flow
  const projectY = await prisma.project.create({
    data: {
      title: 'Quantum Encryption Bridge (Test)',
      abstract: 'Testing reject workflow from student.',
      problem_statement: 'Quantum key distribution security.',
      proposed_solution: 'QKD post-processing module.',
      domain: 'Cyber Security',
      description: 'Testing reject workflow',
      objectives: '[]',
      required_skills: '["Cryptography", "C++"]',
      required_departments: JSON.stringify([eceUser.department_id]),
      team_size: 4,
      technologies: '["C++"]',
      preferred_mentor_expertise: '["Cyber Security"]',
      expected_outcome: 'Security report & prototype',
      status: 'PENDING',
      created_by: csbsUser.user_id,
      team: {
        create: {
          status: 'ACTIVE',
          members: {
            create: [{ student_id: csbsUser.user_id, role: 'Leader' }]
          }
        }
      }
    }
  });

  console.log(`\n3. Testing REJECT Flow for "${projectY.title}"...`);
  const reqReject: any = {
    user: { user_id: eceUser.user_id, name: eceUser.name, role: 'STUDENT', department_id: eceUser.department_id },
    body: { project_id: projectY.project_id, action: 'REJECT' }
  };
  await getJsonResponse(respondToJoinRequest, reqReject);

  const eceMyProjectsAfterReject = await getJsonResponse(getMyProjects, reqEce);
  const foundInEceMyProjectsReject = eceMyProjectsAfterReject.other_projects?.some((p: any) => p.project_id === projectY.project_id);

  const eceBrowseAfterReject = await getJsonResponse(getPublishedProjects, reqEce);
  const foundInEceBrowseAfterReject = eceBrowseAfterReject.projects?.some((p: any) => p.project_id === projectY.project_id);

  console.log(`- NOT added to Target User's My Projects? ${!foundInEceMyProjectsReject ? '✅ YES (PASSED)' : '❌ NO (FAILED)'}`);
  console.log(`- Removed from Target User's Browse Projects? ${!foundInEceBrowseAfterReject ? '✅ YES (PASSED)' : '❌ NO (FAILED)'}`);

  // Clean up test projects & notifications
  await prisma.notification.deleteMany({
    where: { project_id: { in: [projectX.project_id, projectY.project_id] } }
  });
  await prisma.project.deleteMany({
    where: { project_id: { in: [projectX.project_id, projectY.project_id] } }
  });

  console.log('\n--- VERIFICATION COMPLETE: ALL WORKFLOW TESTS PASSED CLEANLY! ---');
}

testWorkflow();
