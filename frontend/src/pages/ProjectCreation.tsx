import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { SearchableDomainSelect } from '../components/ui/SearchableDomainSelect';
import { ENGINEERING_DOMAINS } from '../constants/domains';
import {
  FolderPlus, Sparkles, AlertTriangle, ArrowRight, Code2, Wrench, Users, Search, Check, X
} from 'lucide-react';

const TECHNICAL_SKILLS = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'Node.js', 'Express.js',
  'Java', 'Python', 'C', 'C++', 'SQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'REST API',
  'Git', 'GitHub', 'Docker', 'Cloud Computing', 'Artificial Intelligence', 'Machine Learning',
  'Data Science', 'UI/UX Design', 'Cybersecurity', 'DevOps', 'Mobile App Development',
  'Web Development', 'Database Management', 'API Development', 'Full Stack Development'
];

const TOOLS_AND_TECH = [
  'VS Code', 'Antigravity IDE', 'GitHub', 'Git', 'Postman', 'pgAdmin', 'PostgreSQL',
  'MongoDB Compass', 'Firebase Console', 'Figma', 'Canva', 'Docker Desktop', 'npm', 'Vite',
  'Android Studio', 'IntelliJ IDEA', 'Eclipse', 'Jupyter Notebook', 'Google Colab',
  'Microsoft Azure', 'AWS', 'Google Cloud', 'Netlify', 'Vercel'
];

const PROJECT_SKILLS = [
  'Project Management', 'Team Collaboration', 'Leadership', 'Communication',
  'Problem Solving', 'Research', 'Presentation', 'Mentoring', 'Technical Writing',
  'Requirement Analysis', 'System Design', 'Project Planning', 'Agile Methodology',
  'Scrum', 'Version Control'
];

