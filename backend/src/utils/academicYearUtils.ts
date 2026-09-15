/**
 * Normalizes any academic year representation (e.g. "1st Year", "I Year", "1", "3rd", "III", "2023")
 * into a single canonical year number (1, 2, 3, 4).
 */
export function normalizeAcademicYearNumber(yearStr: any): number | null {
  if (yearStr === null || yearStr === undefined) return null;
  const str = String(yearStr).trim().toLowerCase();
  if (!str) return null;

  // 4th Year / IV Year / 4
  if (/\b(4th|iv|4|fourth)\b/i.test(str) || str.includes('4th year') || str.includes('iv year')) return 4;

  // 3rd Year / III Year / 3
  if (/\b(3rd|iii|3|third)\b/i.test(str) || str.includes('3rd year') || str.includes('iii year')) return 3;

  // 2nd Year / II Year / 2
  if (/\b(2nd|ii|2|second)\b/i.test(str) || str.includes('2nd year') || str.includes('ii year')) return 2;

  // 1st Year / I Year / 1
  if (/\b(1st|i|1|first)\b/i.test(str) || str.includes('1st year') || str.includes('i year')) return 1;

  return null;
}

/**
 * Checks if a student's academic year matches a project's eligible years.
 * Returns true if open to all years or if student year matches any specified eligible year.
 */
export function isYearEligible(studentYearStr: any, eligibleYearsInput: any): boolean {
  let targetYears: string[] = [];
  if (Array.isArray(eligibleYearsInput)) {
    targetYears = eligibleYearsInput;
  } else if (typeof eligibleYearsInput === 'string' && eligibleYearsInput.trim()) {
    try {
      const parsed = JSON.parse(eligibleYearsInput);
      if (Array.isArray(parsed)) targetYears = parsed;
    } catch (e) {
      targetYears = [eligibleYearsInput];
    }
  }

  // If no eligible years specified, or marked as "All Years" / "Open", it's open to all
  if (
    targetYears.length === 0 ||
    targetYears.some(y => {
      const s = String(y).toLowerCase();
      return s.includes('all') || s.includes('any') || s.includes('open');
    })
  ) {
    return true;
  }

  if (!studentYearStr) return true;

  const stdYearNum = normalizeAcademicYearNumber(studentYearStr);
  const stdYearRaw = String(studentYearStr).trim().toLowerCase();

  return targetYears.some(y => {
    const raw = String(y).trim().toLowerCase();
    if (raw === stdYearRaw || stdYearRaw.includes(raw) || raw.includes(stdYearRaw)) return true;

    const targetYearNum = normalizeAcademicYearNumber(y);
    if (stdYearNum !== null && targetYearNum !== null && stdYearNum === targetYearNum) return true;

    return false;
  });
}

/**
 * Checks if a student's department matches a project's target department rules.
 */
export function isDepartmentEligible(
  studentDeptId: number | null | undefined,
  creatorDeptId: number | null | undefined,
  targetDeptId: number | null | undefined,
  requiredDeptsInput: any
): boolean {
  if (!studentDeptId) return true; // If user has no department set, don't block visibility

  let targetDeptIds: number[] = [];
  if (Array.isArray(requiredDeptsInput)) {
    targetDeptIds = requiredDeptsInput.map(id => Number(id)).filter(id => !isNaN(id));
  } else if (typeof requiredDeptsInput === 'string' && requiredDeptsInput.trim()) {
    try {
      const parsed = JSON.parse(requiredDeptsInput);
      if (Array.isArray(parsed)) {
        targetDeptIds = parsed.map(id => Number(id)).filter(id => !isNaN(id));
      }
    } catch (e) {}
  }

  if (targetDeptId && !isNaN(Number(targetDeptId)) && !targetDeptIds.includes(Number(targetDeptId))) {
    targetDeptIds.push(Number(targetDeptId));
  }

  // If specific target departments were defined by creator, student's department MUST match one of them
  if (targetDeptIds.length > 0) {
    return targetDeptIds.includes(Number(studentDeptId));
  }

  // If NO specific target departments were set, project is default open to creator's department and interdisciplinary
  if (creatorDeptId && Number(creatorDeptId) === Number(studentDeptId)) {
    return true;
  }

  // Open / interdisciplinary project
  return true;
}
