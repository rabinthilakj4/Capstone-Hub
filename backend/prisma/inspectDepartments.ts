import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  console.log('=== DEPARTMENTS IN POSTGRESQL ===');
  const depts = await prisma.department.findMany({
    orderBy: { department_id: 'asc' }
  });

  depts.forEach(d => {
    console.log(`ID: ${d.department_id} -> Name: "${d.department_name}"`);
  });

  console.log('\n=== USERS IN POSTGRESQL ===');
  const users = await prisma.user.findMany({
    include: { department: true }
  });

  users.forEach(u => {
    console.log(`User: ${u.name} (${u.email}) | Dept ID: ${u.department_id} | Dept Name: "${u.department?.department_name}" | Student ID: ${u.student_id}`);
  });
}

inspect()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