export const ProjectCreation: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [abstract, setAbstract] = useState('');
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [objectives, setObjectives] = useState(['']);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>(['3rd Year', '4th Year']);
  const [teamSize, setTeamSize] = useState(4);
  const [technologies, setTechnologies] = useState(['']);
  const [hardwareRequirements, setHardwareRequirements] = useState('');
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [duration, setDuration] = useState('1 Semester');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediate');
  const [preferredMentorExpertise, setPreferredMentorExpertise] = useState<string[]>([]);

  const [availableDepts, setAvailableDepts] = useState<any[]>([]);
  const [deptSearchQuery, setDeptSearchQuery] = useState('');
  const [similarityWarning, setSimilarityWarning] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'STUDENT') {
      alert('Only students are permitted to create project proposals.');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    api.get('/users/departments').then(res => setAvailableDepts(res.data.departments || []));
  }, []);

  const toggleSkill = (sk: string) => {
    if (selectedSkills.includes(sk)) setSelectedSkills(selectedSkills.filter(s => s !== sk));
    else setSelectedSkills([...selectedSkills, sk]);
  };

  const toggleDept = (deptId: number) => {
    if (selectedDepartments.includes(deptId)) {
      setSelectedDepartments(selectedDepartments.filter(id => id !== deptId));
    } else {
      setSelectedDepartments([...selectedDepartments, deptId]);
    }
  };

  const toggleYear = (yr: string) => {
    if (selectedYears.includes(yr)) {
      setSelectedYears(selectedYears.filter(y => y !== yr));
    } else {
      setSelectedYears([...selectedYears, yr]);
    }
  };

  const selectAllYears = () => {
    setSelectedYears(['1st Year', '2nd Year', '3rd Year', '4th Year']);
  };

  const clearAllYears = () => {
    setSelectedYears([]);
  };

  const selectAllDepts = () => {
    setSelectedDepartments(availableDepts.map(d => d.department_id));
  };

  const clearAllDepts = () => {
    setSelectedDepartments([]);
  };

  const filteredDepts = availableDepts.filter(d =>
    d.department_name.toLowerCase().includes(deptSearchQuery.toLowerCase().trim())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/projects/create', {
        title,
        abstract,
        problem_statement: problemStatement,
        proposed_solution: proposedSolution,
        domain,
        description: description || abstract,
        objectives: objectives.filter(o => o.trim() !== ''),
        required_skills: selectedSkills,
        target_department_id: selectedDepartments.length > 0 ? selectedDepartments[0] : null,
        required_departments: selectedDepartments,
        eligible_years: selectedYears,
        team_size: teamSize,
        technologies: technologies.filter(t => t.trim() !== ''),
        hardware_requirements: hardwareRequirements,
        expected_outcome: expectedOutcome,
        duration,
        difficulty_level: difficultyLevel,
        preferred_mentor_expertise: preferredMentorExpertise
      });

      if (res.data.success) {
        if (res.data.similarityWarning) {
          setSimilarityWarning(res.data.similarityWarning);
        } else {
          alert('Project proposal submitted successfully for Admin review!');
          navigate('/student/dashboard');
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit project proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="w-full space-y-6 sm:space-y-8">
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Capstone Project Upload Workflow</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Create Capstone Project Idea</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">Define multidisciplinary scope, required student skills, and preferred mentor expertise</p>
        </div>

        {similarityWarning && (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Similarity Alert: High similarity detected with existing published project!</span>
            </div>
            <p className="text-xs text-amber-800">
              Your proposal was saved with status PENDING. Admin will review duplicate flags.
            </p>
            <button
              onClick={() => navigate('/student/dashboard')}
              className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl text-xs"
            >
              Return to Dashboard
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
          {/* SECTION 1: PROJECT OVERVIEW */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-slate-900 border-b pb-3 text-sm uppercase tracking-wider flex items-center justify-between">
              <span>1. Project Overview</span>
              <span className="text-xs text-slate-400 font-semibold uppercase">General Info</span>
            </h3>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Project Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Smart Healthcare Monitoring System"
                required
                className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Project Domain <span className="text-indigo-600">*</span>
                </label>
                <SearchableDomainSelect
                  domains={ENGINEERING_DOMAINS}
                  selectedDomain={domain}
                  onChange={setDomain}
                  placeholder="Search & select project domain..."
                  showAllOption={false}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Desired Team Size</label>
                <input
                  type="number"
                  value={teamSize}
                  onChange={e => setTeamSize(Number(e.target.value))}
                  min={2}
                  max={8}
                  className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Project Abstract</label>
              <textarea
                value={abstract}
                onChange={e => setAbstract(e.target.value)}
                rows={3}
                placeholder="High-level summary of the capstone project..."
                required
                className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Problem Statement</label>
                <textarea
                  value={problemStatement}
                  onChange={e => setProblemStatement(e.target.value)}
                  rows={3}
                  placeholder="What specific issue does this project address?"
                  required
                  className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">Proposed Solution</label>
                <textarea
                  value={proposedSolution}
                  onChange={e => setProposedSolution(e.target.value)}
                  rows={3}
                  placeholder="How will your engineering team solve it?"
                  required
                  className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: MULTIDISCIPLINARY REQUIREMENTS */}
          <div className="space-y-6">
            <h3 className="font-extrabold text-slate-900 border-b pb-3 text-sm uppercase tracking-wider flex items-center justify-between">
              <span>2. Multidisciplinary Requirements</span>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                {selectedSkills.length} Skills • {selectedDepartments.length} Departments
              </span>
            </h3>

            {/* Categorized Skills Section */}
            <div className="space-y-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Required Student Skills
              </label>

              {/* 1. Technical Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>1. Technical Skills</span>
                </h4>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl max-h-48 overflow-y-auto">
                  {TECHNICAL_SKILLS.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tools & Technologies */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-teal-600" />
                  <span>2. Tools & Technologies</span>
                </h4>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl max-h-48 overflow-y-auto">
                  {TOOLS_AND_TECH.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Project / Collaboration Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>3. Project / Collaboration Skills</span>
                </h4>
                <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl max-h-48 overflow-y-auto">
                  {PROJECT_SKILLS.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Eligible Student Year Selection */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Eligible Student Academic Years
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select which student academic years can discover and request to join this project.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllYears}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition"
                  >
                    Select All Years
                  </button>
                  {selectedYears.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllYears}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(yr => {
                  const active = selectedYears.includes(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => toggleYear(yr)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {active && <Check className="w-3.5 h-3.5" />}
                      <span>{yr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Departments Section */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Eligible Departments for Teammates
                  </label>
                  <p className="text-[11px] text-slate-500">
                    {selectedDepartments.length === 0 ? 'Currently open to ALL departments.' : `Restricted to ${selectedDepartments.length} department(s).`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllDepts}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs border border-indigo-200 transition"
                  >
                    Select All ({availableDepts.length})
                  </button>
                  {selectedDepartments.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllDepts}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                    >
                      Open to All Depts
                    </button>
                  )}
                </div>
              </div>

              {/* Department Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={deptSearchQuery}
                  onChange={e => setDeptSearchQuery(e.target.value)}
                  placeholder="Type to filter departments (e.g. Computer, Mechanical, Civil...)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* Department Pill Badges */}
              <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-2xl max-h-56 overflow-y-auto">
                {filteredDepts.length > 0 ? (
                  filteredDepts.map(d => {
                    const active = selectedDepartments.includes(d.department_id);
                    return (
                      <button
                        key={d.department_id}
                        type="button"
                        onClick={() => toggleDept(d.department_id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {d.department_name}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 font-semibold w-full">
                    No departments matching "{deptSearchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? 'Submitting Proposal...' : 'Submit Project Proposal for Admin Review'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
};
