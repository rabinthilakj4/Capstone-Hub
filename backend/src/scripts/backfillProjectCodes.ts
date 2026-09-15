import prisma from '../config/db';
import { formatProjectCode, formatTeamCode } from '../utils/projectCodeUtils';

async function backfillProjectCodes() {
  console.log('=== STARTING PROJECT CODE BACKFILL ===\n');

  try {
    // 1. Fetch all projects in order of created_at ASC
    const projects = await prisma.project.findMany({
      include: { team: true },
      orderBy: { created_at: 'asc' }
    });

    console.log(`Found ${projects.length} existing projects in database.\n`);

    let maxAssignedNum = 0;

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      const seqNum = i + 1;
      maxAssignedNum = seqNum;

      const expectedProjectCode = formatProjectCode(seqNum);
      const expectedTeamCode = formatTeamCode(seqNum);

      // Update project if code is missing or needs backfilling
      await prisma.project.update({
        where: { project_id: p.project_id },
        data: { project_code: expectedProjectCode }
      });

      // Update team if present
      if (p.team) {
        await prisma.team.update({
          where: { team_id: p.team.team_id },
          data: { team_code: expectedTeamCode }
        });
      }

      console.log(`Project [${p.title}] -> Project ID: ${expectedProjectCode} | Team ID: ${expectedTeamCode}`);
    }

    // 2. Initialize / update ProjectCounter table to maxAssignedNum
    await prisma.projectCounter.upsert({
      where: { id: 1 },
      update: { last_val: maxAssignedNum },
      create: { id: 1, last_val: maxAssignedNum }
    });

    console.log(`\n[SUCCESS] Backfill complete! ProjectCounter initialized with last_val = ${maxAssignedNum}.`);
    process.exit(0);
  } catch (error) {
    console.error('Backfill error:', error);
    process.exit(1);
  }
}

backfillProjectCodes();
