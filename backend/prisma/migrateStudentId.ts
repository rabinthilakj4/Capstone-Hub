import { PrismaClient } from '@prisma/client';
import { generateNextStudentId } from '../src/utils/studentIdGenerator';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('Starting migration to add student_id column to User and PendingRegistration tables...');

  try {
    // 1. Add student_id column to User table if not exists
    console.log('1. Adding student_id to User table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "student_id" VARCHAR(50);`);

    // Ensure UNIQUE constraint on student_id in User table
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD CONSTRAINT "User_student_id_key" UNIQUE ("student_id");`);
    } catch (e) {
      console.log('Unique constraint User_student_id_key already exists.');
    }

    // 2. Add student_id column to PendingRegistration table if not exists
    console.log('2. Adding student_id to PendingRegistration table...');
    await prisma.$executeRawUnsafe(`ALTER TABLE "PendingRegistration" ADD COLUMN IF NOT EXISTS "student_id" VARCHAR(50);`);

    // 3. Backfill student_id for existing STUDENT records in User table
    console.log('3. Backfilling student_id for existing students...');
    const studentsWithoutId = await prisma.user.findMany({
      where: {
        role: 'STUDENT',
        student_id: null
      }
    });

    for (const student of studentsWithoutId) {
      const generatedId = await generateNextStudentId(student.department_id, student.email);
      console.log(`Assigning student_id ${generatedId} to student ${student.name} (${student.email})`);
      await prisma.user.update({
        where: { user_id: student.user_id },
        data: { student_id: generatedId }
      });
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
