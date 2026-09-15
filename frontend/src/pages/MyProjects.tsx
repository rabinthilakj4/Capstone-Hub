import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { StatusPill } from '../components/ui/StatusPill';
import { FolderCheck, UserCheck, Crown, RefreshCw, AlertCircle, Users } from 'lucide-react';

interface ProjectItem {
  project_id: string;
  project_code?: string;
  team_code?: string;
  title: string;
  abstract: string;
  domain: string;
  status: string;
  duration: string;
  team_size: number;
  leader_name: string;
  department_name: string;
  role: 'Project Leader' | 'Team Member' | 'Faculty Mentor' | 'Department Project';
  required_skills: string[];
  required_departments: (string | number)[];
  team_member_count: number;
}

export const MyProjects: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'ALL' | 'MY_PROJECTS' | 'OTHER_PROJECTS'>('ALL');
  const [myProjectsData, setMyProjectsData] = useState<ProjectItem[]>([]);
  const [otherProjectsData, setOtherProjectsData] = useState<ProjectItem[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyProjects();
    api.get('/users/departments').then(res => setDepartments(res.data.departments || [])).catch(() => {});
  }, []);

  const deptMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    departments.forEach(d => {
      map[String(d.department_id)] = d.department_name;
      map[d.department_name] = d.department_name;
    });
    return map;
  }, [departments]);

  const fetchMyProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/projects/mine');
      if (res.data.success) {
        setMyProjectsData(res.data.myProjects || []);
        setOtherProjectsData(res.data.otherProjects || []);
      } else {
        setError(res.data.message || 'Failed to fetch projects.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Compute deduplicated "ALL" list with Role Precedence (Leader wins over Member)
  const allProjects = useMemo(() => {
    const myIds = new Set(myProjectsData.map(p => p.project_id));
    const filteredOther = otherProjectsData.filter(p => !myIds.has(p.project_id));
    return [...myProjectsData, ...filteredOther];
  }, [myProjectsData, otherProjectsData]);

  const currentTabProjects = useMemo(() => {
    switch (activeTab) {
      case 'MY_PROJECTS':
        return myProjectsData;
      case 'OTHER_PROJECTS':
        return otherProjectsData;
      case 'ALL':
      default:
        return allProjects;
    }
  }, [activeTab, myProjectsData, otherProjectsData, allProjects]);

  const getEmptyMessage = () => {
    const isMentor = user?.role === 'MENTOR';
    switch (activeTab) {
      case 'MY_PROJECTS':
        return isMentor ? "You are not mentoring any active projects yet." : "You haven't created any projects yet.";
      case 'OTHER_PROJECTS':
        return isMentor ? "No other department projects found." : "You haven't joined any other projects yet.";
      case 'ALL':
      default:
        return isMentor ? "No projects found." : "You have no projects yet.";
    }
  };

  const handleKeyDownTab = (e: React.KeyboardEvent, tab: 'ALL' | 'MY_PROJECTS' | 'OTHER_PROJECTS') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tab);
    }
  };

  const isMentor = user?.role === 'MENTOR';

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
              <FolderCheck className="w-3.5 h-3.5" />
              <span>Project Management Workspace</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{isMentor ? 'Mentored & Department Projects' : 'My Projects'}</h1>
            <p className="text-slate-300 text-sm mt-1">{isMentor ? 'Manage your mentored capstone teams and explore department project proposals' : 'Manage your created capstone projects and your team memberships'}</p>
          </div>

          <button
            onClick={fetchMyProjects}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-2" role="tablist" aria-label="My Projects Categories">
          <button
            role="tab"
            aria-selected={activeTab === 'ALL'}
            tabIndex={0}
            onClick={() => setActiveTab('ALL')}
            onKeyDown={e => handleKeyDownTab(e, 'ALL')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>All Projects</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'ALL' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {allProjects.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'MY_PROJECTS'}
            tabIndex={0}
            onClick={() => setActiveTab('MY_PROJECTS')}
            onKeyDown={e => handleKeyDownTab(e, 'MY_PROJECTS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'MY_PROJECTS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{isMentor ? 'Mentored Projects' : 'My Projects'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'MY_PROJECTS' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {myProjectsData.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'OTHER_PROJECTS'}
            tabIndex={0}
            onClick={() => setActiveTab('OTHER_PROJECTS')}
            onKeyDown={e => handleKeyDownTab(e, 'OTHER_PROJECTS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'OTHER_PROJECTS'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isMentor ? 'Department Projects' : 'Other Projects'}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === 'OTHER_PROJECTS' ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {otherProjectsData.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading your projects...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-rose-900">{error}</p>
            <button
              onClick={fetchMyProjects}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Retry
            </button>
          </div>
        ) : currentTabProjects.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <FolderCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">{getEmptyMessage()}</p>
            {activeTab === 'MY_PROJECTS' && user?.role === 'STUDENT' && (
              <button
                onClick={() => navigate('/projects/create')}
                className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Create a Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentTabProjects.map(proj => (
              <div key={proj.project_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap items-center gap-2">
                      {proj.project_code && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded-md border border-indigo-200">
                          Project ID: {proj.project_code}
                        </span>
                      )}
                      {proj.team_code && (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-md border border-emerald-200">
                          Team ID: {proj.team_code}
                        </span>
                      )}
                      <StatusPill status={proj.status} />
                      {proj.role === 'Project Leader' ? (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[11px] font-extrabold rounded-lg flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-600" />
                          <span>Project Leader</span>
                        </span>
                      ) : proj.role === 'Faculty Mentor' ? (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 text-[11px] font-extrabold rounded-lg flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-purple-600" />
                          <span>Faculty Mentor</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-[11px] font-extrabold rounded-lg flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-indigo-600" />
                          <span>{proj.role || 'Team Member'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-500">{proj.domain}</span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                    <p className="text-xs text-slate-600 font-semibold mt-1">
                      Project Leader: <span className="text-slate-900 font-bold">{proj.leader_name}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      Department: <span className="text-slate-700 font-semibold">{proj.department_name}</span>
                    </p>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-3 rounded-xl border">{proj.abstract}</p>

                  {Array.isArray(proj.required_departments) && proj.required_departments.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Departments:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {proj.required_departments.map((d: any) => (
                          <span key={d} className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-semibold rounded">
                            {deptMap[String(d)] || d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(proj.required_skills) && proj.required_skills.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Required Skills:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {proj.required_skills.map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-semibold rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Team Capacity: {proj.team_member_count || 1} / {proj.team_size}</span>
                  </span>

                  <button
                    onClick={() => navigate(`/project/${proj.project_id}`)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
                  >
                    Open Workspace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};
