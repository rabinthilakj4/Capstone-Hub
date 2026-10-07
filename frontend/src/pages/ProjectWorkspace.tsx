import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { StatusPill } from '../components/ui/StatusPill';
import {
  CheckSquare, FileText, MessageSquare, Calendar, Award, Users, Activity,
  Upload, Send, Plus, Star, Shield, AlertCircle, ArrowRight, Download,
  FolderPlus, Compass, Layers, ChevronDown, Phone, UserX, Trash2, RefreshCw, X,
  CheckCircle, XCircle, Clock, UserPlus, Video, ExternalLink, ShieldAlert, History
} from 'lucide-react';

export const ProjectWorkspace: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { socket, joinProjectRoom } = useSocket();

  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [currentPid, setCurrentPid] = useState<string>(projectId || '');
  const [workspace, setWorkspace] = useState<any>(null);
  const [skillGapData, setSkillGapData] = useState<any>(null);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MILESTONES' | 'DOCS' | 'CHAT' | 'MEETINGS'>('OVERVIEW');
  const [loading, setLoading] = useState(true);

  // Task creation state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Milestone submit state
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Document upload state
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [docVersion, setDocVersion] = useState('v1.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Meeting schedule state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingScheduling, setMeetingScheduling] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPid) return;

    try {
      setMeetingScheduling(true);
      const res = await api.post(`/workspace/${currentPid}/meetings`, {
        title: meetingTitle || 'Team Review Meeting',
        meeting_date: meetingDate,
        meeting_time: meetingTime,
        meet_link: meetLink,
        description: meetingDescription
      });

      if (res.data.success) {
        alert(res.data.message || 'Team Meeting scheduled successfully!');
        setShowMeetingModal(false);
        setMeetingTitle('');
        setMeetingDate('');
        setMeetingTime('');
        setMeetLink('');
        setMeetingDescription('');
        await fetchWorkspaceData(currentPid, myProjects);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule meeting. Only Project Leaders can create meetings.');
    } finally {
      setMeetingScheduling(false);
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('Are you sure you want to cancel and delete this scheduled meeting?')) return;
    try {
      const res = await api.delete(`/workspace/${currentPid}/meetings/${meetingId}`);
      if (res.data.success) {
        alert('Meeting cancelled.');
        await fetchWorkspaceData(currentPid, myProjects);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel meeting.');
    }
  };



  useEffect(() => {
    initWorkspace();
  }, [projectId]);

  const initWorkspace = async () => {
    try {
      setLoading(true);
      const myRes = await api.get('/users/my-projects');
      const userProjs = myRes.data.projects || [];
      setMyProjects(userProjs);

      let targetId = projectId;
      if (!targetId && userProjs.length > 0) {
        targetId = userProjs[0].project_id;
      }

      if (targetId) {
        setCurrentPid(targetId);
        await fetchWorkspaceData(targetId, userProjs);
      } else {
        setWorkspace(null);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setWorkspace(null);
      setLoading(false);
    }
  };

  const fetchJoinRequests = async (pid: string) => {
    try {
      const res = await api.get(`/projects/${pid}/join-requests`);
      if (res.data.success) {
        setJoinRequests(res.data.requests || []);
      }
    } catch (err) {
      console.error('Failed to fetch join requests', err);
    }
  };

  const handleRespondJoinRequest = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      setProcessingRequestId(requestId);
      const res = await api.post('/projects/join-request/respond', {
        request_id: requestId,
        action
      });
      alert(res.data.message || `Request ${action.toLowerCase()}ed successfully.`);
      fetchJoinRequests(currentPid);
      fetchWorkspaceData(currentPid);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process join request.');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const fetchWorkspaceData = async (targetId: string, userProjs: any[] = myProjects) => {
    try {
      setLoading(true);
      const res = await api.get(`/workspace/${targetId}`);
      const wsData = res.data.workspace;
      setWorkspace(wsData);
      setChatMessages(wsData?.messages || []);

      if (wsData?.project?.created_by === user?.user_id) {
        fetchJoinRequests(targetId);
      }

      try {
        const gapRes = await api.get(`/teams/${targetId}/skill-gaps`);
        setSkillGapData(gapRes.data);
      } catch (err) {
        // optional gap data
      }
    } catch (e) {
      console.error(e);
      // If specified targetId fails, try fallback to first user project
      if (userProjs.length > 0 && userProjs[0].project_id !== targetId) {
        try {
          const fallbackId = userProjs[0].project_id;
          setCurrentPid(fallbackId);
          const fallbackRes = await api.get(`/workspace/${fallbackId}`);
          setWorkspace(fallbackRes.data.workspace);
          setChatMessages(fallbackRes.data.workspace.messages || []);
          if (fallbackRes.data.workspace?.project?.created_by === user?.user_id) {
            fetchJoinRequests(fallbackId);
          }
        } catch (err) {
          setWorkspace(null);
        }
      } else {
        setWorkspace(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (socket && currentPid) {
      joinProjectRoom(currentPid);

      socket.on('receive_message', (msg: any) => {
        setChatMessages(prev => [...prev, msg]);
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });

      return () => {
        socket.off('receive_message');
      };
    }
  }, [socket, currentPid]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPid) return;
    try {
      await api.post(`/workspace/${currentPid}/tasks`, {
        title: newTaskTitle,
        assigned_to: newTaskAssignee || user?.user_id,
        due_date: newTaskDueDate || '2026-10-15',
        priority: 'HIGH'
      });
      alert('Task created successfully!');
      setShowTaskModal(false);
      setNewTaskTitle('');
      fetchWorkspaceData(currentPid);
    } catch (e) {
      alert('Failed to create task.');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    if (!currentPid) return;
    try {
      await api.patch(`/workspace/${currentPid}/tasks/${taskId}/status`, { status });
      fetchWorkspaceData(currentPid);
    } catch (e) {
      alert('Failed to update task status.');
    }
  };

  const handleUnassignMentor = async () => {
    if (!currentPid) return;
    if (window.confirm('Are you sure you want to remove the assigned faculty mentor from this project?')) {
      try {
        await api.post(`/mentors/project/${currentPid}/unassign`);
        fetchWorkspaceData(currentPid);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to remove faculty mentor.');
      }
    }
  };

  const handleSubmitMilestone = async () => {
    if (!selectedMilestone || !currentPid) return;
    try {
      await api.post(`/workspace/${currentPid}/milestones/${selectedMilestone.milestone_id}/submit`, {
        submission_url: submissionUrl,
        submission_notes: submissionNotes
      });
      alert('Milestone submitted for mentor review!');
      setSelectedMilestone(null);
      fetchWorkspaceData(currentPid);
    } catch (e) {
      alert('Failed to submit milestone.');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocUploadError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setDocUploadError('File size exceeds the allowed limit of 50 MB.');
        return;
      }
      setSelectedFile(file);
      if (!docTitle.trim()) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setDocTitle(nameWithoutExt);
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setDocUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPid) return;

    if (!selectedFile && !docUrl.trim()) {
      setDocUploadError('Please select a file from your device before uploading.');
      return;
    }

    try {
      setDocUploading(true);
      setDocUploadError(null);

      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      formData.append('title', docTitle || (selectedFile ? selectedFile.name : 'Untitled Document'));
      formData.append('version', docVersion || 'v1.0');
      if (docUrl) {
        formData.append('file_location', docUrl);
      }

      const res = await api.post(`/workspace/${currentPid}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert(res.data.message || 'Document uploaded successfully!');
      setShowDocModal(false);
      setDocTitle('');
      setDocUrl('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchWorkspaceData(currentPid);
    } catch (err: any) {
      setDocUploadError(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setDocUploading(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user || !currentPid) return;

    socket.emit('send_message', {
      projectId: currentPid,
      senderId: user.user_id,
      content: newMessage
    });

    setNewMessage('');
  };

  if (loading) {
    return (
      <AppShell>
        <div className="py-24 text-center space-y-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-sm font-bold text-slate-600">Loading Capstone Workspace...</p>
        </div>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell>
        <div className="space-y-8">
          {/* Header Banner */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Capstone Workspace Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Project Collaboration Workspace</h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Manage tasks, milestones, team chat, versioned documents, and mentor reviews in one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/projects/create"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </Link>
              <Link
                to="/projects/browse"
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Browse & Join Teams</span>
              </Link>
            </div>
          </div>

          {/* Status Message Card */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center max-w-3xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <FolderPlus className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">No Active Project Workspace Found</h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-2 max-w-md mx-auto">
                You are not currently enrolled in or assigned to an active capstone project. Create a project proposal or submit a request to join an existing project team.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-2">
              <Link
                to="/projects/create"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
              >
                Propose Project Idea
              </Link>
              <Link
                to="/projects/browse"
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                Find & Join Teams
              </Link>
            </div>
          </div>

          {/* Workspace Feature Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit"><CheckSquare className="w-5 h-5" /></div>
              <h3 className="font-extrabold text-slate-900 text-sm">Task Management & Kanban</h3>
              <p className="text-xs text-slate-500">Assign task deliverables, track progress status, and filter by team member.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit"><Calendar className="w-5 h-5" /></div>
              <h3 className="font-extrabold text-slate-900 text-sm">Milestones & Submissions</h3>
              <p className="text-xs text-slate-500">Submit milestone deliverables directly to faculty mentors for evaluation.</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit"><MessageSquare className="w-5 h-5" /></div>
              <h3 className="font-extrabold text-slate-900 text-sm">Real-time Team Chat</h3>
              <p className="text-xs text-slate-500">Communicate instantly with multidisciplinary team members and mentors.</p>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const proj = workspace.project;
  const health = workspace.health;

  return (
    <AppShell>
      <div className="space-y-6 sm:space-y-8">
        {/* Workspace Header */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusPill status={proj.status} />
                <span className="text-xs font-bold text-indigo-400 bg-indigo-950 border border-indigo-800 px-2.5 py-0.5 rounded-md">
                  {proj.domain}
                </span>
                {proj.project_code && (
                  <span className="text-xs font-extrabold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2.5 py-0.5 rounded-md">
                    Project ID: {proj.project_code}
                  </span>
                )}
                {proj.team?.team_code && (
                  <span className="text-xs font-extrabold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-0.5 rounded-md">
                    Team ID: {proj.team.team_code}
                  </span>
                )}
                {myProjects.length > 1 && (
                  <div className="inline-flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700 text-xs">
                    <span className="text-slate-400 font-semibold">Switch:</span>
                    <select
                      value={currentPid}
                      onChange={(e) => {
                        setCurrentPid(e.target.value);
                        fetchWorkspaceData(e.target.value);
                      }}
                      className="bg-slate-900 text-indigo-300 font-bold rounded px-2 py-0.5 text-xs focus:outline-none cursor-pointer"
                    >
                      {myProjects.map(p => (
                        <option key={p.project_id} value={p.project_id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{proj.title}</h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1">
                Mentor: {proj.mentor?.name ? proj.mentor.name : 'No Faculty Assigned'} • Duration: {proj.duration}
              </p>
            </div>

            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-center sm:text-right w-full sm:w-auto min-w-[160px]">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Health Indicator</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-0.5">{health?.healthScore || 92}%</div>
              <span className="text-[10px] text-emerald-400 font-bold">Optimal Velocity</span>
            </div>
          </div>

          {/* Workspace Tabs */}
          <div className="w-full overflow-x-auto pb-2 border-t border-slate-800 pt-4 scrollbar-none">
            <div className="flex gap-2 min-w-max">
              {[
                { id: 'OVERVIEW', label: 'Overview & Team', icon: Users },
                { id: 'MILESTONES', label: 'Milestones', icon: Calendar },
                { id: 'DOCS', label: 'Document Vault', icon: FileText },
                { id: 'CHAT', label: 'Team Chat', icon: MessageSquare },
                { id: 'MEETINGS', label: 'Meetings', icon: Activity }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">

              {/* Leader Join Requests Approval Panel */}
              {proj.created_by === user?.user_id && (
                <div className="bg-indigo-50/60 p-6 sm:p-8 rounded-3xl border border-indigo-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-indigo-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <h3 className="font-extrabold text-slate-900 text-base">Pending Student Join Requests</h3>
                    </div>
                    <span className="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-extrabold">
                      {joinRequests.filter(r => r.status === 'PENDING').length} Pending
                    </span>
                  </div>

                  {joinRequests.filter(r => r.status === 'PENDING').length === 0 ? (
                    <div className="p-4 bg-white rounded-2xl border border-indigo-100 text-center text-xs text-slate-500 font-medium">
                      No pending join requests for this project.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {joinRequests.filter(r => r.status === 'PENDING').map(req => (
                        <div key={req.request_id} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs space-y-3">
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
                                disabled={processingRequestId === req.request_id}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 transition disabled:opacity-50"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Accept</span>
                              </button>
                              <button
                                onClick={() => handleRespondJoinRequest(req.request_id, 'REJECT')}
                                disabled={processingRequestId === req.request_id}
                                className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-1 transition disabled:opacity-50"
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

              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-base border-b pb-3">Project Abstract & Scope</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{proj.abstract}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Statement</span>
                    <p className="text-xs font-medium text-slate-700">{proj.problem_statement}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposed Solution</span>
                    <p className="text-xs font-medium text-slate-700">{proj.proposed_solution}</p>
                  </div>
                </div>
              </div>

              {skillGapData && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-extrabold text-slate-900 text-base">Multidisciplinary Skill Coverage</h3>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      {skillGapData.skillCoveragePercentage || 85}% Covered
                    </span>
                  </div>
                  <div className="space-y-3">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Met Skills:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(skillGapData.coveredSkills || proj.required_skills).map((s: string) => (
                        <span key={s} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200/60">
                          ✓ {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Team Roster Sidebar */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 text-base border-b pb-3 flex items-center justify-between">
                  <span>Team Members</span>
                  <span className="text-xs font-semibold text-slate-400">{proj.team?.members?.length || 1} / {proj.team_size}</span>
                </h3>

                <div className="space-y-3 divide-y divide-slate-100">
                  {proj.team?.members?.map((m: any) => {
                    const studentName = m.student?.name || m.name || 'Student';
                    const regNo = m.student?.student_id || m.register_number || 'N/A';
                    const studentEmail = m.student?.email || m.email || '';
                    const studentPhone = m.student?.student_profile?.phone || m.phone || '';
                    const yearStr = m.student?.student_profile?.year || m.year || '1st Year';
                    const deptName = m.student?.department?.department_name || m.department_name || 'Engineering';

                    return (
                      <div key={m.student_id || regNo} className="pt-3 first:pt-0 flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 bg-indigo-600 text-white font-extrabold rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5">
                            {studentName?.charAt(0) || 'S'}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-xs font-bold text-slate-900">{studentName}</p>
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[9px]">
                                {yearStr}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono font-bold text-indigo-600">Reg: {regNo}</p>
                            {studentEmail && (
                              <p className="text-[10px] text-slate-500">{studentEmail}</p>
                            )}
                            {studentPhone && (
                              <p className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                                <Phone className="w-2.5 h-2.5 text-indigo-500" />
                                {studentPhone}
                              </p>
                            )}
                            <p className="text-[9px] text-slate-400">{deptName}</p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md shrink-0">
                          {m.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider text-slate-400">Assigned Faculty Mentor</h3>
                  {proj.mentor && (
                    <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span>Status: ACTIVE</span>
                    </span>
                  )}
                </div>
                {proj.mentor && proj.mentor.name ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-10 h-10 bg-indigo-600 text-white font-bold rounded-2xl flex items-center justify-center text-sm shadow-md shadow-indigo-600/20">
                      {proj.mentor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">{proj.mentor.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{proj.mentor.email || ''}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <p className="text-xs font-bold text-slate-500">No Faculty Assigned</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Faculty mentor request pending / unassigned</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}



        {/* TAB CONTENT: MILESTONES */}
        {activeTab === 'MILESTONES' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-extrabold text-slate-900 text-base border-b pb-3">Project Milestone Deliverables</h3>

            <div className="space-y-4">
              {workspace.milestones.map((ms: any) => (
                <div key={ms.milestone_id} className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">{ms.title}</span>
                      <StatusPill status={ms.status} />
                    </div>
                    <p className="text-xs text-slate-500">Deadline: {ms.deadline}</p>
                    {ms.submission_notes && (
                      <p className="text-xs text-indigo-700 bg-indigo-50 p-2 rounded-lg mt-2 border border-indigo-100">
                        Notes: {ms.submission_notes}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedMilestone(ms)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Submit Deliverables
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: DOCS */}
        {activeTab === 'DOCS' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Document Vault</h3>
              <button
                onClick={() => setShowDocModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {workspace.documents.map((doc: any) => (
                <div key={doc.document_id} className="p-4 rounded-2xl border border-slate-200 space-y-2 bg-slate-50">
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-bold text-slate-900">{doc.title}</p>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                      {doc.version}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Uploaded by {doc.uploader?.name || 'Team member'}</p>
                  <a
                    href={doc.file_location}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline pt-2"
                  >
                    <Download className="w-3.5 h-3.5" /> View / Download File
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT: CHAT */}
        {activeTab === 'CHAT' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[500px] overflow-hidden">
            <div className="p-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-400" />
              <span>Real-Time Capstone Team Workspace Chat</span>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50">
              {chatMessages.map((msg: any, i: number) => {
                const isMe = msg.sender_id === user?.user_id || msg.sender?.name === user?.name;
                return (
                  <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-xs p-3 rounded-2xl text-xs space-y-1 ${
                      isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border text-slate-900 rounded-bl-none shadow-sm'
                    }`}>
                      <p className="text-[10px] font-bold opacity-80">{msg.sender?.name || 'Member'}</p>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-3 border-t bg-white flex gap-2">
              <input
                type="text"
                placeholder="Type your message to the team..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB CONTENT: MEETINGS */}
        {activeTab === 'MEETINGS' && (() => {
          const isLeader = proj.created_by === user?.user_id;
          const isMentor = user?.role === 'MENTOR';
          const meetings: any[] = workspace.meetings || [];
          const now = new Date();

          // Sort meetings: newest meeting_number or created_at first
          const sortedMeetings = [...meetings].sort((a: any, b: any) => {
            const numA = a.meeting_number || 0;
            const numB = b.meeting_number || 0;
            if (numA !== numB) return numB - numA;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          const upcomingMeetings = sortedMeetings.filter((m: any) => new Date(m.scheduled_at).getTime() >= now.getTime() - 60 * 60 * 1000);

          return (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-2">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Official Team Meetings Portal</span>
                  </div>
                  <h2 className="text-2xl font-extrabold tracking-tight">Team Meetings & Video Reviews</h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Total Meetings Scheduled: <strong className="text-white font-bold">{meetings.length}</strong>
                  </p>
                </div>

                {isLeader ? (
                  <button
                    onClick={() => setShowMeetingModal(true)}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg text-xs flex items-center gap-2 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Schedule Team Meeting</span>
                  </button>
                ) : (
                  <div className="px-4 py-2 bg-slate-800/80 border border-slate-700/80 rounded-2xl text-xs text-slate-300 font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>{isMentor ? 'Faculty Mentor Access (View-Only)' : 'Team Member Access (View-Only)'}</span>
                  </div>
                )}
              </div>

              {/* View-Only Access Notice for Team Members & Mentor */}
              {!isLeader && (
                <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs text-indigo-900 font-medium flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>
                    {isMentor
                      ? 'You have view-only access to team meeting schedules and history. Click "Join Google Meet" to participate in scheduled faculty review sessions.'
                      : 'You have view-only access to team meetings. Meeting schedules are created and managed exclusively by your Project Leader.'}
                  </span>
                </div>
              )}

              {/* UPCOMING MEETINGS SECTION */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Upcoming Team Meetings ({upcomingMeetings.length})</span>
                  </h3>
                </div>

                {upcomingMeetings.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed">
                    No upcoming team meetings scheduled. {isLeader && 'Click "+ Schedule Team Meeting" to create one.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingMeetings.map((m: any) => {
                      const meetingDateObj = new Date(m.scheduled_at);
                      const formattedDate = meetingDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                      const formattedTime = meetingDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div key={m.meeting_id} className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-3 shadow-sm hover:shadow transition flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-full">
                                Meeting {m.meeting_number || 1}
                              </span>
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold rounded-full">
                                UPCOMING
                              </span>
                            </div>

                            <h4 className="text-base font-extrabold text-slate-900">{m.title}</h4>
                            {m.description && <p className="text-xs text-slate-600 line-clamp-2">{m.description}</p>}

                            <div className="text-xs text-slate-500 font-medium space-y-1 pt-1">
                              <p className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Date: <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong></span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>Host: <strong>{m.host?.name || 'Project Leader'}</strong></span>
                              </p>
                            </div>
                          </div>

                          <div className="pt-3 border-t border-indigo-100 flex items-center justify-between gap-2">
                            {m.meet_link ? (
                              <a
                                href={m.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full text-center py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5"
                              >
                                <Video className="w-4 h-4" />
                                <span>Join Google Meet</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 italic font-medium">No Google Meet link provided</span>
                            )}

                            {isLeader && (
                              <button
                                onClick={() => handleDeleteMeeting(m.meeting_id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition shrink-0"
                                title="Cancel Meeting"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MEETING HISTORY SECTION */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-600" />
                    <span>Meeting History ({sortedMeetings.length})</span>
                  </h3>
                </div>

                {sortedMeetings.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl border border-dashed">
                    No meeting history recorded yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sortedMeetings.map((m: any) => {
                      const meetingDateObj = new Date(m.scheduled_at);
                      const formattedDate = meetingDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                      const formattedTime = meetingDateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      const isPast = meetingDateObj.getTime() < now.getTime() - 60 * 60 * 1000;

                      return (
                        <div key={m.meeting_id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 bg-slate-900 text-white text-[10px] font-black rounded-md">
                                Meeting {m.meeting_number || 1}
                              </span>
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                                isPast ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isPast ? 'COMPLETED' : 'UPCOMING'}
                              </span>
                              <h4 className="text-xs font-bold text-slate-900">{m.title}</h4>
                            </div>

                            <p className="text-[11px] text-slate-500">
                              Scheduled for <strong>{formattedDate}</strong> at <strong>{formattedTime}</strong> • Host: {m.host?.name || 'Project Leader'}
                            </p>

                            {m.description && <p className="text-xs text-slate-600 line-clamp-1 mt-1">{m.description}</p>}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                            {m.meet_link ? (
                              <a
                                href={m.meet_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition"
                              >
                                <Video className="w-3.5 h-3.5" />
                                <span>Join Google Meet</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No link</span>
                            )}

                            {isLeader && (
                              <button
                                onClick={() => handleDeleteMeeting(m.meeting_id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                title="Delete Meeting"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* MODAL: CREATE TASK */}
        {showTaskModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleCreateTask} className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="font-extrabold text-slate-900 text-base">Create New Task</h3>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold"
                  placeholder="e.g. Design Circuit Schematic"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: SUBMIT MILESTONE */}
        {selectedMilestone && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
              <h3 className="font-extrabold text-slate-900 text-base">Submit Milestone: {selectedMilestone.title}</h3>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Deliverable URL / Repo Link</label>
                <input
                  type="text"
                  value={submissionUrl}
                  onChange={e => setSubmissionUrl(e.target.value)}
                  placeholder="https://github.com/..."
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Submission Notes</label>
                <textarea
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  placeholder="Notes for faculty mentor..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMilestone(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMilestone}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow"
                >
                  Submit Milestone
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: UPLOAD DOC */}
        {showDocModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleUploadDocument} className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600" />
                  <span>Upload Document</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Native System File Input (Hidden) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.7z,.png,.jpg,.jpeg,.gif,.svg,.webp,.txt,.csv,.json,.md,image/*,application/*"
              />

              {/* Error Alert Banner */}
              {docUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{docUploadError}</span>
                </div>
              )}

              {/* Native File Selector Zone */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Select File from Device
                </label>
                
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl bg-indigo-50/40 hover:bg-indigo-50 text-center cursor-pointer transition group flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Tap or click to select file from device
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Opens your system's native File Manager (PDF, Word, PPT, Excel, ZIP, Images, Text) up to 50MB
                    </p>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                      className="mt-3 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md hover:bg-indigo-700 transition"
                    >
                      Browse Device Storage
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden w-full">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Size: {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Document'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                        title="Choose another file"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs rounded-lg transition flex items-center gap-1"
                        title="Remove selected file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Document Title Field */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={e => setDocTitle(e.target.value)}
                  placeholder="e.g. System Architecture Diagram"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:bg-white transition"
                />
              </div>

              {/* Document Version Field */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Document Version
                </label>
                <input
                  type="text"
                  value={docVersion}
                  onChange={e => setDocVersion(e.target.value)}
                  placeholder="v1.0"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold focus:bg-white transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  disabled={docUploading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={docUploading || (!selectedFile && !docUrl)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
                >
                  {docUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Uploading File...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: SCHEDULE TEAM MEETING (LEADER ONLY) */}
        {showMeetingModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={handleScheduleMeeting} className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full space-y-4 shadow-2xl animate-fadeIn">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <span>Schedule Team Meeting</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Meeting Title <span className="text-indigo-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  placeholder="e.g. Weekly Project Review & Task Sync"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Meeting Date <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Meeting Time <span className="text-indigo-600">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={meetingTime}
                    onChange={e => setMeetingTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Google Meet Link <span className="text-indigo-600">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={meetLink}
                  onChange={e => setMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Agenda / Description
                </label>
                <textarea
                  value={meetingDescription}
                  onChange={e => setMeetingDescription(e.target.value)}
                  placeholder="Discuss project milestones, task progress, and upcoming deliverables..."
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowMeetingModal(false)}
                  disabled={meetingScheduling}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={meetingScheduling}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition disabled:opacity-50"
                >
                  {meetingScheduling ? 'Scheduling...' : 'Schedule Meeting'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
};
