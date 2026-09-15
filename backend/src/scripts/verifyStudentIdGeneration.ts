import prisma from '../config/db';
import { generateNextStudentId } from '../utils/studentIdGenerator';

async function testGeneration() {
  console.log('--- Testing Department & Year Student ID Generation ---');

  const csbs = await prisma.department.findFirst({ where: { department_code: 'CSBS' } });
  const ece = await prisma.department.findFirst({ where: { department_code: 'ECE' } });

  if (!csbs || !ece) {
    console.error('CSBS or ECE department not found!');
    process.exit(1);
  }

  const csbs1 = await generateNextStudentId(csbs.department_id, '1st Year');
  const csbs2 = await generateNextStudentId(csbs.department_id, '2nd Year');
  const csbs3 = await generateNextStudentId(csbs.department_id, '3rd Year');
  const ece1 = await generateNextStudentId(ece.department_id, '1st Year');
  const ece2 = await generateNextStudentId(ece.department_id, '2nd Year');

  console.log(`CSBS 1st Year Generated ID: ${csbs1}`);
  console.log(`CSBS 2nd Year Generated ID: ${csbs2}`);
  console.log(`CSBS 3rd Year Generated ID: ${csbs3}`);
  console.log(`ECE 1st Year Generated ID: ${ece1}`);
  console.log(`ECE 2nd Year Generated ID: ${ece2}`);

  console.log('\n--- Validation Result ---');
  if (
    csbs1.startsWith('CSBS1') &&
    csbs2.startsWith('CSBS2') &&
    csbs3.startsWith('CSBS3') &&
    ece1.startsWith('ECE1') &&
    ece2.startsWith('ECE2')
  ) {
    console.log('✅ ALL TEST CASES PASSED SUCCESSFULLY!');
  } else {
    console.log('❌ TEST FAILED - Incorrect prefix format!');
  }

  process.exit(0);
}

testGeneration();
