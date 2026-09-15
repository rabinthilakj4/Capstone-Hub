import prisma from '../config/db';

async function main() {
  const models = [
    'department', 'user', 'studentProfile', 'mentorProfile', 'project',
    'team', 'teamMember', 'mentorshipRequest', 'milestone', 'document',
    'message', 'notification', 'auditLog', 'otpVerification',
    'pendingRegistration', 'systemSetting', 'skill', 'task',
    'taskComment', 'meeting', 'evaluation'
  ] as const;

  console.log('=== DATABASE AUDIT REPORT (CLEAN STATE) ===');
  const results: Record<string, number> = {};

  for (const m of models) {
    if ((prisma as any)[m]) {
      const count = await (prisma as any)[m].count();
      results[m] = count;
    }
  }

  console.table(results);
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
