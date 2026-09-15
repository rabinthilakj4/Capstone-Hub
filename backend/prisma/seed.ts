import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
  console.log('Seeding Capstone Hub database with official departments, skills catalog, and system settings...');

  // Create 20 Engineering Departments with Official Codes
  for (const [deptName, deptCode] of Object.entries(DEPT_CODE_MAP)) {
    await prisma.department.upsert({
      where: { department_name: deptName },
      create: { department_name: deptName, department_code: deptCode, status: 'ACTIVE' },
      update: { department_code: deptCode, status: 'ACTIVE' }
    });
  }

  // Create Skills Catalog
  const technicalSkills = [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Node.js', 'Express.js',
    'Java', 'Python', 'C', 'C++', 'SQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'REST API',
    'Git', 'GitHub', 'Docker', 'Cloud Computing', 'Artificial Intelligence', 'Machine Learning',
    'Data Science', 'UI/UX Design', 'Cybersecurity', 'DevOps', 'Mobile App Development',
    'Web Development', 'Database Management', 'API Development', 'Full Stack Development'
  ];

  const toolsAndTech = [
    'VS Code', 'Antigravity IDE', 'Postman', 'pgAdmin', 'MongoDB Compass',
    'Firebase Console', 'Figma', 'Canva', 'Docker Desktop', 'npm', 'Vite',
    'Android Studio', 'IntelliJ IDEA', 'Eclipse', 'Jupyter Notebook', 'Google Colab',
    'Microsoft Azure', 'AWS', 'Google Cloud', 'Netlify', 'Vercel'
  ];

  const projectSkills = [
    'Project Management', 'Team Collaboration', 'Leadership', 'Communication',
    'Problem Solving', 'Research', 'Presentation', 'Mentoring', 'Technical Writing',
    'Requirement Analysis', 'System Design', 'Project Planning', 'Agile Methodology',
    'Scrum', 'Version Control'
  ];

  const allSkillsToSeed = Array.from(new Set([...technicalSkills, ...toolsAndTech, ...projectSkills]));
  for (const s of allSkillsToSeed) {
    await prisma.skill.upsert({
      where: { skill_name: s },
      create: { skill_name: s },
      update: {}
    });
  }

  // Default System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'MATCHING_WEIGHTS' },
    create: {
      key: 'MATCHING_WEIGHTS',
      value: JSON.stringify({
        team: { skillMatch: 0.40, interestMatch: 0.25, domainMatch: 0.20, departmentDiversity: 0.10, availability: 0.05 },
        mentor: { expertiseMatch: 0.40, domainMatch: 0.25, researchInterest: 0.15, availability: 0.10, experience: 0.10 }
      })
    },
    update: {}
  });

  console.log('Capstone Hub metadata seeding completed! No automatic user accounts were created.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
