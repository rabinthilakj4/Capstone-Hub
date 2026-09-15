import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { StatusPill } from './StatusPill';
import {
  User, Mail, Building, Shield, Award, Sparkles, Briefcase,
  Globe, CheckCircle, Edit3, X, Save, Clock, BookOpen, Layers, Phone
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refetchUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form edit state
  const [allSkills, setAllSkills] = useState<any[]>([]);
  const [skills, setSkills] = useState<string[]>(user?.student_profile?.skills || user?.mentor_profile?.expertise || []);
  const [interests, setInterests] = useState<string[]>(user?.student_profile?.interests || user?.mentor_profile?.research_interests || []);
  const [experience, setExperience] = useState<string>(user?.student_profile?.experience || '');
  const [availability, setAvailability] = useState<string>(user?.student_profile?.availability || user?.mentor_profile?.availability || 'Available');
  const [phone, setPhone] = useState<string>(user?.student_profile?.phone || '');
  const [capacity, setCapacity] = useState<number>(user?.mentor_profile?.mentoring_capacity || 5);
  const [portfolioInput, setPortfolioInput] = useState<string>((user?.student_profile?.portfolio_links || []).join(', '));

  useEffect(() => {
    if (isOpen) {
      api.get('/users/skills').then(res => setAllSkills(res.data.skills || []));
      setSkills(user?.student_profile?.skills || user?.mentor_profile?.expertise || []);
      setInterests(user?.student_profile?.interests || user?.mentor_profile?.research_interests || []);
      setExperience(user?.student_profile?.experience || '');
      setAvailability(user?.student_profile?.availability || user?.mentor_profile?.availability || 'Available');
      setPhone(user?.student_profile?.phone || '');
      setCapacity(user?.mentor_profile?.mentoring_capacity || 5);
      setPortfolioInput((user?.student_profile?.portfolio_links || []).join(', '));
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isStudent = user.role === 'STUDENT';
  const isMentor = user.role === 'MENTOR';
  const isAdmin = user.role === 'ADMIN';

  const toggleSkill = (skillName: string) => {
    if (skills.includes(skillName)) {
      setSkills(skills.filter(s => s !== skillName));
    } else {
      setSkills([...skills, skillName]);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      if (isStudent) {
        const portfolioArr = portfolioInput.split(',').map(s => s.trim()).filter(Boolean);
        await api.put('/users/student-profile', {
          skills,
          interests,
          experience,
          availability,
          phone,
          portfolio_links: portfolioArr
        });
      } else if (isMentor) {
        await api.put('/users/mentor-profile', {
          expertise: skills,
          research_interests: interests,
          availability,
          mentoring_capacity: capacity
        });
      }
      await refetchUser();
      setIsEditing(false);
      alert('Profile details updated successfully!');
    } catch (e) {
      alert('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const portfolioLinks = user.student_profile?.portfolio_links || [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 my-8 overflow-hidden">
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-full transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center font-black text-3xl sm:text-4xl shadow-xl border-4 border-indigo-400/30 flex-shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold uppercase tracking-wider">
                  {user.role}
                </span>
                <StatusPill status={user.status || 'ACTIVE'} />
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{user.name}</h2>
              {user.student_id && (
                <p className="text-indigo-300 text-xs font-mono font-bold">
                  Register No: {user.student_id}
                </p>
              )}
              <p className="text-slate-300 text-xs sm:text-sm font-medium flex items-center justify-center sm:justify-start gap-1.5">
                <Building className="w-4 h-4 text-indigo-400" />
                <span>{user.department_name}</span>
              </p>
              <p className="text-slate-400 text-xs flex items-center justify-center sm:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{user.email}</span>
              </p>
              {(user.student_profile?.phone || (user as any).phone) && (
                <p className="text-slate-300 text-xs flex items-center justify-center sm:justify-start gap-1.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{user.student_profile?.phone || (user as any).phone}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Details */}
        <div className="p-6 sm:p-8 space-y-6">
          {!isEditing ? (
            <>
              {/* STUDENT PROFILE DETAILS */}
              {isStudent && (
                <div className="space-y-5 text-xs sm:text-sm">
                  {/* Skills Badges */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Technical Skills & Expertise
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user.student_profile?.skills?.map((s: string) => (
                        <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-xl border border-indigo-100">
                          {s}
                        </span>
                      )) || <span className="text-slate-400">No skills added yet</span>}
                    </div>
                  </div>



                  {/* Experience & Availability */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        Prior Experience
                      </span>
                      <p className="text-xs font-semibold text-slate-800 mt-1">
                        {user.student_profile?.experience || 'Engineering Student'}
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Project Availability
                      </span>
                      <p className="text-xs font-semibold text-emerald-700 mt-1">
                        {user.student_profile?.availability || 'High Availability'}
                      </p>
                    </div>
                  </div>

                  {/* Portfolio Links */}
                  {portfolioLinks.length > 0 && (
                    <div>
                      <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-indigo-600" />
                        Portfolio & Code Repositories
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {portfolioLinks.map((link: string, idx: number) => (
                          <a
                            key={idx}
                            href={link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center gap-1 border border-indigo-200 transition"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {link.replace(/^https?:\/\//, '')}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MENTOR PROFILE DETAILS */}
              {isMentor && (
                <div className="space-y-5 text-xs sm:text-sm">
                  {/* Expertise Areas */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-amber-600" />
                      Faculty Expertise Areas
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user.mentor_profile?.expertise?.map((e: string) => (
                        <span key={e} className="px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200">
                          {e}
                        </span>
                      )) || <span className="text-slate-400">No expertise specified</span>}
                    </div>
                  </div>

                  {/* Research Interests */}
                  <div>
                    <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      Research Interests & Capstone Domains
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {user.mentor_profile?.research_interests?.map((r: string) => (
                        <span key={r} className="px-3 py-1 bg-slate-100 text-slate-700 font-semibold rounded-xl border">
                          {r}
                        </span>
                      )) || <span className="text-slate-400">No research interests specified</span>}
                    </div>
                  </div>

                  {/* Capacity & Workload Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mentoring Capacity</span>
                      <p className="text-base font-black text-slate-900 mt-0.5">
                        {user.mentor_profile?.mentoring_capacity || 5} Active Teams Max
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Workload Load</span>
                      <p className="text-base font-black text-amber-600 mt-0.5">
                        {user.mentor_profile?.current_load || 1} Assigned Team ({Math.round(((user.mentor_profile?.current_load || 1) / (user.mentor_profile?.mentoring_capacity || 5)) * 100)}% Capacity)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN PROFILE DETAILS */}
              {isAdmin && (
                <div className="space-y-5 text-xs sm:text-sm">
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-2">
                    <h3 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <span>Administrator System Privileges</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs text-indigo-800 font-semibold pl-6 list-disc">
                      <li>Full University Project Review & Approval Authority</li>
                      <li>Student & Mentor Account Activation & Governance</li>
                      <li>Multidisciplinary Team & Mentor Assignment Override</li>
                      <li>Matching Engine Weight & Scoring Configuration</li>
                      <li>System Security & Audit Logging Oversight</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Edit Trigger Button */}
              {!isAdmin && (
                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile Details
                  </button>
                </div>
              )}
            </>
          ) : (
            /* EDIT PROFILE FORM */
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-slate-900 text-base">Edit {user.name}'s Profile Details</h3>
                <span className="text-xs font-semibold text-slate-500">Update skills & preferences</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Select {isStudent ? 'Technical Skills' : 'Faculty Expertise Areas'}
                </label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border rounded-2xl max-h-40 overflow-y-auto">
                  {allSkills.map(s => {
                    const active = skills.includes(s.skill_name);
                    return (
                      <button
                        key={s.skill_id}
                        type="button"
                        onClick={() => toggleSkill(s.skill_name)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {s.skill_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isStudent ? 'Prior Experience / Internships' : 'Mentoring Capacity (Max Teams)'}
                </label>
                {isStudent ? (
                  <textarea
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    rows={2}
                    placeholder="Describe relevant projects or internship experience..."
                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs"
                  />
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={capacity}
                    onChange={e => setCapacity(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-bold"
                  />
                )}
              </div>

              {isStudent && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Enter mobile number (e.g. +91 9876543210)"
                      className="w-full p-3 bg-slate-50 border rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Portfolio & Github Links (comma separated)
                    </label>
                    <input
                      type="text"
                      value={portfolioInput}
                      onChange={e => setPortfolioInput(e.target.value)}
                      placeholder="https://github.com/username, https://portfolio.dev"
                      className="w-full p-3 bg-slate-50 border rounded-xl text-xs"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : 'Save Profile Changes'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
