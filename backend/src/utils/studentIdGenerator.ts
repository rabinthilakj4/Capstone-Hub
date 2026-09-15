import prisma from '../config/db';

/**
 * Extracts numeric year digit (1, 2, 3, 4) from year string like "1st Year", "2nd Year", "3rd Year", "4th Year".
 */
export function parseYearNumber(yearStr?: string): number {
  if (!yearStr) return 1;
  const str = String(yearStr).toLowerCase().trim();
  if (str.includes('1') || str.includes('1st')) return 1;
  if (str.includes('2') || str.includes('2nd')) return 2;
  if (str.includes('3') || str.includes('3rd')) return 3;
  if (str.includes('4') || str.includes('4th')) return 4;
  return 1;
}

/**
 * Maps department name or email code to a standard department code if not stored in DB.
 */
export function getDepartmentCode(deptName: string, emailDeptCode?: string): string {
  if (emailDeptCode && /^[A-Z]{2,6}$/i.test(emailDeptCode)) {
    return emailDeptCode.toUpperCase();
  }

  const nameUpper = (deptName || '').toUpperCase().trim();

  const mapping: Record<string, string> = {
    'COMPUTER SCIENCE & ENGINEERING': 'CSE',
    'COMPUTER SCIENCE AND ENGINEERING': 'CSE',
    'ELECTRONICS & COMMUNICATION ENGINEERING': 'ECE',
    'ELECTRONICS AND COMMUNICATION ENGINEERING': 'ECE',
    'INFORMATION TECHNOLOGY': 'IT',
    'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE': 'AIDS',
    'ARTIFICIAL INTELLIGENCE & DATA SCIENCE': 'AIDS',
    'ARTIFICIAL INTELLIGENCE AND MACHINE LEARNING': 'AIML',
    'ARTIFICIAL INTELLIGENCE & MACHINE LEARNING': 'AIML',
    'ELECTRICAL & ELECTRONICS ENGINEERING': 'EEE',
    'ELECTRICAL AND ELECTRONICS ENGINEERING': 'EEE',
    'CIVIL ENGINEERING': 'CIVIL',
    'MECHANICAL ENGINEERING': 'MECH',
    'MECHATRONICS ENGINEERING': 'MCT',
    'BIOMEDICAL ENGINEERING': 'BIOMED',
    'BIOTECHNOLOGY': 'BIOTECH',
    'FASHION TECHNOLOGY': 'FASHION',
    'FOOD TECHNOLOGY': 'FOOD',
    'TEXTILE TECHNOLOGY': 'TEXTILE',
    'AGRICULTURAL ENGINEERING': 'AGRIC',
    'COMPUTER TECHNOLOGY': 'CT',
    'COMPUTER SCIENCE & BUSINESS SYSTEMS': 'CSBS',
    'COMPUTER SCIENCE AND BUSINESS SYSTEMS': 'CSBS',
    'COMPUTER SCIENCE & DESIGN': 'CSD',
    'COMPUTER SCIENCE AND DESIGN': 'CSD',
    'ELECTRONICS & INSTRUMENTATION ENGINEERING': 'EIE',
    'ELECTRONICS AND INSTRUMENTATION ENGINEERING': 'EIE',
    'INFORMATION SCIENCE & ENGINEERING': 'ISE',
    'INFORMATION SCIENCE AND ENGINEERING': 'ISE'
  };

  if (mapping[nameUpper]) {
    return mapping[nameUpper];
  }

  const words = nameUpper.replace(/[^A-Z0-9\s]/g, '').split(/\s+/).filter(w => w !== 'AND' && w !== 'ENGINEERING' && w !== 'TECHNOLOGY');
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 2) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return 'ST';
}

/**
 * Generates the next sequential unique Student ID for a given department and year.
 * Format: Department Code + Year Number + 3-digit Sequential Number
 * Examples: CSBS1001, CSBS1002, CSBS2001, ECE1001, ECE2001
 */
export async function generateNextStudentId(departmentId: number, yearStr?: string): Promise<string> {
  const dept = await prisma.department.findUnique({
    where: { department_id: departmentId }
  });

  if (!dept) {
    throw new Error(`Invalid department_id: ${departmentId}`);
  }

  let deptCode = dept.department_code;
  if (!deptCode || deptCode.trim() === '') {
    deptCode = getDepartmentCode(dept.department_name);
    try {
      await prisma.department.update({
        where: { department_id: departmentId },
        data: { department_code: deptCode }
      });
    } catch (e) {
      // Ignore concurrent update error
    }
  }

  const yearNum = parseYearNumber(yearStr);
  const prefix = `${deptCode}${yearNum}`;

  // Fetch all student IDs from User and PendingRegistration matching this prefix
  const existingUsers = await prisma.user.findMany({
    where: {
      student_id: { startsWith: prefix }
    },
    select: { student_id: true }
  });

  const existingPending = await prisma.pendingRegistration.findMany({
    where: {
      student_id: { startsWith: prefix }
    },
    select: { student_id: true }
  });

  const matchingStudentIds = [
    ...existingUsers.map(u => u.student_id),
    ...existingPending.map(p => p.student_id)
  ].filter((id): id is string => typeof id === 'string' && id.startsWith(prefix));

  let maxSeq = 0;
  for (const sid of matchingStudentIds) {
    const numPart = sid.substring(prefix.length);
    const num = parseInt(numPart, 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  }

  let nextSeq = maxSeq + 1;
  let candidateId = `${prefix}${String(nextSeq).padStart(3, '0')}`;

  // Strict collision avoidance loop across all records
  let isUnique = false;
  while (!isUnique) {
    const userCollision = await prisma.user.findFirst({
      where: { student_id: candidateId }
    });
    const pendingCollision = await prisma.pendingRegistration.findFirst({
      where: { student_id: candidateId }
    });

    if (!userCollision && !pendingCollision) {
      isUnique = true;
    } else {
      nextSeq++;
      candidateId = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    }
  }

  return candidateId;
}
