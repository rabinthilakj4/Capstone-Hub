import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { MatchBadge } from '../components/ui/MatchBadge';
import { StatusPill } from '../components/ui/StatusPill';
import { HireMentorModal } from '../components/ui/HireMentorModal';
import {
  Sparkles, Compass, UserCheck, Calendar, CheckSquare, Plus,
  Award, ArrowRight, ChevronRight, User, AlertCircle
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const [recommendedProjects, setRecommendedProjects] = useState<any[]>([]);
  const [recommendedMentors, setRecommendedMentors] = useState<any[]>([]);
  const [myWorkspace, setMyWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editSkills, setEditSkills] = useState<string[]>(user?.student_profile?.skills || []);
  const [editInterests, setEditInterests] = useState<string[]>(user?.student_profile?.interests || []);
  const [editYear, setEditYear] = useState<string>(user?.student_profile?.year || '1st Year');
  const [editPhone, setEditPhone] = useState<string>(user?.student_profile?.phone || '');
  const [allSkills, setAllSkills] = useState<any[]>([]);

  useEffect(() => {
    if (user?.student_profile) {
      setEditSkills(user.student_profile.skills || []);
      setEditInterests(user.student_profile.interests || []);
      setEditYear(user.student_profile.year || '1st Year');
      setEditPhone(user.student_profile.phone || '');
    }
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const projRes = await api.get('/projects/published');
      const allProjects = projRes.data.projects || [];
      const recommendedFiltered = allProjects.filter((p: any) => (p.match_score !== undefined && p.match_score !== null) ? p.match_score >= 60 : true);
      setRecommendedProjects(recommendedFiltered);

      const skillsRes = await api.get('/users/skills');
      setAllSkills(skillsRes.data.skills || []);

      try {
        const mineRes = await api.get('/projects/mine');
        const myProjectsList = mineRes.data.myProjects || [];
        const activeProj = myProjectsList[0];

        if (activeProj) {
          const wsRes = await api.get(`/workspace/${activeProj.project_id}`);
          setMyWorkspace(wsRes.data.workspace);

          const mentorRes = await api.get(`/mentors/recommendations/${activeProj.project_id}`);
          setRecommendedMentors(mentorRes.data.mentors || []);
        } else {
          setMyWorkspace(null);
          const mentorRes = await api.get('/mentors/recommendations');
          setRecommendedMentors(mentorRes.data.mentors || []);
        }
      } catch (e) {
        const mentorRes = await api.get('/mentors/recommendations').catch(() => ({ data: { mentors: [] } }));
        setRecommendedMentors(mentorRes.data.mentors || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await api.put('/users/student-profile', {
        skills: editSkills,
        interests: editInterests,
        year: editYear,
        phone: editPhone
      });
      await refetchUser();
      setIsEditingProfile(false);
      loadDashboardData();
    } catch (e) {
      alert('Failed to update profile.');
    }
  };

  // Hire Guide Modal State
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [selectedMentorForHire, setSelectedMentorForHire] = useState<any>(null);

  const handleOpenHireModal = (mentor: any) => {
    setSelectedMentorForHire(mentor);
    setIsHireModalOpen(true);
  };

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multidisciplinary Student Ecosystem</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Welcome back, {user?.name}!</h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                {user?.department_name} • {user?.student_profile?.availability || 'Available for Projects'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
              <Link
                to="/projects/create"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg text-xs sm:text-sm transition"
              >
                <Plus className="w-4 h-4" />
                Create Project
              </Link>
              <Link
                to="/projects/browse"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 text-xs sm:text-sm transition"
              >
                <Compass className="w-4 h-4 text-indigo-400" />
                Discover Projects
              </Link>
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Active Project Workspace Widget */}
            {myWorkspace ? (
              <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                  <div>
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600">Active Workspace</span>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <h2 className="text-lg sm:text-xl font-bold text-slate-900">{myWorkspace.project.title}</h2>
                      {myWorkspace.project.project_code && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-mono font-bold rounded-md border border-indigo-200">
                          Project ID: {myWorkspace.project.project_code}
                        </span>
                      )}
                      {myWorkspace.project.team?.team_code && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-mono font-bold rounded-md border border-emerald-200">
                          Team ID: {myWorkspace.project.team.team_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    to={`/project/${myWorkspace.project.project_id}/overview`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-xs transition"
                  >
                    Enter Workspace
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Health Indicator</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {myWorkspace.health?.healthScore}%
                    </div>
                    <span className="text-xs text-emerald-600 font-bold">Optimal Velocity</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Active Tasks</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">
                      {myWorkspace.tasks.filter((t: any) => t.status !== 'COMPLETED').length} / {myWorkspace.tasks.length}
                    </div>
                    <span className="text-xs text-indigo-600 font-bold">Kanban Active</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Assigned Mentor</span>
                    <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                      {myWorkspace.project.mentor?.name ? myWorkspace.project.mentor.name : 'No Faculty Assigned'}
                    </div>
                    <span className={`text-xs font-bold ${myWorkspace.project.mentor ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {myWorkspace.project.mentor ? 'Mentorship Active' : 'No Faculty Assigned'}
                    </span>
                  </div>
                </div>

                {/* Team Members */}
                <div className="space-y-2">
                  <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
                    Multidisciplinary Team ({myWorkspace.project.team?.members.length} Members)
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {myWorkspace.project.team?.members.map((m: any) => {
                      const memberName = m.student?.name || m.name || 'Student';
                      const memberDept = m.student?.department?.department_name || m.department_name || 'Engineering';
                      return (
                        <div key={m.student_id || memberName} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                          <div className="w-6 h-6 bg-indigo-600 text-white rounded-full text-xs flex items-center justify-center font-bold">
                            {memberName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{memberName}</p>
                            <p className="text-[10px] text-slate-500">{memberDept}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200">
                <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">No Active Project Workspace Yet</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto mt-1 mb-4">
                  Create a new project proposal or discover existing published capstone projects to form a team.
                </p>
                <Link
                  to="/projects/create"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm shadow"
                >
                  Create Project Proposal
                </Link>
              </div>
            )}

            {/* AI Ranked Project Recommendations */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">Recommended Projects</h2>
                </div>
                <Link to="/projects/browse" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                  View All ({recommendedProjects.length})
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {recommendedProjects.slice(0, 3).map(proj => (
                  <div key={proj.project_id} className="p-4 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 rounded-xl transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {proj.project_code && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded-md border border-indigo-200">
                            Project ID: {proj.project_code}
                          </span>
                        )}
                        {proj.team?.team_code && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-md border border-emerald-200">
                            Team ID: {proj.team.team_code}
                          </span>
                        )}
                        <StatusPill status={proj.status} />
                        {proj.match_score && <MatchBadge score={proj.match_score} breakdown={proj.match_breakdown} />}
                        <span className="text-xs font-semibold text-slate-500">{proj.domain}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 hover:text-indigo-600 transition">
                        <Link to={`/projects/browse`}>{proj.title}</Link>
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-2">{proj.abstract}</p>
                    </div>

                    <Link
                      to={`/projects/browse`}
                      className="w-full sm:w-auto text-center px-4 py-2 bg-white border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl font-bold text-xs transition shadow-sm"
                    >
                      View Project
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Mentor Recommendations */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Recommended & Assigned Mentors</h2>
              </div>

              {recommendedMentors.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No mentor recommendations available for your department.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {recommendedMentors.slice(0, 4).map(mentor => (
                    <div key={mentor.mentor_id || mentor.user_id} className={`p-4 rounded-xl border space-y-3 transition ${
                      mentor.isAssigned
                        ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                        : mentor.isRequested
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-slate-900 text-sm">{mentor.name}</h3>
                            {mentor.isAssigned && (
                              <span className="px-2 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-full">
                                ASSIGNED
                              </span>
                            )}
                            {mentor.isRequested && (
                              <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-full">
                                PENDING
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-semibold text-indigo-600 mt-0.5">{mentor.department}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {mentor.staff_id || mentor.user_id}</p>
                        </div>
                        <MatchBadge score={mentor.matchScore} breakdown={mentor.matchBreakdown} label="Match" />
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-600 border-t border-slate-200/60 pt-2">
                        <p className="flex items-center gap-1">
                          <span className="font-medium text-slate-400">Email:</span>
                          <span className="font-semibold text-slate-800">{mentor.email}</span>
                        </p>
                        {mentor.phone && (
                          <p className="flex items-center gap-1">
                            <span className="font-medium text-slate-400">Mobile:</span>
                            <span className="font-mono font-bold text-slate-800">{mentor.phone}</span>
                          </p>
                        )}
                      </div>

                      {mentor.isAssigned ? (
                        <div className="w-full py-2 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-lg text-center border border-emerald-300">
                          ✓ Assigned Guide & Mentor
                        </div>
                      ) : mentor.isRequested ? (
                        <div className="w-full py-2 bg-amber-100 text-amber-800 font-bold text-xs rounded-lg text-center border border-amber-300">
                          Mentorship Request Sent
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenHireModal(mentor)}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition shadow-sm"
                        >
                          Send Mentorship Request
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 sm:space-y-8">
            {/* Student Profile Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>My Profile & Details</span>
                </h3>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="text-xs font-bold text-indigo-600 hover:underline"
                >
                  {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>

              {!isEditingProfile ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-500">Full Name:</span>
                    <p className="font-bold text-slate-900">{user?.name}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Register Number:</span>
                    <p className="font-bold text-indigo-600 font-mono">{user?.student_id || (user as any)?.register_number || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Email Address:</span>
                    <p className="font-medium text-slate-800">{user?.email}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Mobile Number:</span>
                    <p className="font-bold text-slate-800 font-mono">
                      {user?.student_profile?.phone || (user as any)?.phone || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Department:</span>
                    <p className="font-bold text-slate-800">{user?.department_name}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Academic Year:</span>
                    <p className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded w-fit mt-0.5">
                      {user?.student_profile?.year || '1st Year'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500">Technical Skills:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {user?.student_profile?.skills?.map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Academic Year</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map((y) => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => setEditYear(y)}
                          className={`py-1.5 rounded-lg font-bold text-xs border transition ${
                            editYear === y
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Select Skills</label>
                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto bg-slate-50 p-2 rounded border">
                      {allSkills.map(s => {
                        const active = editSkills.includes(s.skill_name);
                        return (
                          <button
                            key={s.skill_id}
                            type="button"
                            onClick={() => {
                              if (active) setEditSkills(editSkills.filter(x => x !== s.skill_name));
                              else setEditSkills([...editSkills, s.skill_name]);
                            }}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              active ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border'
                            }`}
                          >
                            {s.skill_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveProfile}
                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs"
                  >
                    Save Profile Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <HireMentorModal
        isOpen={isHireModalOpen}
        mentor={selectedMentorForHire}
        onClose={() => setIsHireModalOpen(false)}
        onSuccess={loadDashboardData}
        initialProjectId={myWorkspace?.project?.project_id}
      />
    </AppShell>
  );
};
