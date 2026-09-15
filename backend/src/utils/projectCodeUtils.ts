import prisma from '../config/db';

export function formatProjectCode(num: number): string {
  return `P#${String(num).padStart(4, '0')}`;
}

export function formatTeamCode(num: number): string {
  return `T#${String(num).padStart(4, '0')}`;
}

export async function getNextProjectAndTeamCode(tx?: any): Promise<{ projectCode: string; teamCode: string; num: number }> {
  const client = tx || prisma;

  // Monotonic atomic increment on ProjectCounter table
  const counter = await client.projectCounter.upsert({
    where: { id: 1 },
    update: { last_val: { increment: 1 } },
    create: { id: 1, last_val: 1 }
  });

  const num = counter.last_val;
  return {
    projectCode: formatProjectCode(num),
    teamCode: formatTeamCode(num),
    num
  };
}
