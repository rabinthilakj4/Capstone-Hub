import React, { useState, useEffect } from 'react';
import { SearchableDepartmentSelect } from './SearchableDepartmentSelect';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  Sparkles, CheckCircle2, GraduationCap, ArrowRight, ArrowLeft, Mail, Phone, Calendar, Code2, Wrench, Users, AlertCircle
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

export const OnboardingModal: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [error, setError] = useState('');

  const [departments, setDepartments] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [departmentId, setDepartmentId] = useState<number | string>('');
  const [year, setYear] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  // Prevent background page scrolling while the onboarding modal/page is active
  useEffect(() => {
    if (user && !user.profile_completed && user.role === 'STUDENT' && !isDismissed) {
      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
        document.body.style.position = originalPosition || 'unset';
      };
    }
  }, [user, isDismissed]);

  useEffect(() => {
    if (user && !user.profile_completed && user.role === 'STUDENT') {
      api.get('/users/departments').then(res => {
        const depts = res.data.departments || [];
        setDepartments(depts);
        if (user.department_id) {
          setDepartmentId(String(user.department_id));
        }
      }).catch(() => {});

      setEmail(user.email || '');
      setRegisterNumber(user.student_id || '');
      setPhone(user.student_profile?.phone || '');
      setYear(user.student_profile?.year || '');

      if (user.student_profile?.skills) {
        const userSkills = typeof user.student_profile.skills === 'string'
          ? JSON.parse(user.student_profile.skills || '[]')
          : user.student_profile.skills;
        if (Array.isArray(userSkills) && userSkills.length > 0) {
          setSelectedSkills(userSkills);
        }
      }
    }
  }, [user]);

  // Don't show modal if non-student, already completed, or dismissed
  if (!user || user.profile_completed || user.role !== 'STUDENT' || isDismissed) return null;

  const toggleSkill = (skillName: string) => {
    if (selectedSkills.includes(skillName)) {
      setSelectedSkills(selectedSkills.filter(s => s !== skillName));
    } else {
      setSelectedSkills([...selectedSkills, skillName]);
    }
  };

  const validateEmailFormat = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr.trim());
  };

  const validatePhone = (phoneStr: string): boolean => {
    const digitsOnly = phoneStr.replace(/\D/g, '');
    return digitsOnly.length >= 7 && digitsOnly.length <= 15;
  };

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your Email address.');
      return;
    }
    if (!validateEmailFormat(email)) {
      setError('Email must have a valid email format (e.g., student@college.edu).');
      return;
    }

    if (!registerNumber.trim()) {
      setError('Register Number must be entered.');
      return;
    }

    if (!phone.trim()) {
      setError('Mobile Number must be entered.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('Mobile Number must be valid (e.g., XXXXX XXXXX).');
      return;
    }

    if (!departmentId) {
      setError('Department must be selected.');
      return;
    }

    if (!year) {
      setError('Year must be selected.');
      return;
    }

    setStep(2);
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/users/complete-onboarding', {
        email: email.trim(),
        student_id: registerNumber.trim(),
        phone: phone.trim(),
        department_id: departmentId,
        year: year,
        skills: selectedSkills
      });

      setIsDismissed(true);
      await refetchUser();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save profile setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 h-[100dvh] w-screen bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden select-none"
      onWheel={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <div className="bg-white border border-slate-200/90 rounded-3xl max-w-4xl w-full max-h-[100dvh] overflow-y-auto shadow-2xl overflow-hidden my-auto">
        
        {/* Light Header Banner */}
        <div className="bg-slate-50 p-6 sm:p-8 border-b border-slate-100">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            First-Time Profile Setup
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Welcome to Capstone Hub!</h2>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 font-medium">
            Configure your student profile for intelligent team matching & mentorship.
          </p>

          {/* Progress Indicator */}
          <div className="flex items-center gap-3 mt-4 max-w-xs">
            <div className={`flex-1 h-2 rounded-full transition-all ${step >= 1 ? 'bg-indigo-600 shadow-sm' : 'bg-slate-200'}`} />
            <div className={`flex-1 h-2 rounded-full transition-all ${step >= 2 ? 'bg-indigo-600 shadow-sm' : 'bg-slate-200'}`} />
          </div>
        </div>

        <div className="p-6 sm:p-8 md:p-10 space-y-6 text-slate-900">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-2xl font-semibold flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Registration Details */}
          {step === 1 && (
            <form onSubmit={handleStep1Continue} className="space-y-6 animate-in fade-in duration-150">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 text-indigo-600" />
                  <span>Step 1: Student Registration Details</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5 font-medium">Verify your email, register number, mobile number, department, and academic year.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="student@college.edu"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-medium placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Register Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Register Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={registerNumber}
                      onChange={e => setRegisterNumber(e.target.value.toUpperCase())}
                      placeholder="7376242CB143"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-medium placeholder-slate-400 uppercase tracking-wide"
                    />
                  </div>
                </div>

                {/* Mobile Number */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="XXXXX XXXXX"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white font-medium placeholder-slate-400"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
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

                {/* Academic Year */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Academic Year <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-5 h-5 text-indigo-500 absolute left-3.5 top-3.5" />
                    <select
                      value={year}
                      onChange={e => setYear(e.target.value)}
                      required
                      className={`w-full pl-11 pr-8 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition appearance-none cursor-pointer ${
                        year ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'
                      }`}
                    >
                      <option value="" disabled hidden>
                        Select your academic year
                      </option>
                      {YEAR_OPTIONS.map(y => (
                        <option key={y} value={y} className="text-slate-900 font-semibold">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 transition"
                >
                  <span>Continue to Skill Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Skill Selection */}
          {step === 2 && (
            <form onSubmit={handleCompleteSetup} className="space-y-6 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Code2 className="w-6 h-6 text-indigo-600" />
                    <span>Step 2: Skill Selection</span>
                  </h3>
                  <p className="text-slate-500 text-xs mt-0.5 font-medium">Select technical skills for intelligent project and team recommendations.</p>
                </div>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full">
                  {selectedSkills.length} Selected
                </span>
              </div>

              {/* 1. Technical Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>1. Technical Skills</span>
                </h4>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto">
                  {TECHNICAL_SKILLS.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto">
                  {TOOLS_AND_TECH.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Project Skills */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>3. Project & Collaboration Skills</span>
                </h4>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl max-h-40 overflow-y-auto">
                  {PROJECT_SKILLS.map(s => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Details</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {loading ? 'Saving Profile...' : 'Enter Website / Dashboard'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
