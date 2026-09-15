import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      student_profile: true,
      mentor_profile: true,
      department: true
    }
  });

  console.log(`Total users in DB: ${users.length}`);
  users.forEach(u => {
    console.log(`- Email: ${u.email} | Role: ${u.role} | ProfileCompleted: ${u.profile_completed} | StudentProf: ${!!u.student_profile} | MentorProf: ${!!u.mentor_profile} | Dept: ${u.department?.department_name || 'None'}`);
  });
}

main().finally(() => prisma.$disconnect());
