import prisma from '../config/db';

async function cleanAdmins() {
  console.log('Cleaning up unwanted admin records from database...');

  // Delete any user with role ADMIN or email admin@... where email is NOT rabinthilakj@gmail.com
  const deleted = await prisma.user.deleteMany({
    where: {
      OR: [
        { role: 'ADMIN', email: { not: 'rabinthilakj@gmail.com' } },
        { email: { startsWith: 'admin@' } }
      ]
    }
  });

  console.log(`Deleted ${deleted.count} unwanted admin record(s).`);

  const remainingAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { user_id: true, email: true, name: true, role: true }
  });

  console.log('Remaining ADMIN accounts in DB:');
  console.table(remainingAdmins);
}

cleanAdmins()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
