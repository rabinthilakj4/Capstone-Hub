import prisma from '../config/db';
import { DEFAULT_MATCHING_WEIGHTS } from 'shared';

export interface MatchingWeights {
  team: {
    skillMatch: number;
    interestMatch: number;
    domainMatch: number;
    departmentDiversity: number;
    availability: number;
  };
  mentor: {
    expertiseMatch: number;
    domainMatch: number;
    researchInterest: number;
    availability: number;
    experience: number;
  };
}

export async function getActiveMatchingWeights(): Promise<MatchingWeights> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'MATCHING_WEIGHTS' }
  });
  if (setting) {
    try {
      return JSON.parse(setting.value);
    } catch (e) {
      // Fallback
    }
  }
  return DEFAULT_MATCHING_WEIGHTS;
}

export function calculateTeamMatchScore(
  studentProfile: {
    skills: string[];
    interests: string[];
    preferred_domains: string[];
    availability: string;
    department_name?: string;
  },
  project: {
    required_skills: string[];
    domain: string;
    required_departments: string[];
    abstract: string;
  },
  weights: MatchingWeights['team'] = DEFAULT_MATCHING_WEIGHTS.team
): { totalScore: number; breakdown: any } {
  // 1. Skill Match (40%)
  const reqSkills = (project.required_skills || []).map(s => String(s).toLowerCase());
  const stdSkills = (studentProfile.skills || []).map(s => String(s).toLowerCase());
  let skillOverlap = 0;
  if (reqSkills.length > 0) {
    const matches = stdSkills.filter(s => reqSkills.includes(s));
    skillOverlap = Math.min(1.0, matches.length / Math.max(1, reqSkills.length));
  }
  const skillScore = Math.round(skillOverlap * 100);

  // 2. Interest Match (25%)
  const interests = (studentProfile.interests || []).map(i => String(i).toLowerCase());
  const domainText = (String(project.domain || '') + ' ' + String(project.abstract || '')).toLowerCase();
  let interestMatches = 0;
  if (interests.length > 0) {
    interestMatches = interests.filter(i => domainText.includes(i)).length;
  }
  const interestOverlap = Math.min(1.0, interestMatches / Math.max(1, interests.length || 1));
  const interestScore = Math.round(interestOverlap * 100);

  // 3. Domain Match (20%)
  const domains = (studentProfile.preferred_domains || []).map(d => String(d).toLowerCase());
  const isDomainMatch = domains.includes(String(project.domain || '').toLowerCase());
  const domainScore = isDomainMatch ? 100 : 40;

  // 4. Department Diversity (10%)
  const reqDepts = (project.required_departments || []).map(d => String(d).toLowerCase());
  const stdDept = String(studentProfile.department_name || '').toLowerCase();
  const isDeptMatch = reqDepts.length === 0 || reqDepts.some(d => stdDept.includes(d) || d.includes(stdDept));
  const deptScore = isDeptMatch ? 100 : 50;

  // 5. Availability (5%)
  const avail = String(studentProfile.availability || '').toLowerCase();
  const availScore = (avail.includes('high') || avail.includes('full')) ? 100 : 70;

  // Weighted sum
  const totalScore = Math.round(
    skillScore * weights.skillMatch +
    interestScore * weights.interestMatch +
    domainScore * weights.domainMatch +
    deptScore * weights.departmentDiversity +
    availScore * weights.availability
  );

  return {
    totalScore,
    breakdown: {
      skillMatch: Math.round(skillScore * weights.skillMatch),
      interestMatch: Math.round(interestScore * weights.interestMatch),
      domainMatch: Math.round(domainScore * weights.domainMatch),
      departmentDiversity: Math.round(deptScore * weights.departmentDiversity),
      availability: Math.round(availScore * weights.availability)
    }
  };
}

