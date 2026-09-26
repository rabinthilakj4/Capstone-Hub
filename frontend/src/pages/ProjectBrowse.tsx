import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { MatchBadge } from '../components/ui/MatchBadge';
import { StatusPill } from '../components/ui/StatusPill';
import { SearchableDomainSelect } from '../components/ui/SearchableDomainSelect';
import { ENGINEERING_DOMAINS } from '../constants/domains';
import { Compass, Search, Eye, CheckCircle, Clock, UserPlus, FolderX } from 'lucide-react';

export const ProjectBrowse: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestingMap, setRequestingMap] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchProjects();
    api.get('/users/departments').then(res => setDepartments(res.data.departments || [])).catch(() => {});
  }, [search, domainFilter]);

  const deptMap = useMemo(() => {
    const map: { [key: string]: string } = {};
    departments.forEach(d => {
      map[String(d.department_id)] = d.department_name;
      map[d.department_name] = d.department_name;
    });
    return map;
  }, [departments]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/projects/published', {
        params: { search, domain: domainFilter }
      });
      setProjects(res.data.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Combine predefined engineering domains with any custom domains present in fetched projects
  const availableDomains = useMemo(() => {
    const projectDomains = projects.map(p => p.domain).filter(Boolean);
    const combined = Array.from(new Set([...ENGINEERING_DOMAINS, ...projectDomains]));
    return combined.sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const handleRequestToJoin = async (projectId: string) => {
    try {
      setRequestingMap(prev => ({ ...prev, [projectId]: true }));
      const res = await api.post(`/projects/${projectId}/join`);
      await showAlert(res.data.message || 'Join request sent to project leader!', 'success');
      fetchProjects();
    } catch (err: any) {
      await showAlert(err.response?.data?.message || 'Failed to send join request.', 'error');
    } finally {
      setRequestingMap(prev => ({ ...prev, [projectId]: false }));
    }
  };

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
              <Compass className="w-3.5 h-3.5" />
              <span>Project Discovery Portal</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Discover Capstone Projects</h1>
            <p className="text-slate-300 text-sm mt-1">Explore project requests shared with your department and join complementary teams</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search projects by Project ID, Team ID, title, abstract, or domain..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <SearchableDomainSelect
            domains={availableDomains}
            selectedDomain={domainFilter}
            onChange={domain => setDomainFilter(domain)}
          />
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading department projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-3">
            <FolderX className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No Projects Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no open project requests matching your department or year eligibility.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.map(proj => {
              const status = proj.user_join_request_status;
              const isRequesting = requestingMap[proj.project_id];

              return (
                <div key={proj.project_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
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
                      </div>
                      <span className="text-xs font-bold text-slate-500">{proj.domain}</span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{proj.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Proposed by <strong className="text-slate-800">{proj.leader_name}</strong> ({proj.department_name}) • {proj.duration}
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

                  <div className="pt-3 border-t space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Team Capacity: {proj.team?.members?.length || 1} / {proj.team_size}</span>
                      <button
                        onClick={() => navigate(`/projects/details/${proj.project_id}`)}
                        className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Details</span>
                      </button>
                    </div>

                    {user?.role === 'STUDENT' && (
                      <div className="pt-1">
                        {status === 'PENDING' ? (
                          <div className="w-full py-2 px-3 bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                            <span>Request Pending Leader Approval</span>
                          </div>
                        ) : status === 'ACCEPTED' ? (
                          <div className="w-full py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                            <span>Joined Team</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleRequestToJoin(proj.project_id)}
                            disabled={isRequesting}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>{isRequesting ? 'Sending Request...' : status === 'REJECTED' ? 'Request Again' : 'Request to Join'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};


