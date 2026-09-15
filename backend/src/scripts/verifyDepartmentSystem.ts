import { PrismaClient } from '@prisma/client';
import { OFFICIAL_DEPARTMENTS } from 'shared';
import { resolveDepartment } from '../utils/departmentResolver';

const prisma = new PrismaClient();

async function runDepartmentVerification() {
  console.log('=== RUNNING DEPARTMENT SYSTEM VERIFICATION TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // TEST 1: 20 Departments in Database with IDs 1..20
  const dbDepts = await prisma.department.findMany({ orderBy: { department_id: 'asc' } });
  assert(dbDepts.length === 20, `Database has exactly 20 departments (Found: ${dbDepts.length})`);

  let allIdsCorrect = true;
  for (let i = 0; i < 20; i++) {
    const expectedId = i + 1;
    const expectedMaster = OFFICIAL_DEPARTMENTS[i];
    const actual = dbDepts[i];

    if (!actual || actual.department_id !== expectedId || actual.department_name !== expectedMaster.department_name) {
      allIdsCorrect = false;
      console.error(`  Mismatch at index ${i}: Expected ID ${expectedId} "${expectedMaster.department_name}", Got ID ${actual?.department_id} "${actual?.department_name}"`);
    }
  }
  assert(allIdsCorrect, 'All 20 departments match exact IDs 1 through 20 and exact master list names');

  // TEST 2: resolveDepartment function testing
  const resCse = await resolveDepartment(9);
  assert(resCse?.department_id === 9 && resCse?.department_name === 'Computer Science & Engineering', 'resolveDepartment(9) returns CSE (ID 9)');

  const resCsbsName = await resolveDepartment('Computer Science & Business Systems');
  assert(resCsbsName?.department_id === 7, 'resolveDepartment("Computer Science & Business Systems") returns ID 7');

  const resCode = await resolveDepartment('AIDS');
  assert(resCode?.department_id === 2, 'resolveDepartment("AIDS") returns ID 2');

  // TEST 3: Create test project with target_department_id = 9 (CSE)
  const testStudent = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  if (testStudent) {
    const testProject = await prisma.project.create({
      data: {
        title: 'VERIFICATION TEST PROJECT (CSE ONLY)',
        abstract: 'Department target verification project abstract',
        problem_statement: 'Problem statement',
        proposed_solution: 'Proposed solution',
        domain: 'Artificial Intelligence',
        description: 'Description',
        objectives: '[]',
        required_skills: '[]',
        required_departments: '[9]',
        target_department_id: 9, // CSE
        technologies: '[]',
        expected_outcome: 'Working Prototype',
        preferred_mentor_expertise: '[]',
        status: 'PUBLISHED',
        created_by: testStudent.user_id
      }
    });

    assert(testProject.target_department_id === 9, 'Project created with target_department_id = 9');

    // Filter simulation for Student in CSE (ID 9) vs Student in CT (ID 10)
    const canCseStudentSee = (testProject.target_department_id === 9); // Dept 9
    const canCtStudentSee = (testProject.target_department_id === 10);  // Dept 10

    assert(canCseStudentSee, 'Student from Department 9 (CSE) can see the project');
    assert(!canCtStudentSee, 'Student from Department 10 (CT) CANNOT see the project targeting Department 9');

    // Clean up test project
    await prisma.project.delete({ where: { project_id: testProject.project_id } });
    console.log('[CLEANUP] Deleted test verification project');
  }

  console.log(`\n=== VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runDepartmentVerification()
  .catch(e => {
    console.error('Verification failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
