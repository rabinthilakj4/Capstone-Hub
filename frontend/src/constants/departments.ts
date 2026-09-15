export interface DepartmentItem {
  department_id: number;
  department_name: string;
  department_code: string;
}

export const MASTER_DEPARTMENTS: DepartmentItem[] = [
  { department_id: 1, department_name: "Agricultural Engineering", department_code: "AGRIC" },
  { department_id: 2, department_name: "Artificial Intelligence and Data Science", department_code: "AIDS" },
  { department_id: 3, department_name: "Artificial Intelligence and Machine Learning", department_code: "AIML" },
  { department_id: 4, department_name: "Biomedical Engineering", department_code: "BIOMED" },
  { department_id: 5, department_name: "Biotechnology", department_code: "BIOTECH" },
  { department_id: 6, department_name: "Civil Engineering", department_code: "CIVIL" },
  { department_id: 7, department_name: "Computer Science & Business Systems", department_code: "CSBS" },
  { department_id: 8, department_name: "Computer Science & Design", department_code: "CSD" },
  { department_id: 9, department_name: "Computer Science & Engineering", department_code: "CSE" },
  { department_id: 10, department_name: "Computer Technology", department_code: "CT" },
  { department_id: 11, department_name: "Electrical & Electronics Engineering", department_code: "EEE" },
  { department_id: 12, department_name: "Electronics & Communication Engineering", department_code: "ECE" },
  { department_id: 13, department_name: "Electronics & Instrumentation Engineering", department_code: "EIE" },
  { department_id: 14, department_name: "Fashion Technology", department_code: "FASHION" },
  { department_id: 15, department_name: "Food Technology", department_code: "FOOD" },
  { department_id: 16, department_name: "Information Science & Engineering", department_code: "ISE" },
  { department_id: 17, department_name: "Information Technology", department_code: "IT" },
  { department_id: 18, department_name: "Mechanical Engineering", department_code: "MECH" },
  { department_id: 19, department_name: "Mechatronics Engineering", department_code: "MCT" },
  { department_id: 20, department_name: "Textile Technology", department_code: "TEXTILE" }
];

export const OFFICIAL_DEPARTMENTS = MASTER_DEPARTMENTS;

export const ALL_DEPARTMENTS: string[] = MASTER_DEPARTMENTS.map(d => d.department_name);
