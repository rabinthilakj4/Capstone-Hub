import prisma from '../config/db';

async function backfillStudentIds() {
  console.log('--- Starting Student ID Correction & Backfill Script ---');

  const depts = await prisma.department.findMany({
    orderBy: { department_id: 'asc' }
  });

  const changesReport: Array<{
    userId: string;
    name: string;
    email: string;
    departmentName: string;
    deptCode: string;
    oldStudentId: string | null;
    newStudentId: string;
  }> = [];

  for (const dept of depts) {
    if (!dept.department_code) continue;

    // Fetch all student users belonging to this exact department, ordered by registration time
    const students = await prisma.user.findMany({
      where: {
        department_id: dept.department_id,
        role: 'STUDENT'
      },
      orderBy: { created_at: 'asc' }
    });

    let seq = 1;
    for (const student of students) {
      const expectedId = `${dept.department_code}${String(seq).padStart(3, '0')}`;
      if (student.student_id !== expectedId) {
        changesReport.push({
          userId: student.user_id,
          name: student.name,
          email: student.email,
          departmentName: dept.department_name,
          deptCode: dept.department_code,
          oldStudentId: student.student_id,
          newStudentId: expectedId
        });
      }
      seq++;
    }
  }

  console.log(`\nFound ${changesReport.length} student record(s) requiring Student ID correction.`);
  console.log('--- DRY-RUN REPORT ---');
  console.table(changesReport);

  if (changesReport.length === 0) {
    console.log('All existing student IDs are already correct!');
    process.exit(0);
  }

  console.log('\nApplying student ID corrections to PostgreSQL...');
  for (const item of changesReport) {
    await prisma.user.update({
      where: { user_id: item.userId },
      data: { student_id: item.newStudentId }
    });
    console.log(`Updated User [${item.email}]: ${item.oldStudentId || 'NONE'} -> ${item.newStudentId}`);
  }

  console.log('\nStudent ID correction and backfill completed successfully.');
  process.exit(0);
}

backfillStudentIds().catch(err => {
  console.error('Error during Student ID backfill:', err);
  process.exit(1);
});
