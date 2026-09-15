import { PrismaClient } from '@prisma/client';
import { resolveDepartment } from '../src/utils/departmentResolver';

const prisma = new PrismaClient();

async function fixUserDepartments() {
  console.log('=== FIXING USER DEPARTMENT MAPPINGS ===');

  const users = await prisma.user.findMany({
    include: { department: true }
  });

  const csbsDept = await prisma.department.findFirst({
    where: {
      department_name: { contains: 'Computer Science & Business Systems', mode: 'insensitive' }
    }
  });

  if (!csbsDept) {
    throw new Error('CSBS department not found in database!');
  }

  console.log(`CSBS Department ID in database: ${csbsDept.department_id} ("${csbsDept.department_name}")`);

  for (const user of users) {
    // If user's email indicates CB (Computer Science & Business Systems) or if department_id is incorrectly 8 (AIDS)
    if (user.email.includes('.cb') && user.department_id !== csbsDept.department_id) {
      console.log(`Fixing user ${user.name} (${user.email}): Changing dept_id ${user.department_id} -> ${csbsDept.department_id}`);
      await prisma.user.update({
        where: { user_id: user.user_id },
        data: { department_id: csbsDept.department_id }
      });
    }
  }

  console.log('\n=== VERIFYING FINAL USER DATA ===');
  const updatedUsers = await prisma.user.findMany({
    include: { department: true }
  });

  updatedUsers.forEach(u => {
    console.log(`User: ${u.name} (${u.email}) | Dept ID: ${u.department_id} | Dept Name: "${u.department?.department_name}" | Student ID: ${u.student_id}`);
  });
}

fixUserDepartments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
