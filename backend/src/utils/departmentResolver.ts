import prisma from '../config/db';
import { OFFICIAL_DEPARTMENTS } from 'shared';

const DEPT_CODE_MAP: Record<string, string> = {
  CB: 'Computer Science & Business Systems',
  CSBS: 'Computer Science & Business Systems',
  AD: 'Artificial Intelligence and Data Science',
  AIDS: 'Artificial Intelligence and Data Science',
  AM: 'Artificial Intelligence and Machine Learning',
  AIML: 'Artificial Intelligence and Machine Learning',
  CS: 'Computer Science & Engineering',
  CSE: 'Computer Science & Engineering',
  CD: 'Computer Science & Design',
  CSD: 'Computer Science & Design',
  CT: 'Computer Technology',
  EC: 'Electronics & Communication Engineering',
  ECE: 'Electronics & Communication Engineering',
  EE: 'Electrical & Electronics Engineering',
  EEE: 'Electrical & Electronics Engineering',
  EI: 'Electronics & Instrumentation Engineering',
  EIE: 'Electronics & Instrumentation Engineering',
  CE: 'Civil Engineering',
  CIVIL: 'Civil Engineering',
  ME: 'Mechanical Engineering',
  MECH: 'Mechanical Engineering',
  MCT: 'Mechatronics Engineering',
  BT: 'Biotechnology',
  BIOTECH: 'Biotechnology',
  BM: 'Biomedical Engineering',
  BIOMED: 'Biomedical Engineering',
  FT: 'Fashion Technology',
  FASHION: 'Fashion Technology',
  FD: 'Food Technology',
  FOOD: 'Food Technology',
  IS: 'Information Science & Engineering',
  ISE: 'Information Science & Engineering',
  IT: 'Information Technology',
  AG: 'Agricultural Engineering',
  AGRIC: 'Agricultural Engineering',
  TEX: 'Textile Technology',
  TEXTILE: 'Textile Technology'
};

/**
 * Normalizes a department name string by standardizing "and" vs "&",
 * stripping special characters, extra whitespace, and converting to lowercase.
 */
export function normalizeDepartmentName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Safely resolves a department record from PostgreSQL given a department_id or department_name.
 * Handles:
 * - Integer ID matching (1 to 20)
 * - Institutional code matching (e.g. "CB" -> "Computer Science & Business Systems" -> ID 7)
 * - Exact and normalized name matching
 */
export async function resolveDepartment(input: string | number | undefined | null) {
  if (input === undefined || input === null || input === '') {
    // Default fallback to CSE (ID 9)
    const cseDept = await prisma.department.findUnique({ where: { department_id: 9 } });
    if (cseDept) return cseDept;
    return await prisma.department.findFirst({ orderBy: { department_id: 'asc' } });
  }

  // 1. Numeric ID lookup (e.g., 9 or "9")
  const numericId = typeof input === 'number' ? input : parseInt(String(input).trim(), 10);
  if (!isNaN(numericId) && numericId >= 1 && numericId <= 20) {
    const deptById = await prisma.department.findUnique({
      where: { department_id: numericId }
    });
    if (deptById) return deptById;
  }

  const strInput = String(input).trim();

  // 2. Institutional code lookup (e.g. "CB", "CSBS", "CSE", "AIDS")
  const mappedName = DEPT_CODE_MAP[strInput.toUpperCase()];
  if (mappedName) {
    const deptByCodeMap = await prisma.department.findFirst({
      where: { department_name: { equals: mappedName, mode: 'insensitive' } }
    });
    if (deptByCodeMap) return deptByCodeMap;
  }

  // 3. Direct name lookup (case-insensitive)
  const deptByExactName = await prisma.department.findFirst({
    where: { department_name: { equals: strInput, mode: 'insensitive' } }
  });
  if (deptByExactName) return deptByExactName;

  // 4. Normalized name lookup ("and" <-> "&")
  const allDepts = await prisma.department.findMany({ orderBy: { department_id: 'asc' } });
  const normalizedInput = normalizeDepartmentName(strInput);

  for (const dept of allDepts) {
    if (normalizeDepartmentName(dept.department_name) === normalizedInput) {
      return dept;
    }
  }

  // 5. Partial / Fuzzy keyword matching
  for (const dept of allDepts) {
    const deptNorm = normalizeDepartmentName(dept.department_name);
    if (deptNorm.includes(normalizedInput) || normalizedInput.includes(deptNorm)) {
      return dept;
    }
  }

  // Fallback to CSE (ID 9) if no match found
  const cseDept = allDepts.find(d => d.department_id === 9);
  return cseDept || allDepts[0];
}
