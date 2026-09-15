import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { StatusPill } from '../components/ui/StatusPill';
import {
  FolderCheck, Crown, Users, Clock, Code2, AlertCircle, ArrowLeft,
  CheckCircle, XCircle, Shield, Sparkles, UserPlus
} from 'lucide-react';

export const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId);
    }
    api.get('/users/departments').then(res => setDepartments(res.data.departments || [])).catch(() => {});
  }, [projectId]);

  const fetchProjectDetails = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/projects/${id}`);
      if (res.data.success) {
        setProject(res.data.project);
        if (res.data.project?.created_by === user?.user_id) {
          fetchJoinRequests(id);
        }
      } else {
        setError(res.data.message || 'Project not found.');
      }
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access Denied: This project request is restricted to specific departments.');
      } else {
        setError(err.response?.data?.message || 'Failed to load project details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinRequests = async (id: string) => {
    try {
      const res = await api.get(`/projects/${id}/join-requests`);
      if (res.data.success) {
        setJoinRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch join requests', err);
    }
  };

  const handleRequestToJoin = async () => {
    if (!projectId) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/projects/${projectId}/join`);
      alert(res.data.message || 'Join request submitted successfully!');
      fetchProjectDetails(projectId);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send join request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespondJoinRequest = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      setActionLoading(true);
      const res = await api.post('/projects/join-request/respond', {
        request_id: requestId,
        action
      });
      alert(res.data.message || `Request ${action.toLowerCase()}ed.`);
      if (projectId) {
        fetchJoinRequests(projectId);
        fetchProjectDetails(projectId);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process request.');
    } finally {
      setActionLoading(false);
    }
  };

  const getDeptName = (idOrName: any) => {
    const found = departments.find(d => String(d.department_id) === String(idOrName) || d.department_name === idOrName);
    return found ? found.department_name : String(idOrName);
  };

  const isLeader = project?.created_by === user?.user_id;
  const isMember = project?.team?.members?.some((m: any) => m.student_id === user?.user_id);
  const joinStatus = project?.user_join_request_status || 'NONE';

  return (
    <AppShell>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        {loading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading project details...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-8 rounded-3xl text-center space-y-4">
            <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
            <h3 className="text-lg font-bold text-rose-900">{error}</h3>
            <p className="text-xs text-rose-700">You must belong to a targeted department to view this project request.</p>
            <button
              onClick={() => navigate('/my-projects')}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Return to My Projects
            </button>
          </div>
        ) : project && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100">
            {/* Header Banner */}
            <div className="p-8 bg-slate-900 text-white space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {project.project_code && (
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-mono font-bold">
                      Project ID: {project.project_code}
                    </span>
                  )}
                  {project.team?.team_code && (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-xs font-mono font-bold">
                      Team ID: {project.team.team_code}
                    </span>
                  )}
                  <StatusPill status={project.status} />
                  <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold">
                    {project.domain}
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-medium">{project.duration} • {project.difficulty_level}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{project.title}</h1>

              <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Team Leader: <strong className="text-white">{project.leader_name}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <span>Department: <strong className="text-white">{project.department_name}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-teal-400" />
                  <span>Team Capacity: <strong className="text-white">{project.team?.members?.length || 1} / {project.team_size}</strong></span>
                </div>
              </div>
            </div>

            {/* Main Body */}
            <div className="p-8 space-y-6 text-slate-900">
              
              {/* Faculty Mentor Card */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-2">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Assigned Faculty Mentor</h3>
                {project.mentor ? (
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{project.mentor.name}</p>
                    <p className="text-xs text-slate-500">{project.mentor.email}</p>
                    {project.mentor.department?.department_name && (
                      <p className="text-xs text-slate-600">Department: <strong className="text-slate-800">{project.mentor.department.department_name}</strong></p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 font-bold text-xs">
                    No Faculty Assigned
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Project Abstract</h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  {project.abstract}
                </p>
              </div>

              {project.problem_statement && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Problem Statement</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{project.problem_statement}</p>
                </div>
              )}

              {project.proposed_solution && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Proposed Solution</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{project.proposed_solution}</p>
                </div>
              )}

              {/* Target Departments */}
              {Array.isArray(project.required_departments) && project.required_departments.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Target Departments</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.required_departments.map((d: any) => (
                      <span key={d} className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold rounded-xl">
                        {getDeptName(d)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Skills */}
              {Array.isArray(project.required_skills) && project.required_skills.length > 0 && (
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.required_skills.map((s: string) => (
                      <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-xl">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Leader Approval Panel for Join Requests */}
              {isLeader && (
                <div className="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      <span>Pending Student Join Requests</span>
                    </h3>
                    <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-extrabold">
                      {joinRequests.filter(r => r.status === 'PENDING').length} Pending
                    </span>
                  </div>

                  {joinRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-indigo-100 text-center text-xs text-slate-500 font-medium">
                      No pending join requests for this project.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.filter(r => r.status === 'PENDING').map(req => (
                        <div key={req.request_id} className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{req.student_name}</span>
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-extrabold rounded">
                                  {req.year}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Reg No: <strong className="font-mono text-indigo-600">{req.register_number}</strong> • Dept: <strong className="text-slate-700">{req.department_name}</strong>
                              </p>
                              <p className="text-xs text-slate-500">{req.student_email}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRespondJoinRequest(req.request_id, 'ACCEPT')}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleRespondJoinRequest(req.request_id, 'REJECT')}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject</span>
                              </button>
                            </div>
                          </div>

                          {Array.isArray(req.skills) && req.skills.length > 0 && (
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Skills:</span>
                              {req.skills.map((s: string) => (
                                <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-semibold text-[10px] rounded-md">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Project Leader & Team Contact Details */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">Project Leader Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Name:</span>
                      <span className="font-bold text-slate-900">{project.leader_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Register Number:</span>
                      <span className="font-bold text-indigo-600 font-mono">{project.leader_register_number || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Email:</span>
                      <span className="font-medium text-slate-800">{project.leader_email || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Mobile Number:</span>
                      <span className="font-bold text-slate-800 font-mono">{project.leader_phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {project.team?.members && project.team.members.length > 0 && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Team Members</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {project.team.members.map((m: any) => (
                        <div key={m.student_id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 text-xs shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{m.name}</span>
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">{m.role}</span>
                          </div>
                          <p className="font-mono text-indigo-600 font-bold text-[11px]">Register No: {m.register_number || 'N/A'}</p>
                          <p className="text-slate-600 text-[11px]">{m.email}</p>
                          <p className="font-mono text-slate-700 text-[11px]">Mobile: {m.phone || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="p-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-bold text-slate-600">
                {isLeader ? (
                  <span>You are the <strong className="text-indigo-600">Project Leader</strong></span>
                ) : isMember ? (
                  <span>Status: <strong className="text-emerald-600">Team Member</strong></span>
                ) : (
                  <span>Join Request Status: <strong className="uppercase text-slate-900">{joinStatus}</strong></span>
                )}
              </div>

              {isLeader ? (
                <button
                  onClick={() => navigate(`/workspace/${project.project_id}`)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
                >
                  Open Workspace
                </button>
              ) : isMember ? (
                <div className="px-4 py-2 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>You're a team member</span>
                </div>
              ) : user?.role === 'STUDENT' ? (
                joinStatus === 'PENDING' ? (
                  <div className="px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs rounded-xl flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                    <span>Request Pending Leader Approval</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRequestToJoin}
                    disabled={actionLoading}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{actionLoading ? 'Sending Request...' : joinStatus === 'REJECTED' ? 'Request Again' : 'Request to Join Project'}</span>
                  </button>
                )
              ) : (
                <button
                  onClick={() => navigate('/my-projects')}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl shadow"
                >
                  View My Projects
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

