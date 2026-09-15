import prisma from '../config/db';
import { getPublishedProjects } from '../controllers/projectController';

async function debugBrowse() {
  const gomathi = await prisma.user.findFirst({
    where: { email: 'gomathisankarn.al24@bitsathy.ac.in' },
    include: { department: true }
  });

  if (!gomathi) {
    console.error('Gomathi not found!');
    return;
  }

  console.log('User Gomathi:', {
    user_id: gomathi.user_id,
    name: gomathi.name,
    email: gomathi.email,
    role: gomathi.role,
    department_id: gomathi.department_id,
    dept_type: typeof gomathi.department_id,
    department_name: gomathi.department?.department_name
  });

  const req: any = {
    user: {
      user_id: gomathi.user_id,
      email: gomathi.email,
      role: gomathi.role,
      name: gomathi.name,
      department_id: gomathi.department_id
    },
    query: {}
  };

  let resData: any = null;
  const res: any = {
    json: (data: any) => { resData = data; return data; },
    status: () => res
  };

  await getPublishedProjects(req, res);

  console.log('\n--- GET PUBLISHED PROJECTS API RESULT FOR GOMATHI ---');
  console.log(JSON.stringify(resData, null, 2));
}

debugBrowse();
