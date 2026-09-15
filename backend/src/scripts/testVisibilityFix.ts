import prisma from '../config/db';
import { normalizeAcademicYearNumber, isYearEligible, isDepartmentEligible } from '../utils/academicYearUtils';

// Inline test of normalization functions
console.log('Testing Year Normalization:');
console.log('3rd Year ->', normalizeAcademicYearNumber('3rd Year'));
console.log('III Year ->', normalizeAcademicYearNumber('III Year'));
console.log('3 ->', normalizeAcademicYearNumber('3'));
console.log('2nd Year vs ["3rd Year", "4th Year"] ->', isYearEligible('2nd Year', ['3rd Year', '4th Year']));
console.log('3rd Year vs ["III Year", "IV Year"] ->', isYearEligible('3rd Year', ['III Year', 'IV Year']));
console.log('3rd Year vs [] ->', isYearEligible('3rd Year', []));
