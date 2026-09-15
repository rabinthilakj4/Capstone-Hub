import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  console.log('--- DEPARTMENTS ---');
  const depts = await prisma.department.findMany();
  console.log(depts);

  console.log('--- USERS ---');
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ id: u.user_id, student_id: u.student_id, email: u.email, dept_id: u.department_id })));
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
