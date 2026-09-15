import prisma from '../config/db';
import bcrypt from 'bcryptjs';

async function main() {
  let cseDept = await prisma.department.findFirst({
    where: { department_name: { contains: 'Computer Science' } }
  });
  if (!cseDept) {
    cseDept = await prisma.department.findFirst();
  }

  const defaultPassword = await bcrypt.hash('DefaultPassword@2026', 10);

  const faculty = await prisma.user.upsert({
    where: { email: 'drsmith@bitsathy.ac.in' },
    update: {
      name: 'Dr. Smith',
      role: 'MENTOR',
      status: 'ACTIVE',
      profile_completed: false,
      email_verified: true,
      department_id: cseDept ? cseDept.department_id : 1
    },
    create: {
      name: 'Dr. Smith',
      email: 'drsmith@bitsathy.ac.in',
      password_hash: defaultPassword,
      role: 'MENTOR',
      department_id: cseDept ? cseDept.department_id : 1,
      email_verified: true,
      status: 'ACTIVE',
      profile_completed: false,
      mentor_profile: {
        create: {
          expertise: JSON.stringify(['Artificial Intelligence', 'Machine Learning', 'Web Development']),
          research_interests: JSON.stringify(['Cloud Systems', 'Cybersecurity']),
          availability: 'Available',
          mentoring_capacity: 5,
          current_load: 0
        }
      }
    },
    include: {
      department: true,
      mentor_profile: true
    }
  });

  const existingProfile = await prisma.mentorProfile.findUnique({
    where: { user_id: faculty.user_id }
  });

  if (!existingProfile) {
    await prisma.mentorProfile.create({
      data: {
        user_id: faculty.user_id,
        expertise: JSON.stringify(['Artificial Intelligence', 'Machine Learning', 'Web Development']),
        research_interests: JSON.stringify(['Cloud Systems', 'Cybersecurity']),
        availability: 'Available',
        mentoring_capacity: 5,
        current_load: 0
      }
    });
  }

  console.log('=== SUCCESS: drsmith@bitsathy.ac.in Faculty user seeded in DB ===');
  console.log(JSON.stringify(faculty, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
