import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { ProjectDetailsModal } from '../components/project/ProjectDetailsModal';
import {
  UserCheck, AlertCircle, Sparkles, FolderCheck, ArrowRight, Building, CheckCircle, XCircle, Eye
} from 'lucide-react';

export const MentorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showAlert } = useModal();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [recommendedProjects, setRecommendedProjects] = useState<any[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Project Details View
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [modalRequestContext, setModalRequestContext] = useState<'RECOMMENDED' | 'PENDING_REQUEST' | 'ASSIGNED' | 'GENERAL'>('GENERAL');
  const [modalRequestId, setModalRequestId] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadMentorData();
  }, []);

  const loadMentorData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mentors/assigned');
      if (res.data.success) {
        setPendingRequests(res.data.pendingRequests || []);
        setRecommendedProjects(res.data.recommendedProjects || []);
        setAssignedProjects(res.data.projects || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openProjectDetails = (
    projectId: string,
    context: 'RECOMMENDED' | 'PENDING_REQUEST' | 'ASSIGNED' | 'GENERAL' = 'GENERAL',
    reqId?: string
  ) => {
    setSelectedProjectId(projectId);
    setModalRequestContext(context);
    setModalRequestId(reqId);
  };

  const closeProjectDetails = () => {
    setSelectedProjectId(null);
    setModalRequestContext('GENERAL');
    setModalRequestId(undefined);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await api.post(`/mentor-requests/requests/${requestId}/accept`);
      await showAlert(res.data.message || 'Mentorship request accepted!', 'success');
      loadMentorData();
    } catch (e: any) {
      await showAlert(e.response?.data?.message || 'Failed to accept request.', 'error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const res = await api.post(`/mentor-requests/requests/${requestId}/reject`, { response_note: 'Declined' });
      await showAlert(res.data.message || 'Mentorship request declined.', 'info');
      loadMentorData();
    } catch (e: any) {
      await showAlert(e.response?.data?.message || 'Failed to reject request.', 'error');
    }
  };

  const handleAcceptDirectProject = async (projectId: string) => {
    try {
      const res = await api.post(`/mentor-requests/project/${projectId}/accept`);
      await showAlert(res.data.message || 'Project mentorship accepted!', 'success');
      loadMentorData();
    } catch (e: any) {
      await showAlert(e.response?.data?.message || 'Failed to accept project.', 'error');
    }
  };

  const handleRejectDirectProject = async (projectId: string) => {
    try {
      const res = await api.post(`/mentor-requests/project/${projectId}/reject`);
      await showAlert(res.data.message || 'Project removed from recommendations.', 'info');
      loadMentorData();
    } catch (e: any) {
      await showAlert(e.response?.data?.message || 'Failed to reject project.', 'error');
    }
  };

  const mentorProf = user?.mentor_profile;
  const currentLoad = assignedProjects.length || mentorProf?.current_load || 0;
  const capacity = mentorProf?.mentoring_capacity || 5;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Mentor Header */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold mb-3">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Faculty Mentorship Hub</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">{user?.name}</h1>
            <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>{user?.department_name}</span>
              <span>•</span>
              <span>Capacity: {currentLoad} / {capacity} Active Teams</span>
            </p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase">Current Workload</span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {Math.round((currentLoad / capacity) * 100)}%
            </div>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Columns */}
          <div className="lg:col-span-2 space-y-8">

            {/* Direct Hire Requests */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 ${pendingRequests.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                <span>Pending Direct Mentorship Requests ({pendingRequests.length})</span>
              </h2>

              {loading ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">Loading requests...</div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                  <p className="text-sm font-bold text-slate-700">No Pending Direct Requests</p>
                  <p className="text-xs text-slate-500">You currently have no direct mentorship hire requests from student teams.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map(req => (
                    <div
                      key={req.request_id}
                      onClick={() => openProjectDetails(req.project.project_id, 'PENDING_REQUEST', req.request_id)}
                      className="bg-white p-4 rounded-xl border border-amber-200 hover:border-amber-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {req.project.project_code && (
                            <span className="whitespace-nowrap shrink-0 px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded-md border border-indigo-200">
                              Project ID: {req.project.project_code}
                            </span>
                          )}
                          {req.project.team?.team_code && (
                            <span className="whitespace-nowrap shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-md border border-emerald-200">
                              Team ID: {req.project.team.team_code}
                            </span>
                          )}
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                            <span>{req.project.title}</span>
                            <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition" />
                          </h3>
                        </div>
                        <p className="text-xs text-slate-600">
                          Team Leader: <strong className="text-slate-800">{req.project.creator?.name}</strong> ({req.project.creator?.department?.department_name || user?.department_name})
                        </p>
                        <p className="text-[11px] text-slate-400">{req.project.domain}</p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleAcceptRequest(req.request_id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.request_id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department Recommended Projects */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <span>Recommended Student Projects ({user?.department_name || 'My Department'})</span>
                </h2>
                <span className="text-xs font-semibold text-slate-400">{recommendedProjects.length} Available</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">Loading department recommendations...</div>
              ) : recommendedProjects.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                  <p className="text-sm font-bold text-slate-700">No New Projects in Your Department</p>
                  <p className="text-xs text-slate-500">All student projects from your department have mentors or pending responses.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendedProjects.map(proj => (
                    <div
                      key={proj.project_id}
                      onClick={() => openProjectDetails(proj.project_id, 'RECOMMENDED')}
                      className="bg-white p-4 rounded-xl border border-indigo-100 hover:border-indigo-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xs hover:shadow-md transition cursor-pointer group"
                    >
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
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full border border-indigo-100">
                            {proj.creator?.department?.department_name || user?.department_name} Student Project
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                          <span>{proj.title}</span>
                          <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition" />
                        </h3>
                        <p className="text-xs text-slate-600">
                          Team Leader: <strong className="text-slate-800">{proj.creator?.name}</strong> • {proj.domain}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">{proj.abstract}</p>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleAcceptDirectProject(proj.project_id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept Project</span>
                        </button>
                        <button
                          onClick={() => handleRejectDirectProject(proj.project_id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Mentored Teams */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FolderCheck className="w-5 h-5 text-emerald-600" />
                <span>My Mentored Capstone Teams ({assignedProjects.length})</span>
              </h2>

              {loading ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">Loading teams...</div>
              ) : assignedProjects.length === 0 ? (
                <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
                  <p className="text-sm font-bold text-slate-700">No Active Mentored Teams</p>
                  <p className="text-xs text-slate-500">Accept requests or recommended projects above to start mentoring capstone teams.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedProjects.map(p => (
                    <div
                      key={p.project_id}
                      onClick={() => openProjectDetails(p.project_id, 'ASSIGNED')}
                      className="p-4 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-200 hover:border-indigo-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition cursor-pointer group"
                    >
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition flex items-center gap-1.5">
                          <span>{p.title}</span>
                          <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-indigo-500 transition" />
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">Leader: {p.creator?.name} • {p.creator?.department?.department_name}</p>
                      </div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Link
                          to={`/project/${p.project_id}/overview`}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shrink-0"
                        >
                          <span>Guidance Workspace</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Column (Mentor Profile) */}
          <div className="space-y-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-3">Mentor Expertise Profile</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-500">Department:</span>
                  <p className="font-bold text-slate-800">{user?.department_name}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Expertise Areas:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mentorProf?.expertise?.map((e: string) => (
                      <span key={e} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Research Interests:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {mentorProf?.research_interests?.map((r: string) => (
                      <span key={r} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Project Details Modal View */}
        {selectedProjectId && (
          <ProjectDetailsModal
            projectId={selectedProjectId}
            requestContext={modalRequestContext}
            requestId={modalRequestId}
            onClose={closeProjectDetails}
            onAcceptDirect={handleAcceptDirectProject}
            onRejectDirect={handleRejectDirectProject}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        )}
      </div>
    </AppShell>
  );
};


