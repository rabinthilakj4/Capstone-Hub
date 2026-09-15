import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { SearchableDepartmentSelect } from '../components/ui/SearchableDepartmentSelect';
import {
  User, GraduationCap, Phone, Calendar, ArrowRight, ArrowLeft,
  Code2, Wrench, Users, CheckCircle2, Sparkles, AlertCircle, ShieldCheck
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

const YEAR_OPTIONS = ['I Year', 'II Year', 'III Year', 'IV Year'];

export const Register: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(user?.name || '');
  const [registerNumber, setRegisterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<number | string>('');
  const [year, setYear] = useState<string>('I Year');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync prefilled name from Google profile if available
  useEffect(() => {
    if (user?.name && !name) {
      setName(user.name);
    }
  }, [user]);

  // Existing Google user with completed profile enters Dashboard directly
  useEffect(() => {
    if (user && user.profile_completed) {
      const role = user.role;
      if (role === 'STUDENT') navigate('/student/dashboard', { replace: true });
      else if (role === 'MENTOR') navigate('/mentor/dashboard', { replace: true });
      else if (role === 'ADMIN') navigate('/admin/dashboard', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Prevent unwanted background body scrollbars
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow || 'unset';
    };
  }, []);

  // Fetch departments list for Page 1 dropdown
  useEffect(() => {
    api.get('/users/departments').then(res => {
      const depts = res.data.departments || [];
      setDepartments(depts);
      if (depts.length > 0 && !departmentId) {
        setDepartmentId(depts[0].department_id);
      }
    }).catch(() => {});
  }, []);

  const toggleSkill = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const validatePhone = (phoneStr: string): boolean => {
    const digitsOnly = phoneStr.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  };

  // PAGE 1 Validation -> Navigate to Page 2
  const handlePage1Next = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your Name.');
      return;
    }
    if (!registerNumber.trim()) {
      setError('Please enter your Register Number.');
      return;
    }
    if (!phone.trim()) {
      setError('Please enter your Mobile Number.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Please enter a valid Mobile Number.');
      return;
    }
    if (!departmentId) {
      setError('Please select your Department.');
      return;
    }
    if (!year) {
      setError('Please select your Academic Year.');
      return;
    }

    setStep(2);
  };

  // PAGE 2 Final Save -> Dashboard
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/users/complete-onboarding', {
        name: name.trim(),
        student_id: registerNumber.trim(),
        register_number: registerNumber.trim(),
        phone: phone.trim(),
        department_id: departmentId,
        year: year,
        skills: selectedSkills
      });

      if (res.data.success) {
        await refetchUser();
        const role = res.data.user?.role || user?.role || 'STUDENT';
        if (role === 'MENTOR') navigate('/mentor/dashboard', { replace: true });
        else if (role === 'ADMIN') navigate('/admin/dashboard', { replace: true });
        else navigate('/student/dashboard', { replace: true });
      } else {
        setError(res.data.message || 'Failed to save onboarding profile. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save onboarding profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-[100dvh] w-screen bg-slate-900 text-slate-900 flex flex-col justify-center items-center p-3 sm:p-6 overflow-hidden select-none relative">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-2xl w-full relative z-10">
        {/* Portal Header & Progress Indicator */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Capstone Platform Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            CAPSTONE HUB
          </h1>

          {/* 2-Step Progress Indicator */}
          <div className="mt-3 max-w-xs mx-auto">
            <div className="flex items-center justify-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? 'bg-indigo-500 shadow-sm' : 'bg-slate-700'}`} />
              <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? 'bg-indigo-500 shadow-sm' : 'bg-slate-700'}`} />
            </div>
            <div className="flex justify-between items-center text-[10px] font-extrabold uppercase tracking-wider mt-1.5 text-slate-400">
              <span className={step === 1 ? 'text-indigo-400 font-black' : ''}>1. User Details</span>
              <span className={step === 2 ? 'text-indigo-400 font-black' : ''}>2. Skill Selection</span>
            </div>
          </div>
        </div>

        {/* Main Light Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-2xl font-semibold flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* PAGE 1: USER DETAILS (All 5 fields on 1 page) */}
          {step === 1 && (
            <form onSubmit={handlePage1Next} className="space-y-4 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" />
                    <span>Page 1 — User Details</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">
                    Provide your student details to complete initial onboarding.
                  </p>
                </div>
                {user?.email && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-xs font-bold text-indigo-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{user.email}</span>
                  </div>
                )}
              </div>

              {/* 2-Column Responsive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Name (Prefilled from Google account) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition font-medium"
                    />
                  </div>
                </div>

                {/* 2. Register Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Register Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={registerNumber}
                      onChange={e => setRegisterNumber(e.target.value.toUpperCase())}
                      placeholder="7376242CB143"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition font-medium placeholder-slate-400 uppercase tracking-wide"
                    />
                  </div>
                </div>

                {/* 3. Mobile Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="XXXXX XXXXX"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition font-medium placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* 4. Department */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <SearchableDepartmentSelect
                    departments={departments}
                    selectedId={departmentId}
                    onChange={setDepartmentId}
                    placeholder="Select your department"
                  />
                </div>

                {/* 5. Academic Year */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-indigo-500 absolute left-3 top-3" />
                    <select
                      value={year}
                      onChange={e => setYear(e.target.value)}
                      required
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition appearance-none cursor-pointer"
                    >
                      {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Next Button */}
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-7 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition transform active:scale-[0.99]"
                >
                  <span>Next: Skill Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* PAGE 2: SKILL SELECTION */}
          {step === 2 && (
            <form onSubmit={handleFinalSubmit} className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-indigo-600" />
                    <span>Page 2 — Skill Selection</span>
                  </h2>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">
                    Select your technical skills and domain interests for team matching.
                  </p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full shrink-0">
                  {selectedSkills.length} Selected
                </span>
              </div>

              {/* 1. Technical Skills */}
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Technical Skills</span>
                </h3>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                  {TECHNICAL_SKILLS.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Tools & Technologies */}
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-teal-600" />
                  <span>2. Tools & Technologies</span>
                </h3>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                  {TOOLS_AND_TECH.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Project & Collaboration Skills */}
              <div className="space-y-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>3. Project & Collaboration Skills</span>
                </h3>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-24 overflow-y-auto">
                  {PROJECT_SKILLS.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm scale-105'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to User Details</span>
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 text-xs sm:text-sm"
                >
                  {loading ? (
                    <span>Saving Profile...</span>
                  ) : (
                    <>
                      <span>Finish & Enter Application</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
