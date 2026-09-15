import { UserRole, ProjectStatus, TaskStatus, TaskPriority, MentorshipStatus, MilestoneStatus, MeetingStatus } from './enums';

export interface User {
  user_id: string;
  student_id?: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: number | string;
  department_name?: string;
  status: string;
  email_verified: boolean;
  profile_completed?: boolean;
  created_at: string;
  student_profile?: StudentProfile;
  mentor_profile?: MentorProfile;
}

export interface Department {
  department_id: number | string;
  department_name: string;
  department_code?: string;
  status: string;
  student_count?: number;
  project_count?: number;
}

export interface Skill {
  skill_id: string;
  skill_name: string;
}

export interface StudentProfile {
  user_id: string;
  year?: string;
  phone?: string;
  skills: string[];
  interests: string[];
  experience: string;
  availability: string;
  portfolio_links: string[];
  preferred_domains: string[];
}

export interface MentorProfile {
  user_id: string;
  expertise: string[];
  research_interests: string[];
  availability: string;
  mentoring_capacity: number;
  current_load: number;
}

export interface Project {
  project_id: string;
  title: string;
  abstract: string;
  problem_statement: string;
  proposed_solution: string;
  domain: string;
  description: string;
  objectives: string[];
  required_skills: string[];
  required_departments: string[];
  target_department_id?: number | null;
  target_department_name?: string | null;
  team_size: number;
  technologies: string[];
  hardware_requirements: string;
  expected_outcome: string;
  duration: string;
  difficulty_level: string;
  preferred_mentor_expertise: string[];
  status: ProjectStatus;
  created_by: string;
  creator_name?: string;
  mentor_id?: string | null;
  mentor_name?: string | null;
  created_at: string;
  team?: Team;
  health_score?: number;
  match_score?: number;
}

export interface Team {
  team_id: string;
  project_id: string;
  status: string;
  members: TeamMember[];
}

export interface TeamMember {
  team_id: string;
  student_id: string;
  student_name: string;
  department_name: string;
  skills: string[];
  role: string;
  joined_at: string;
}

export interface MentorshipRequest {
  request_id: string;
  project_id: string;
  project_title?: string;
  mentor_id: string;
  mentor_name?: string;
  status: MentorshipStatus;
  requested_at: string;
  response_note?: string;
}

export interface Task {
  task_id: string;
  project_id: string;
  assigned_to: string;
  assigned_to_name?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  due_date: string;
  status: TaskStatus;
  attachments: string[];
  comments?: TaskComment[];
  created_at: string;
}

export interface TaskComment {
  comment_id: string;
  task_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface Milestone {
  milestone_id: string;
  project_id: string;
  title: string;
  deadline: string;
  status: MilestoneStatus;
  submission_url?: string;
  submission_notes?: string;
  feedback?: string;
  rating?: number;
  approved_by?: string;
  submitted_at?: string;
}

export interface Document {
  document_id: string;
  project_id: string;
  title: string;
  uploaded_by: string;
  uploader_name?: string;
  file_location: string;
  version: string;
  file_size?: number;
  created_at: string;
}

export interface Message {
  message_id: string;
  sender_id: string;
  sender_name?: string;
  sender_role?: UserRole;
  project_id: string;
  content: string;
  created_at: string;
}

export interface Meeting {
  meeting_id: string;
  project_id: string;
  scheduled_by: string;
  scheduler_name?: string;
  meeting_time: string;
  agenda: string;
  notes?: string;
  status: MeetingStatus;
}

export interface Evaluation {
  evaluation_id: string;
  project_id: string;
  evaluator_id: string;
  evaluator_name?: string;
  criteria_scores: {
    innovation: number;
    technical_implementation: number;
    documentation: number;
    team_collaboration: number;
    presentation: number;
  };
  total_score: number;
  feedback_notes: string;
  created_at: string;
}

export interface Notification {
  notification_id: string;
  user_id: string;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  target_type: string;
  target_id: string;
  timestamp: string;
  details?: string;
}

export interface TeamMatchScore {
  totalScore: number;
  breakdown: {
    skillMatch: number;
    interestMatch: number;
    domainMatch: number;
    departmentDiversity: number;
    availability: number;
  };
}

export interface MentorMatchScore {
  totalScore: number;
  breakdown: {
    expertiseMatch: number;
    domainMatch: number;
    interestMatch: number;
    availabilityMatch: number;
    experienceMatch: number;
  };
}

export interface SkillGapAnalysis {
  requiredSkills: string[];
  coveredSkills: string[];
  missingSkills: string[];
  recommendedStudents: Array<{
    student_id: string;
    name: string;
    department: string;
    skills: string[];
    matchPercentage: number;
  }>;
}

export interface SystemStats {
  totalStudents: number;
  totalMentors: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingProjects: number;
  activeTeams: number;
  mentorUtilization: number;
  departmentCounts: Array<{ department_name: string; count: number }>;
  projectCompletionRate: number;
  multidisciplinaryPercentage: number;
}
