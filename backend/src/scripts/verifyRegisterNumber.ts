import prisma from '../config/db';

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'rabinthilakj.cb24@bitsathy.ac.in' },
    include: { department: true, student_profile: true, mentor_profile: true }
  });

  console.log('=== USER RECORD IN DB ===');
  console.log('user_id:', user?.user_id);
  console.log('email:', user?.email);
  console.log('name:', user?.name);
  console.log('student_id (Register Number):', user?.student_id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
