import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { StatusPill } from '../ui/StatusPill';
import {
  X, ArrowLeft, Building, Calendar, UserCheck, UserX, Users,
  CheckCircle, XCircle, Shield, Sparkles, FileText, Cpu, Code2, Award, ArrowRight, User
} from 'lucide-react';

interface ProjectDetailsModalProps {
  projectId: string;
  onClose: () => void;
  onAcceptDirect?: (projectId: string) => void;
  onRejectDirect?: (projectId: string) => void;
  onAcceptRequest?: (requestId: string) => void;
  onRejectRequest?: (requestId: string) => void;
  requestContext?: 'RECOMMENDED' | 'PENDING_REQUEST' | 'ASSIGNED' | 'GENERAL';
  requestId?: string;
}

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  projectId,
  onClose,
  onAcceptDirect,
  onRejectDirect,
  onAcceptRequest,
  onRejectRequest,
  requestContext = 'GENERAL',
  requestId
}) => {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      fetchDetails();
    }
  }, [projectId]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/projects/${projectId}`);
      if (res.data.success) {
        setProject(res.data.project);
      } else {
        setError(res.data.message || 'Project not found.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch complete project details.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Navigation & Header Actions Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Back to Faculty Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">
              Project Details View
            </span>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-rose-600/30 hover:text-rose-400 text-slate-400 rounded-xl transition"
              title="Close View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Loading complete project details...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
              <XCircle className="w-10 h-10 text-rose-600 mx-auto" />
              <h3 className="text-base font-bold text-rose-900">{error}</h3>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition"
              >
                Back to Dashboard
              </button>
            </div>
          ) : project && (
            <div className="space-y-6">
              
              {/* Project Main Header Card */}
              <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white space-y-4 shadow-lg border border-slate-800">
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
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold">
                      {project.domain || 'Capstone Domain'}
                    </span>
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 border border-slate-700 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-400" />
                      {project.department_name || project.creator?.department?.department_name || 'Department'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Created: <strong className="text-white">{formatDate(project.created_at)}</strong></span>
                  </div>
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
                    {project.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-2 border-t border-slate-800">
                  <span>Duration: <strong className="text-white">{project.duration || '1 Semester'}</strong></span>
                  <span>•</span>
                  <span>Difficulty: <strong className="text-white">{project.difficulty_level || 'Intermediate'}</strong></span>
                  <span>•</span>
                  <span>Team Size Capacity: <strong className="text-white">{project.team?.members?.length || 1} / {project.team_size || 4} Students</strong></span>
                </div>
              </div>

              {/* Faculty & Student Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Assigned Faculty Mentor Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-600" />
                      <span>Assigned Faculty Mentor</span>
                    </h3>
                  </div>

                  {project.mentor ? (
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-extrabold flex items-center justify-center shrink-0">
                          {project.mentor.name?.charAt(0) || 'F'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{project.mentor.name}</h4>
                          <p className="text-xs text-slate-500">{project.mentor.email}</p>
                        </div>
                      </div>
                      <div className="pt-2 text-xs text-slate-600 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                        {project.mentor.department?.department_name && (
                          <span>Dept: <strong className="text-slate-800">{project.mentor.department.department_name}</strong></span>
                        )}
                        {project.mentor.mentor_profile?.designation && (
                          <span>Designation: <strong className="text-slate-800">{project.mentor.mentor_profile.designation}</strong></span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center gap-3">
                      <UserX className="w-6 h-6 text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">No Faculty Assigned</p>
                        <p className="text-xs text-amber-700">This capstone project does not have an assigned faculty mentor yet.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Students & Team Leader Summary Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600" />
                      <span>Project Creator / Leader</span>
                    </h3>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{project.leader_name}</span>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-extrabold rounded-md border border-emerald-200">
                        Team Leader
                      </span>
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <p>Register No: <strong className="text-indigo-600 font-mono font-bold">{project.leader_register_number || 'N/A'}</strong></p>
                      <p>Email: <strong className="text-slate-800">{project.leader_email || 'N/A'}</strong></p>
                      <p>Department: <strong className="text-slate-800">{project.department_name}</strong></p>
                      {project.leader_phone && <p>Mobile: <strong className="text-slate-800 font-mono">{project.leader_phone}</strong></p>}
                    </div>
                  </div>
                </div>

              </div>

              {/* Assigned Student Team Members */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Assigned Students & Team Members ({project.team?.members?.length || 0})</span>
                  </h3>
                </div>

                {project.team?.members && project.team.members.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {project.team.members.map((m: any) => (
                      <div key={m.student_id} className="p-4 bg-white border border-slate-200 rounded-xl space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-indigo-600" />
                            <span className="font-bold text-slate-900 text-xs">{m.name}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${m.role === 'Leader' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-700'}`}>
                            {m.role}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-slate-600">
                          <p>Student ID / Register No: <strong className="text-indigo-600 font-mono font-bold">{m.register_number || m.student_id || 'N/A'}</strong></p>
                          <p>Official Email: <strong className="text-slate-800">{m.email}</strong></p>
                          <p>Department: <strong className="text-slate-800">{m.department_name || project.department_name}</strong></p>
                          {Array.isArray(m.skills) && m.skills.length > 0 && (
                            <div className="pt-1.5 flex flex-wrap gap-1">
                              {m.skills.map((sk: string) => (
                                <span key={sk} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl text-center">
                    <p className="text-xs font-bold text-slate-700">No Students Assigned</p>
                    <p className="text-[11px] text-slate-500">There are currently no additional student team members assigned to this project.</p>
                  </div>
                )}
              </div>

              {/* Project Core Description & Statements */}
              <div className="space-y-4">
                {project.description && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Project Description</span>
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {project.description}
                    </p>
                  </div>
                )}

                {project.abstract && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Project Abstract</span>
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                      {project.abstract}
                    </p>
                  </div>
                )}

                {project.problem_statement && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Problem Statement</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{project.problem_statement}</p>
                  </div>
                )}

                {project.proposed_solution && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Proposed Solution</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{project.proposed_solution}</p>
                  </div>
                )}

                {project.expected_outcome && (
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Expected Outcome</h3>
                    <p className="text-sm text-slate-700 leading-relaxed">{project.expected_outcome}</p>
                  </div>
                )}
              </div>

              {/* Technical & Skill Requirements Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Required Skills */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-indigo-600" />
                    <span>Required Skills</span>
                  </h3>
                  {Array.isArray(project.required_skills) && project.required_skills.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {project.required_skills.map((skill: string) => (
                        <span key={skill} className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-xl">
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">No specific skills specified</p>
                  )}
                </div>

                {/* Technologies & Tools */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-teal-600" />
                    <span>Technologies & Hardware</span>
                  </h3>
                  {Array.isArray(project.technologies) && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {project.technologies.map((tech: string) => (
                        <span key={tech} className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-100 text-xs font-bold rounded-xl">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {project.hardware_requirements && (
                    <p className="text-xs text-slate-600 pt-1">
                      Hardware Specs: <strong className="text-slate-800">{project.hardware_requirements}</strong>
                    </p>
                  )}
                </div>

              </div>

              {/* Preferred Faculty Expertise */}
              {Array.isArray(project.preferred_mentor_expertise) && project.preferred_mentor_expertise.length > 0 && (
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span>Preferred Faculty Specialization</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {project.preferred_mentor_expertise.map((exp: string) => (
                      <span key={exp} className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl">
                        {exp}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Faculty Dashboard</span>
          </button>

          {/* Context Action Buttons */}
          {requestContext === 'RECOMMENDED' && onAcceptDirect && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onRejectDirect && (
                <button
                  onClick={() => { onRejectDirect(projectId); onClose(); }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline</span>
                </button>
              )}
              <button
                onClick={() => { onAcceptDirect(projectId); onClose(); }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Accept Project Mentorship</span>
              </button>
            </div>
          )}

          {requestContext === 'PENDING_REQUEST' && requestId && onAcceptRequest && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {onRejectRequest && (
                <button
                  onClick={() => { onRejectRequest(requestId); onClose(); }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Decline Request</span>
                </button>
              )}
              <button
                onClick={() => { onAcceptRequest(requestId); onClose(); }}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Accept Direct Request</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
