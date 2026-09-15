import prisma from '../config/db';

const DEPT_CODE_MAP: Record<string, string> = {
  'Agricultural Engineering': 'AGRIC',
  'Artificial Intelligence and Data Science': 'AIDS',
  'Artificial Intelligence and Machine Learning': 'AIML',
  'Biomedical Engineering': 'BIOMED',
  'Biotechnology': 'BIOTECH',
  'Civil Engineering': 'CIVIL',
  'Computer Science & Business Systems': 'CSBS',
  'Computer Science & Design': 'CSD',
  'Computer Science & Engineering': 'CSE',
  'Computer Technology': 'CT',
  'Electrical & Electronics Engineering': 'EEE',
  'Electronics & Communication Engineering': 'ECE',
  'Electronics & Instrumentation Engineering': 'EIE',
  'Fashion Technology': 'FASHION',
  'Food Technology': 'FOOD',
  'Information Technology': 'IT',
  'Information Science & Engineering': 'ISE',
  'Mechanical Engineering': 'MECH',
  'Mechatronics Engineering': 'MCT',
  'Textile Technology': 'TEXTILE'
};

async function main() {
  console.log('Seeding department_code values in PostgreSQL...');
  const depts = await prisma.department.findMany();

  for (const dept of depts) {
    const code = DEPT_CODE_MAP[dept.department_name] || dept.department_name.substring(0, 4).toUpperCase();
    await prisma.department.update({
      where: { department_id: dept.department_id },
      data: { department_code: code }
    });
    console.log(`Updated Department [ID ${dept.department_id}]: ${dept.department_name} -> code: ${code}`);
  }

  console.log('All department codes updated successfully.');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
