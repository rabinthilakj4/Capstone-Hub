import { calculateTeamMatchScore, calculateMentorMatchScore } from '../src/services/matchingEngine';

describe('Capstone Hub - Matching Engine Algorithms', () => {
  const defaultWeights = {
    team: { skillMatch: 0.40, interestMatch: 0.25, domainMatch: 0.20, departmentDiversity: 0.10, availability: 0.05 },
    mentor: { expertiseMatch: 0.40, domainMatch: 0.25, researchInterest: 0.15, availability: 0.10, experience: 0.10 }
  };

  test('calculateTeamMatchScore returns high percentage for matching skill and domain profile', () => {
    const student = {
      skills: ['AI / ML', 'Python', 'IoT'],
      interests: ['Healthcare', 'Artificial Intelligence'],
      preferred_domains: ['Healthcare'],
      availability: 'High',
      department_name: 'Computer Science & Engineering'
    };

    const project = {
      required_skills: ['AI / ML', 'Python', 'IoT'],
      domain: 'Healthcare',
      required_departments: ['Computer Science & Engineering'],
      abstract: 'An AI healthcare monitoring system.'
    };

    const result = calculateTeamMatchScore(student, project, defaultWeights.team);

    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.breakdown.skillMatch).toBeGreaterThan(0);
    expect(result.breakdown.domainMatch).toBeGreaterThan(0);
  });

  test('calculateMentorMatchScore returns accurate breakdown', () => {
    const mentor = {
      expertise: ['AI / ML', 'Python', 'Healthcare'],
      research_interests: ['Medical AI', 'Healthcare'],
      availability: 'Available',
      mentoring_capacity: 5,
      current_load: 2,
      department_name: 'Computer Science & Engineering'
    };

    const project = {
      required_skills: ['AI / ML', 'Python'],
      preferred_mentor_expertise: ['AI / ML', 'Healthcare'],
      domain: 'Healthcare',
      abstract: 'Medical image analysis project.'
    };

    const result = calculateMentorMatchScore(mentor, project, defaultWeights.mentor);

    expect(result.totalScore).toBeGreaterThan(80);
    expect(result.breakdown.expertiseMatch).toBe(40);
  });
});
