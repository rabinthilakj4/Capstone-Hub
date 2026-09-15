import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  // Update User A
  await prisma.user.update({
    where: { email: 'vishnumoorthyr.cb24@bitsathy.ac.in' },
    data: { password_hash: hash }
  });

  // Update User B & ensure department is set to another dept (e.g., Dept ID 16 - Information Science / IT)
  const itDept = await prisma.department.findFirst({
    where: { department_name: { contains: 'Information' } }
  });

  if (itDept) {
    await prisma.user.update({
      where: { email: 'rabinthilakj.cb24@bitsathy.ac.in' },
      data: {
        password_hash: hash,
        department_id: itDept.department_id
      }
    });
  } else {
    await prisma.user.update({
      where: { email: 'rabinthilakj.cb24@bitsathy.ac.in' },
      data: { password_hash: hash }
    });
  }

  // Ensure student profiles exist with years
  const profileA = await prisma.studentProfile.findUnique({
    where: { user_id: '09606776-5835-45f1-ba39-7d7666bf30d0' }
  });
  if (profileA) {
    await prisma.studentProfile.update({
      where: { user_id: '09606776-5835-45f1-ba39-7d7666bf30d0' },
      data: { year: '3rd Year', skills: JSON.stringify(['React', 'Node.js', 'PostgreSQL']) }
    });
  }

  const profileB = await prisma.studentProfile.findUnique({
    where: { user_id: 'f5039545-0aa5-4307-913f-03d25b752039' }
  });
  if (profileB) {
    await prisma.studentProfile.update({
      where: { user_id: 'f5039545-0aa5-4307-913f-03d25b752039' },
      data: { year: '3rd Year', skills: JSON.stringify(['Python', 'Machine Learning', 'Docker']) }
    });
  }

  console.log('Setup test users successfully!');
}

main().finally(() => prisma.$disconnect());