export function calculateMentorMatchScore(
  mentor: {
    expertise: string[];
    research_interests: string[];
    availability: string;
    mentoring_capacity: number;
    current_load: number;
    department_name?: string;
  },
  project: {
    required_skills: string[];
    preferred_mentor_expertise: string[];
    domain: string;
    abstract: string;
  },
  weights: MatchingWeights['mentor'] = DEFAULT_MATCHING_WEIGHTS.mentor
): { totalScore: number; breakdown: any } {
  // 1. Expertise Match (40%)
  const mExp = mentor.expertise.map(e => e.toLowerCase());
  const prefExp = project.preferred_mentor_expertise.map(e => e.toLowerCase());
  const reqSkills = project.required_skills.map(s => s.toLowerCase());
  const targetSkills = Array.from(new Set([...prefExp, ...reqSkills]));

  let expMatches = 0;
  if (targetSkills.length > 0) {
    expMatches = mExp.filter(e => targetSkills.some(t => t.includes(e) || e.includes(t))).length;
  }
  const expRatio = Math.min(1.0, expMatches / Math.max(1, targetSkills.length));
  const expScore = Math.round(expRatio * 100);

  // 2. Project Domain (25%)
  const domainText = project.domain.toLowerCase();
  const domainMatch = mExp.some(e => e.includes(domainText) || domainText.includes(e));
  const domainScore = domainMatch ? 100 : 60;

  // 3. Research Interest (15%)
  const rInterests = mentor.research_interests.map(r => r.toLowerCase());
  const pText = (project.domain + ' ' + project.abstract).toLowerCase();
  const interestMatchCount = rInterests.filter(r => pText.includes(r)).length;
  const interestRatio = Math.min(1.0, interestMatchCount / Math.max(1, rInterests.length || 1));
  const interestScore = Math.round(interestRatio * 100);

  // 4. Availability (10%)
  const hasCapacity = mentor.current_load < mentor.mentoring_capacity;
  const availScore = hasCapacity ? 100 : 20;

  // 5. Experience (10%)
  const expScoreBase = Math.min(100, mentor.mentoring_capacity * 20);

  const totalScore = Math.round(
    expScore * weights.expertiseMatch +
    domainScore * weights.domainMatch +
    interestScore * weights.researchInterest +
    availScore * weights.availability +
    expScoreBase * weights.experience
  );

  return {
    totalScore,
    breakdown: {
      expertiseMatch: Math.round(expScore * weights.expertiseMatch),
      domainMatch: Math.round(domainScore * weights.domainMatch),
      interestMatch: Math.round(interestScore * weights.researchInterest),
      availabilityMatch: Math.round(availScore * weights.availability),
      experienceMatch: Math.round(expScoreBase * weights.experience)
    }
  };
}

export async function detectSkillGaps(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { project_id: projectId },
    include: {
      team: {
        include: {
          members: {
            include: {
              student: {
                include: {
                  student_profile: true,
                  department: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!project) return null;

  const reqSkills: string[] = JSON.parse(project.required_skills || '[]');
  const coveredSkillsSet = new Set<string>();

  if (project.team) {
    for (const member of project.team.members) {
      if (member.student.student_profile) {
        const studentSkills: string[] = JSON.parse(member.student.student_profile.skills || '[]');
        studentSkills.forEach(s => coveredSkillsSet.add(s.toLowerCase()));
      }
    }
  }

  const coveredSkills = Array.from(coveredSkillsSet);
  const missingSkills = reqSkills.filter(req => !coveredSkills.some(cov => cov.includes(req.toLowerCase()) || req.toLowerCase().includes(cov)));

  // Recommend available students possessing missing skills
  let recommendedStudents: any[] = [];
  if (missingSkills.length > 0) {
    const allStudents = await prisma.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE' },
      include: { student_profile: true, department: true }
    });

    const currentMemberIds = project.team?.members.map(m => m.student_id) || [];

    recommendedStudents = allStudents
      .filter(st => !currentMemberIds.includes(st.user_id) && st.student_profile)
      .map(st => {
        const stSkills: string[] = JSON.parse(st.student_profile?.skills || '[]');
        const matchesMissing = stSkills.filter(sk => missingSkills.some(m => m.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(m.toLowerCase())));
        const matchPercentage = Math.round((matchesMissing.length / Math.max(1, missingSkills.length)) * 100);
        return {
          student_id: st.user_id,
          name: st.name,
          department: st.department?.department_name || '',
          skills: stSkills,
          matchPercentage
        };
      })
      .filter(st => st.matchPercentage > 0)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);
  }

  return {
    requiredSkills: reqSkills,
    coveredSkills: reqSkills.filter(r => !missingSkills.includes(r)),
    missingSkills,
    recommendedStudents
  };
}
