import { PrismaClient } from '@prisma/client';
import { OFFICIAL_DEPARTMENTS } from '../../shared/src/constants';

const prisma = new PrismaClient();

async function syncDepartments() {
  console.log('Starting Department Master List synchronization (IDs 1 to 20)...');

  // Step 1: Ensure all 20 departments exist with exact IDs 1..20
  for (const dept of OFFICIAL_DEPARTMENTS) {
    const existing = await prisma.department.findUnique({
      where: { department_id: dept.department_id }
    });

    if (existing) {
      await prisma.department.update({
        where: { department_id: dept.department_id },
        data: {
          department_name: dept.department_name,
          department_code: dept.department_code,
          status: 'ACTIVE'
        }
      });
      console.log(`Updated Department [ID ${dept.department_id}]: ${dept.department_name}`);
    } else {
      // Check if a department with this name exists under a different ID
      const byName = await prisma.department.findUnique({
        where: { department_name: dept.department_name }
      });

      if (byName) {
        // Delete or rename old department record before inserting exact ID
        await prisma.department.delete({
          where: { department_id: byName.department_id }
        });
      }

      await prisma.department.create({
        data: {
          department_id: dept.department_id,
          department_name: dept.department_name,
          department_code: dept.department_code,
          status: 'ACTIVE'
        }
      });
      console.log(`Created Department [ID ${dept.department_id}]: ${dept.department_name}`);
    }
  }

  // Step 2: Migrate existing user department IDs
  console.log('Migrating existing User department IDs...');
  const users = await prisma.user.findMany({
    include: { department: true }
  });

  const cseDept = OFFICIAL_DEPARTMENTS.find(d => d.department_code === 'CSE')!; // ID 9
  const csbsDept = OFFICIAL_DEPARTMENTS.find(d => d.department_code === 'CSBS')!; // ID 7

  for (const user of users) {
    let targetDeptId: number | null = null;

    if (user.email.includes('.cb24@') || user.email.includes('.cb') || user.email.includes('csbs')) {
      targetDeptId = csbsDept.department_id; // 7
    } else if (user.department?.department_name) {
      const normName = user.department.department_name.toLowerCase().trim();
      const matched = OFFICIAL_DEPARTMENTS.find(d => d.department_name.toLowerCase().trim() === normName);
      if (matched) {
        targetDeptId = matched.department_id;
      }
    }

    if (!targetDeptId) {
      targetDeptId = cseDept.department_id; // Default fallback to CSE (ID 9)
    }

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: { department_id: targetDeptId }
    });

    console.log(`User ${user.email} (${user.name}) mapped to Department ID ${targetDeptId}`);
  }

  // Step 3: Remove any leftover departments with ID > 20
  const invalidDepts = await prisma.department.findMany({
    where: { department_id: { gt: 20 } }
  });

  for (const inv of invalidDepts) {
    console.log(`Removing leftover department [ID ${inv.department_id}]: ${inv.department_name}`);
    await prisma.department.delete({ where: { department_id: inv.department_id } });
  }

  // Step 4: Verify count and list
  const finalDepts = await prisma.department.findMany({ orderBy: { department_id: 'asc' } });
  console.log(`\nSynchronization Complete! Total Departments: ${finalDepts.length}`);
  finalDepts.forEach(d => {
    console.log(`  ID ${d.department_id.toString().padStart(2, ' ')} | Code: ${d.department_code.padEnd(8, ' ')} | Name: ${d.department_name}`);
  });
}

syncDepartments()
  .catch(err => {
    console.error('Failed to sync departments:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
