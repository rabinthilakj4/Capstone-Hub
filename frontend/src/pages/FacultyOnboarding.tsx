import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { SearchableDepartmentSelect } from '../components/ui/SearchableDepartmentSelect';
import {
  UserCheck, ShieldCheck, Briefcase, GraduationCap, Award, BookOpen,
  Sparkles, CheckCircle2, AlertCircle, ArrowRight, Code2, Plus, X
} from 'lucide-react';

const DESIGNATION_OPTIONS = [
  'Assistant Professor',
  'Associate Professor',
  'Professor',
  'Head of the Department (HOD)',
  'Dean',
  'Lecturer',
  'Senior Lecturer'
];

const EXPERTISE_OPTIONS = [
  'Artificial Intelligence & Machine Learning',
  'Data Science',
  'Computer Science',
  'Cybersecurity',
  'Cloud Computing',
  'Internet of Things (IoT)',
  'Electronics & Communication',
  'Electrical & Electronics',
  'Mechanical Engineering',
  'Civil Engineering',
  'Robotics & Automation',
  'VLSI & Embedded Systems',
  'Software Engineering',
  'Networking',
  'Other / Custom Input'
];

const RESEARCH_INTEREST_OPTIONS = [
  'Artificial Intelligence & Machine Learning',
  'Data Science & Big Data',
  'Computer Vision',
  'Natural Language Processing (NLP)',
  'Cybersecurity',
  'Internet of Things (IoT)',
  'Cloud Computing',
  'Robotics & Automation',
  'Blockchain Technology',
  'VLSI & Embedded Systems',
  'Renewable Energy',
  'Sustainable Engineering',
  'Advanced Materials',
  'Other / Custom Input'
];

const PROJECT_DOMAIN_OPTIONS = [
  'AI & Machine Learning',
  'Web Development',
  'Mobile App Development',
  'Data Science',
  'Cybersecurity',
  'IoT',
  'Cloud Computing',
  'Robotics',
  'Embedded Systems',
  'Blockchain',
  'Computer Vision',
  'Software Engineering',
  'Automation',
  'Other / Custom Input'
];

