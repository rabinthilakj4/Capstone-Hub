import prisma from '../config/db';
import { parseBitSathyEmail } from '../controllers/authController';

async function testAccessRules(email: string) {
  const cleanEmail = email.trim().toLowerCase();
  const adminEmail = (process.env.ADMIN_EMAIL || 'rabinthilakj@gmail.com').trim().toLowerCase();

  const isAdmin = cleanEmail === adminEmail;
  const isBitSathy = cleanEmail.endsWith('@bitsathy.ac.in');

  if (!isAdmin && !isBitSathy) {
    return { status: 403, message: 'Access Denied. Only official @bitsathy.ac.in accounts or authorized Admin accounts are permitted.' };
  }

  if (isAdmin) {
    return { status: 200, role: 'ADMIN', profile_completed: true };
  }

  const parsed = parseBitSathyEmail(cleanEmail);
  return { status: 200, role: parsed.role, parsedInfo: parsed };
}

async function main() {
  console.log('Test 1 (Admin):', await testAccessRules('rabinthilakj@gmail.com'));
  console.log('Test 2 (Student):', await testAccessRules('rabinthilakj.cb24@bitsathy.ac.in'));
  console.log('Test 3 (Staff):', await testAccessRules('gayathirib@bitsathy.ac.in'));
  console.log('Test 4 (Unauthorized):', await testAccessRules('someuser@gmail.com'));
}

main().catch(console.error).finally(() => prisma.$disconnect());