export const FacultyOnboarding: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState(user?.name || '');
  const [employeeId, setEmployeeId] = useState('');
  const [email] = useState(user?.email || '');
  const [departmentId, setDepartmentId] = useState<number | string>('');
  const [designation, setDesignation] = useState(DESIGNATION_OPTIONS[0]);
  const [yearsExperience, setYearsExperience] = useState<number | string>('');
  const [subjectsHandledInput, setSubjectsHandledInput] = useState('');

  // Selected Multi-options
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [customExpertiseInput, setCustomExpertiseInput] = useState('');

  const [selectedResearchInterests, setSelectedResearchInterests] = useState<string[]>([]);
  const [customResearchInput, setCustomResearchInput] = useState('');

  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [customDomainInput, setCustomDomainInput] = useState('');

  const [selectedSkillsPills, setSelectedSkillsPills] = useState<string[]>([
    'Research Guidance', 'Project Mentorship', 'Curriculum Design'
  ]);
  const [customSkillTag, setCustomSkillTag] = useState('');

  const [departments, setDepartments] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user]);

  // If already completed profile, redirect directly to Faculty Dashboard
  useEffect(() => {
    if (user && user.profile_completed && user.role === 'MENTOR') {
      navigate('/mentor/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Fetch Master Departments list
  useEffect(() => {
    api.get('/users/departments').then(res => {
      const depts = res.data.departments || [];
      setDepartments(depts);
    }).catch(() => {});
  }, []);

  // Multi-select toggles
  const toggleSelection = (item: string, list: string[], setList: (val: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleAddSkillTag = () => {
    if (customSkillTag.trim() && !selectedSkillsPills.includes(customSkillTag.trim())) {
      setSelectedSkillsPills([...selectedSkillsPills, customSkillTag.trim()]);
      setCustomSkillTag('');
    }
  };

  const handleRemoveSkillTag = (tag: string) => {
    setSelectedSkillsPills(selectedSkillsPills.filter(s => s !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim()) {
      setError('Please enter your Full Name.');
      return;
    }
    if (!employeeId.trim()) {
      setError('Please enter your Faculty ID / Employee ID.');
      return;
    }
    if (!departmentId) {
      setError('Please select your Department.');
      return;
    }
    if (!designation) {
      setError('Please select your Designation.');
      return;
    }

    // Compile Final Expertise list
    const finalExpertise = [...selectedExpertise.filter(e => e !== 'Other / Custom Input')];
    if (selectedExpertise.includes('Other / Custom Input') && customExpertiseInput.trim()) {
      finalExpertise.push(customExpertiseInput.trim());
    }
    if (finalExpertise.length === 0) {
      setError('Please select or specify at least one Area of Expertise / Specialization.');
      return;
    }

    // Compile Subjects Handled
    const subjectsArray = subjectsHandledInput
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (subjectsArray.length === 0) {
      setError('Please enter the Subjects / Courses Handled (separated by commas).');
      return;
    }

    if (yearsExperience === '' || Number(yearsExperience) < 0) {
      setError('Please enter valid Years of Experience.');
      return;
    }

    // Compile Final Research Interests list
    const finalResearch = [...selectedResearchInterests.filter(r => r !== 'Other / Custom Input')];
    if (selectedResearchInterests.includes('Other / Custom Input') && customResearchInput.trim()) {
      finalResearch.push(customResearchInput.trim());
    }
    if (finalResearch.length === 0) {
      setError('Please select or specify at least one Research Interest.');
      return;
    }

    // Compile Final Preferred Domains list
    const finalDomains = [...selectedDomains.filter(d => d !== 'Other / Custom Input')];
    if (selectedDomains.includes('Other / Custom Input') && customDomainInput.trim()) {
      finalDomains.push(customDomainInput.trim());
    }
    if (finalDomains.length === 0) {
      setError('Please select or specify at least one Preferred Project Domain.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        employee_id: employeeId.trim(),
        student_id: employeeId.trim(),
        department_id: Number(departmentId),
        designation,
        expertise: finalExpertise,
        subjects_handled: subjectsArray,
        years_experience: Number(yearsExperience),
        skills: selectedSkillsPills,
        research_interests: finalResearch,
        preferred_domains: finalDomains,
        availability: 'Available',
        mentoring_capacity: 5
      };

      const res = await api.post('/users/complete-onboarding', payload);

      if (res.data.success) {
        await refetchUser();
        navigate('/mentor/dashboard', { replace: true });
      } else {
        setError(res.data.message || 'Failed to submit Faculty Profile Setup.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Faculty Profile Setup failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Brand Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Capstone Hub Logo" className="w-8 h-8 rounded-xl shadow-md object-contain" />
          <div>
            <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">CAPSTONE HUB</h1>
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Faculty Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60">
          <UserCheck className="w-4 h-4 text-amber-400" />
          <span>Faculty Profile Setup</span>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-slate-100 pb-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-xl mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>First-Time Account Onboarding</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Faculty Member Profile Setup
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1">
              Please complete your official academic profile setup to access the Faculty Mentor Dashboard and manage capstone projects.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm rounded-2xl font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <UserCheck className="w-4 h-4" />
                <span>1. Academic Identification</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Dr. / Prof. Full Name"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:border-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Faculty ID / Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={e => setEmployeeId(e.target.value)}
                    required
                    placeholder="e.g. BIT-FAC-102"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:border-indigo-600 transition font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Official Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-500 cursor-not-allowed font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <SearchableDepartmentSelect
                    departments={departments}
                    selectedId={departmentId}
                    onChange={val => setDepartmentId(val)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Designation <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={designation}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:border-indigo-600 transition"
                  >
                    {DESIGNATION_OPTIONS.map(d => (
                      <option key={d} value={d} className="bg-white text-slate-900">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Years of Experience <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={yearsExperience}
                    onChange={e => setYearsExperience(e.target.value)}
                    required
                    placeholder="e.g. 8"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white focus:border-indigo-600 transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Areas of Expertise / Specialization */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Briefcase className="w-4 h-4" />
                <span>2. Areas of Expertise / Specialization <span className="text-rose-500">*</span></span>
              </h3>
              <p className="text-xs text-slate-500">Select all technical areas that match your specialization:</p>

              <div className="flex flex-wrap gap-2">
                {EXPERTISE_OPTIONS.map(item => {
                  const active = selectedExpertise.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleSelection(item, selectedExpertise, setSelectedExpertise)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {active ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              {selectedExpertise.includes('Other / Custom Input') && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customExpertiseInput}
                    onChange={e => setCustomExpertiseInput(e.target.value)}
                    placeholder="Enter custom specialization (e.g. Quantum Computing, Bio-Robotics)..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-indigo-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Section 3: Subjects / Courses Handled */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <BookOpen className="w-4 h-4" />
                <span>3. Subjects / Courses Handled <span className="text-rose-500">*</span></span>
              </h3>
              <p className="text-xs text-slate-500">Enter the subjects or courses you teach (separated by commas):</p>
              <input
                type="text"
                value={subjectsHandledInput}
                onChange={e => setSubjectsHandledInput(e.target.value)}
                required
                placeholder="e.g. Machine Learning, Data Structures & Algorithms, Cloud Computing"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              />
            </div>

            {/* Section 4: Skills & Competencies */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Award className="w-4 h-4" />
                <span>4. Skills & Competencies</span>
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkillTag}
                  onChange={e => setCustomSkillTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkillTag();
                    }
                  }}
                  placeholder="Add a skill or tool (e.g. Python, TensorFlow, PyTorch)..."
                  className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddSkillTag}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
                >
                  Add Skill
                </button>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {selectedSkillsPills.map(skill => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkillTag(skill)}
                      className="hover:text-rose-600 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Section 5: Research Interests */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <GraduationCap className="w-4 h-4" />
                <span>5. Research Interests <span className="text-rose-500">*</span></span>
              </h3>
              <p className="text-xs text-slate-500">Select research domains you actively work on or guide:</p>

              <div className="flex flex-wrap gap-2">
                {RESEARCH_INTEREST_OPTIONS.map(item => {
                  const active = selectedResearchInterests.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleSelection(item, selectedResearchInterests, setSelectedResearchInterests)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        active
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {active ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              {selectedResearchInterests.includes('Other / Custom Input') && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customResearchInput}
                    onChange={e => setCustomResearchInput(e.target.value)}
                    placeholder="Enter custom research interest..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-teal-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Section 6: Preferred Project Domains */}
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-indigo-600 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
                <Code2 className="w-4 h-4" />
                <span>6. Preferred Project Domains <span className="text-rose-500">*</span></span>
              </h3>
              <p className="text-xs text-slate-500">Select capstone project domains you prefer to mentor:</p>

              <div className="flex flex-wrap gap-2">
                {PROJECT_DOMAIN_OPTIONS.map(item => {
                  const active = selectedDomains.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleSelection(item, selectedDomains, setSelectedDomains)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        active
                          ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/20'
                          : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300 hover:text-slate-900'
                      }`}
                    >
                      {active ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Plus className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              {selectedDomains.includes('Other / Custom Input') && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={customDomainInput}
                    onChange={e => setCustomDomainInput(e.target.value)}
                    placeholder="Enter custom project domain..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-amber-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:bg-white"
                  />
                </div>
              )}
            </div>

            {/* Submit Actions */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 text-center sm:text-left">
                By submitting, your official Faculty Profile will be registered and marked complete in the Capstone Hub database.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <span>Saving Profile...</span>
                ) : (
                  <>
                    <span>Complete Profile & Open Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
