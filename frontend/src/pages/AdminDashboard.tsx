import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AdminLayout } from '../components/layout/AdminLayout';
import { StatusPill } from '../components/ui/StatusPill';
import {
  Shield, Users, FolderCheck, Building, Sliders, FileText,
  CheckCircle, XCircle, Search, LogOut, UserCheck, UserPlus, UserX, GraduationCap,
  Layers, ArrowRightLeft, Clock, PlusCircle, Trash2, MessageSquare, AlertTriangle,
  Code2, Eye, X
} from 'lucide-react';

interface DeleteConfirmationState {
  type: 'USER' | 'MESSAGE' | 'PROJECT';
  id: string;
  name: string;
  subtext?: string;
}

export const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'STUDENTS' | 'FACULTY' | 'DEPARTMENTS' | 'PROJECTS' | 'REQUESTS' | 'MESSAGES' | 'USERS' | 'SETTINGS'
  >('DASHBOARD');

  // Real Database State
  const [stats, setStats] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectRequests, setProjectRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [matchingWeights, setMatchingWeights] = useState<any>(null);

  // Filters & Modal State
  const [studentSearch, setStudentSearch] = useState('');
  const [studentYearFilter, setStudentYearFilter] = useState('All');
  const [studentDeptFilter, setStudentDeptFilter] = useState('All');
  const [selectedStudentModal, setSelectedStudentModal] = useState<any | null>(null);
  const [facultySearch, setFacultySearch] = useState('');
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDeptFilter, setProjectDeptFilter] = useState('All');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Deletion Modal
  const [deleteModal, setDeleteModal] = useState<DeleteConfirmationState | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Manage Mentor Modal State
  const [manageMentorProject, setManageMentorProject] = useState<any | null>(null);
  const [selectedMentorId, setSelectedMentorId] = useState<string>('');
  const [mentorActionLoading, setMentorActionLoading] = useState<boolean>(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState<boolean>(false);
  const [mentorActionError, setMentorActionError] = useState<string>('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [
        statsRes,
        studentsRes,
        facultyRes,
        deptsRes,
        projectsRes,
        requestsRes,
        usersRes,
        messagesRes,
        weightsRes,
        logsRes
      ] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/students'),
        api.get('/admin/faculty'),
        api.get('/admin/departments'),
        api.get('/admin/projects'),
        api.get('/admin/project-requests'),
        api.get('/admin/users'),
        api.get('/admin/messages'),
        api.get('/admin/matching-weights'),
        api.get('/admin/audit-logs')
      ]);

      setStats(statsRes.data.stats);
      setStudents(studentsRes.data.students || []);
      setFaculty(facultyRes.data.faculty || []);
      setDepartments(deptsRes.data.departments || []);
      setProjects(projectsRes.data.projects || []);
      setProjectRequests(requestsRes.data.requests || []);
      setUsers(usersRes.data.users || []);
      setMessages(messagesRes.data.messages || []);
      setMatchingWeights(weightsRes.data.weights);
      setAuditLogs(logsRes.data.logs || []);
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    try {
      setDeleting(true);
      if (deleteModal.type === 'USER') {
        await api.delete(`/admin/users/${deleteModal.id}`);
        alert(`User "${deleteModal.name}" deleted successfully.`);
      } else if (deleteModal.type === 'MESSAGE') {
        await api.delete(`/admin/messages/${deleteModal.id}`);
        alert(`Message deleted successfully.`);
      } else if (deleteModal.type === 'PROJECT') {
        await api.delete(`/admin/projects/${deleteModal.id}`);
        alert(`Project "${deleteModal.name}" deleted successfully.`);
      }
      setDeleteModal(null);
      loadAdminData();
    } catch (e: any) {
      console.error('Delete operation failed:', e);
      alert(e.response?.data?.message || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const handleReviewProject = async (projectId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.post(`/admin/projects/${projectId}/review`, { action });
      alert(`Project ${action === 'APPROVE' ? 'Approved & Published' : 'Rejected'}.`);
      loadAdminData();
    } catch (e) {
      alert('Failed to process project review.');
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      loadAdminData();
    } catch (e) {
      alert('Failed to update user status.');
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      await api.post('/admin/departments', {
        department_name: newDeptName.trim(),
        department_code: newDeptCode.trim()
      });
      alert('Department created successfully!');
      setNewDeptName('');
      setNewDeptCode('');
      loadAdminData();
    } catch (e) {
      alert('Failed to create department.');
    }
  };

  const handleSaveMatchingWeights = async () => {
    try {
      await api.put('/admin/matching-weights', matchingWeights);
      alert('Matching Engine Weights updated successfully!');
      loadAdminData();
    } catch (e) {
      alert('Failed to update weights.');
    }
  };

  const handleAdminUnassignMentor = async () => {
    if (!manageMentorProject) return;
    try {
      setMentorActionLoading(true);
      setMentorActionError('');
      const res = await api.post(`/admin/projects/${manageMentorProject.project_id}/unassign-mentor`);
      if (res.data.success) {
        alert(res.data.message || 'Faculty mentor removed successfully.');
        setShowUnassignConfirm(false);
        setManageMentorProject((prev: any) => (prev ? { ...prev, mentor_name: 'No Faculty Assigned', mentor_id: null } : null));
        loadAdminData();
      }
    } catch (err: any) {
      setMentorActionError(err.response?.data?.message || 'Failed to remove faculty mentor.');
    } finally {
      setMentorActionLoading(false);
    }
  };

  const handleAdminAssignMentor = async () => {
    if (!manageMentorProject || !selectedMentorId) {
      setMentorActionError('Please select a faculty mentor to assign.');
      return;
    }
    try {
      setMentorActionLoading(true);
      setMentorActionError('');
      const res = await api.post(`/admin/projects/${manageMentorProject.project_id}/assign-mentor`, {
        mentorId: selectedMentorId
      });
      if (res.data.success) {
        alert(res.data.message || 'Faculty mentor assigned successfully.');
        setManageMentorProject(null);
        setSelectedMentorId('');
        loadAdminData();
      }
    } catch (err: any) {
      setMentorActionError(err.response?.data?.message || 'Failed to assign faculty mentor.');
    } finally {
      setMentorActionLoading(false);
    }
  };

  // Filtered lists
  const filteredStudents = students.filter(s => {
    const matchesSearch =
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.register_number.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.department_name.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesYear = studentYearFilter === 'All' || (s.year || '1st Year') === studentYearFilter;
    const matchesDept = studentDeptFilter === 'All' || String(s.department_id) === String(studentDeptFilter) || s.department_name === studentDeptFilter;
    return matchesSearch && matchesYear && matchesDept;
  });

  const filteredFaculty = faculty.filter(
    f =>
      f.name.toLowerCase().includes(facultySearch.toLowerCase()) ||
      f.email.toLowerCase().includes(facultySearch.toLowerCase()) ||
      f.department_name.toLowerCase().includes(facultySearch.toLowerCase())
  );

  const filteredProjects = projects.filter(p => {
    const q = projectSearch.toLowerCase();
    const matchesSearch =
      p.title.toLowerCase().includes(q) ||
      (p.project_code && p.project_code.toLowerCase().includes(q)) ||
      (p.team_code && p.team_code.toLowerCase().includes(q)) ||
      p.owner_name.toLowerCase().includes(q) ||
      p.owner_department.toLowerCase().includes(q);
    const matchesDept = projectDeptFilter === 'All' ||
      String(p.target_department_id) === String(projectDeptFilter) ||
      (p.target_departments && p.target_departments.toLowerCase().includes(projectDeptFilter.toLowerCase()));
    return matchesSearch && matchesDept;
  });

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredMessages = messages.filter(m =>
    m.content.toLowerCase().includes(messageSearch.toLowerCase()) ||
    m.sender_name.toLowerCase().includes(messageSearch.toLowerCase()) ||
    m.project_title.toLowerCase().includes(messageSearch.toLowerCase())
  );

  return (
    <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="space-y-6 sm:space-y-8">
        {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeTab === 'DASHBOARD' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Real Statistics Grid - Light Theme Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Students</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{stats?.totalStudents || 0}</div>
                  <span className="text-[11px] text-indigo-600 font-semibold">Real Database Records</span>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                  <GraduationCap className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Faculty</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{stats?.totalFaculty || 0}</div>
                  <span className="text-[11px] text-amber-600 font-semibold">{stats?.mentorUtilization || 0}% Mentorship Capacity</span>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <UserCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Departments</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{stats?.totalDepartments || 0}</div>
                  <span className="text-[11px] text-teal-600 font-semibold">Active Academic Units</span>
                </div>
                <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl border border-teal-100">
                  <Building className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Projects</span>
                  <div className="text-3xl font-black text-slate-900 mt-1">{stats?.totalProjects || 0}</div>
                  <span className="text-[11px] text-emerald-600 font-semibold">{stats?.acceptedProjects || 0} Published / Accepted</span>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                  <Layers className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Secondary Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Pending Requests & Approvals</span>
                <div className="text-2xl font-black text-amber-600 mt-1">{stats?.pendingProjectRequests || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Proposals & Cross-Dept Invites Awaiting Action</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Accepted Projects</span>
                <div className="text-2xl font-black text-emerald-600 mt-1">{stats?.acceptedProjects || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Successfully Shared & Approved Projects</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-500 uppercase">Rejected Projects</span>
                <div className="text-2xl font-black text-rose-600 mt-1">{stats?.rejectedProjects || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Rejected Proposals or Sharing Requests</p>
              </div>
            </div>

            {/* Department Breakdown Section */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <Building className="w-5 h-5 text-indigo-600" />
                <span>Departmental Distribution Breakdown</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats?.departmentCounts?.map((d: any) => (
                  <div key={d.department_id || d.department_name} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">{d.department_code ? `[${d.department_code}]` : ''} {d.department_name}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{d.count} Users</p>
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg">
                      ID: {d.department_id}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. STUDENTS TAB */}
        {activeTab === 'STUDENTS' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Student Registry ({filteredStudents.length})</span>
              </h2>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <select
                  value={studentYearFilter}
                  onChange={e => setStudentYearFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                >
                  <option value="All">All Years</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by name, reg #, email..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="p-3">Register Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Academic Year</th>
                    <th className="p-3">Selected Skills</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">No student records found matching search or filters.</td>
                    </tr>
                  ) : (
                    filteredStudents.map(s => (
                      <tr key={s.user_id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-indigo-600">{s.register_number}</td>
                        <td className="p-3 font-bold text-slate-900">{s.name}</td>
                        <td className="p-3 text-slate-600">{s.email}</td>
                        <td className="p-3 font-medium text-slate-700">{s.department_name}</td>
                        <td className="p-3 font-bold text-indigo-600 bg-indigo-50/50 rounded">{s.year || s.student_profile?.year || '1st Year'}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setSelectedStudentModal(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 font-bold rounded-lg transition text-[11px]"
                          >
                            <Code2 className="w-3 h-3 text-indigo-600" />
                            <span>{s.skills && s.skills.length > 0 ? `${s.skills.length} Skills` : 'No skills selected'}</span>
                          </button>
                        </td>
                        <td className="p-3"><StatusPill status={s.status} /></td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedStudentModal(s)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition text-[11px] flex items-center gap-1 shadow-sm"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Skills</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleUserStatus(s.user_id, s.status)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-[11px]"
                            >
                              {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteModal({
                                type: 'USER',
                                id: s.user_id,
                                name: s.name,
                                subtext: `${s.email} (STUDENT)`
                              })}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-lg transition flex items-center gap-1 text-[11px]"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. FACULTY TAB */}
        {activeTab === 'FACULTY' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>Faculty Mentor Directory ({filteredFaculty.length})</span>
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search faculty..."
                  value={facultySearch}
                  onChange={e => setFacultySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="p-3">Faculty Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Designation / Expertise</th>
                    <th className="p-3">Mentorship Load</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFaculty.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">No faculty records found matching search.</td>
                    </tr>
                  ) : (
                    filteredFaculty.map(f => (
                      <tr key={f.user_id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{f.name}</td>
                        <td className="p-3 text-slate-600">{f.email}</td>
                        <td className="p-3 font-medium text-slate-700">{f.department_name}</td>
                        <td className="p-3 text-slate-600">{f.designation}</td>
                        <td className="p-3 font-bold text-indigo-600">{f.current_load} / {f.capacity} Teams</td>
                        <td className="p-3"><StatusPill status={f.status} /></td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleUserStatus(f.user_id, f.status)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition text-[11px]"
                            >
                              {f.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => setDeleteModal({
                                type: 'USER',
                                id: f.user_id,
                                name: f.name,
                                subtext: `${f.email} (FACULTY)`
                              })}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-lg transition flex items-center gap-1 text-[11px]"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. DEPARTMENTS TAB */}
        {activeTab === 'DEPARTMENTS' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  <span>Configured Academic Departments ({departments.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Existing database departmentId entries used across Students, Faculty, & Projects</p>
              </div>

              {/* Add New Department Form */}
              <form onSubmit={handleCreateDepartment} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Code (e.g. AIML)"
                  value={newDeptCode}
                  onChange={e => setNewDeptCode(e.target.value)}
                  className="w-24 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900"
                />
                <input
                  type="text"
                  placeholder="Department Name..."
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  required
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 flex-1 sm:w-48"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </form>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map(d => (
                <div key={d.department_id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                      ID: {d.department_id}
                    </span>
                    <StatusPill status={d.status} />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">{d.department_name}</h3>
                  <p className="text-xs text-slate-500">Code: <span className="font-mono font-bold text-slate-700">{d.department_code}</span></p>
                  <p className="text-xs font-bold text-slate-700 border-t border-slate-200 pt-2">{d.total_users} Registered Users</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. PROJECTS TAB */}
        {activeTab === 'PROJECTS' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span>All Database Projects ({filteredProjects.length})</span>
              </h2>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-medium">No projects found in database.</div>
              ) : (
                filteredProjects.map(p => (
                  <div key={p.project_id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          {p.project_code && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-mono font-bold rounded-md border border-indigo-200">
                              Project ID: {p.project_code}
                            </span>
                          )}
                          {p.team_code && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-mono font-bold rounded-md border border-emerald-200">
                              Team ID: {p.team_code}
                            </span>
                          )}
                          <h3 className="text-base font-bold text-slate-900">{p.title}</h3>
                          <StatusPill status={p.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Owner: <span className="font-bold text-slate-800">{p.owner_name}</span> ({p.owner_department}) | Mentor: <span className={p.mentor_name && p.mentor_name !== 'Unassigned' ? 'font-bold text-indigo-600' : 'font-bold text-amber-600'}>{p.mentor_name && p.mentor_name !== 'Unassigned' ? p.mentor_name : 'No Faculty Assigned'}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                        {p.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleReviewProject(p.project_id, 'APPROVE')}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReviewProject(p.project_id, 'REJECT')}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setManageMentorProject(p);
                            setShowUnassignConfirm(false);
                            setMentorActionError('');
                            setSelectedMentorId('');
                          }}
                          className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Manage Mentor</span>
                        </button>
                        <button
                          onClick={() => setDeleteModal({
                            type: 'PROJECT',
                            id: p.project_id,
                            name: p.title,
                            subtext: `Owner: ${p.owner_name} (${p.owner_department})`
                          })}
                          className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-xs rounded-xl shadow flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Project</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 line-clamp-2">{p.description}</p>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>Target Departments: <strong className="text-slate-800">{p.target_departments}</strong></span>
                      <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* 6. PROJECT REQUESTS TAB */}
        {activeTab === 'REQUESTS' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>Cross-Department Project Sharing Requests ({projectRequests.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real database records of projects shared across departments with Accept / Reject statuses</p>
            </div>

            <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="p-3">Project Title</th>
                    <th className="p-3">Sender Name</th>
                    <th className="p-3">Sender Department</th>
                    <th className="p-3">Target Department</th>
                    <th className="p-3">Request Status</th>
                    <th className="p-3">Request Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projectRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">No cross-department project requests found in database.</td>
                    </tr>
                  ) : (
                    projectRequests.map(r => (
                      <tr key={r.request_id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900">{r.project_title}</td>
                        <td className="p-3 text-slate-700">{r.sender_name}</td>
                        <td className="p-3 font-medium text-slate-700">{r.sender_department}</td>
                        <td className="p-3 font-bold text-indigo-600">{r.target_department}</td>
                        <td className="p-3"><StatusPill status={r.status} /></td>
                        <td className="p-3 text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. MESSAGES DIRECTORY TAB */}
        {activeTab === 'MESSAGES' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  <span>System Messages Directory ({filteredMessages.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage and delete workspace discussion messages across all projects</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search content, sender, project..."
                  value={messageSearch}
                  onChange={e => setMessageSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="p-3">Sender Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Project Title</th>
                    <th className="p-3">Message Content</th>
                    <th className="p-3">Sent At</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMessages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">No message records found in database.</td>
                    </tr>
                  ) : (
                    filteredMessages.map(m => (
                      <tr key={m.message_id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{m.sender_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.sender_email}</div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px] rounded">
                            {m.sender_role}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800 max-w-xs truncate">{m.project_title}</td>
                        <td className="p-3 font-medium text-slate-700 max-w-sm truncate">{m.content}</td>
                        <td className="p-3 text-slate-500">{new Date(m.created_at).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setDeleteModal({
                              type: 'MESSAGE',
                              id: m.message_id,
                              name: `Message from "${m.sender_name}"`,
                              subtext: `"${m.content.substring(0, 50)}..."`
                            })}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-lg transition flex items-center gap-1 text-[11px] ml-auto"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. USERS REGISTRY TAB */}
        {activeTab === 'USERS' && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>Full System User Directory ({filteredUsers.length})</span>
              </h2>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Search user..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900 w-full sm:w-48 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white"
                />
                <select
                  value={userRoleFilter}
                  onChange={e => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-900"
                >
                  <option value="">All Roles</option>
                  <option value="STUDENT">Students</option>
                  <option value="MENTOR">Faculty Mentors</option>
                  <option value="ADMIN">Admins</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto w-full border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="p-3">User Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <tr key={u.user_id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{u.name}</td>
                      <td className="p-3 text-slate-600">{u.email}</td>
                      <td className="p-3 font-semibold text-indigo-600">{u.role}</td>
                      <td className="p-3 text-slate-600">{u.department?.department_name || 'N/A'}</td>
                      <td className="p-3"><StatusPill status={u.status} /></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleUserStatus(u.user_id, u.status)}
                            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition text-[11px]"
                          >
                            {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteModal({
                              type: 'USER',
                              id: u.user_id,
                              name: u.name,
                              subtext: `${u.email} (${u.role})`
                            })}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold rounded-lg transition flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 9. SETTINGS TAB */}
        {activeTab === 'SETTINGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Matching Weights Config */}
            {matchingWeights && (
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-indigo-600" />
                  <span>Matching Engine Scoring Weights</span>
                </h2>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-bold text-slate-700">Skill Match Weight</label>
                      <input
                        type="number"
                        step="0.05"
                        value={matchingWeights.team?.skillMatch || 0.4}
                        onChange={e => setMatchingWeights({
                          ...matchingWeights,
                          team: { ...matchingWeights.team, skillMatch: Number(e.target.value) }
                        })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700">Interest Match Weight</label>
                      <input
                        type="number"
                        step="0.05"
                        value={matchingWeights.team?.interestMatch || 0.25}
                        onChange={e => setMatchingWeights({
                          ...matchingWeights,
                          team: { ...matchingWeights.team, interestMatch: Number(e.target.value) }
                        })}
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveMatchingWeights}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow mt-2"
                  >
                    Save Scoring Configurations
                  </button>
                </div>
              </div>
            )}

            {/* Audit Logs */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span>System Security Audit Logs</span>
              </h2>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {auditLogs.map(log => (
                  <div key={log.log_id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex flex-col justify-between gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-indigo-600">{log.action}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <span className="text-slate-600">{log.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION DELETE MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Confirm {deleteModal.type.charAt(0) + deleteModal.type.slice(1).toLowerCase()} Deletion</h3>
                <p className="text-xs text-rose-600 font-semibold">Administrative Action Required</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <p className="text-xs font-bold text-slate-500 uppercase">Target Item</p>
              <p className="text-sm font-extrabold text-slate-900">{deleteModal.name}</p>
              {deleteModal.subtext && (
                <p className="text-xs text-slate-600">{deleteModal.subtext}</p>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete this {deleteModal.type.toLowerCase()}? All associated records will be handled safely according to database integrity rules. This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-1.5"
              >
                {deleting ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete {deleteModal.type.charAt(0) + deleteModal.type.slice(1).toLowerCase()}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* STUDENT SKILLS & PROFILE MODAL */}
      {selectedStudentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{selectedStudentModal.name}</h3>
                  <p className="text-xs text-indigo-600 font-mono font-bold">Reg #: {selectedStudentModal.register_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Email Address</span>
                <p className="text-slate-900 font-medium truncate mt-0.5">{selectedStudentModal.email}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Department</span>
                <p className="text-slate-900 font-medium truncate mt-0.5">{selectedStudentModal.department_name}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Academic Year</span>
                <p className="text-slate-900 font-medium truncate mt-0.5">{selectedStudentModal.year || '1st Year'}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Mobile / Phone</span>
                <p className="text-slate-900 font-medium truncate mt-0.5">{selectedStudentModal.phone || 'N/A'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  Selected Skills ({selectedStudentModal.skills ? selectedStudentModal.skills.length : 0})
                </span>
              </div>
              {selectedStudentModal.skills && selectedStudentModal.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl">
                  {selectedStudentModal.skills.map((skill: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white border border-indigo-200 text-indigo-700 font-bold text-xs rounded-lg shadow-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 font-medium">
                  No skills selected by this student yet.
                </div>
              )}
            </div>

            {selectedStudentModal.interests && selectedStudentModal.interests.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Interests</span>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {selectedStudentModal.interests.map((interest: string, index: number) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 font-medium text-xs rounded-lg"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE FACULTY MENTOR (ADMIN 2-STEP PROCESS) */}
      {manageMentorProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-100 relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">Manage Faculty Mentor</h2>
                  <p className="text-xs text-slate-500 font-bold truncate max-w-xs">{manageMentorProject.title}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setManageMentorProject(null);
                  setShowUnassignConfirm(false);
                  setMentorActionError('');
                  setSelectedMentorId('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {mentorActionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{mentorActionError}</span>
              </div>
            )}

            {/* STEP 1: MENTOR ALREADY ASSIGNED */}
            {manageMentorProject.mentor_name && manageMentorProject.mentor_name !== 'No Faculty Assigned' && manageMentorProject.mentor_name !== 'Unassigned' ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Current Assigned Mentor</span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{manageMentorProject.mentor_name}</p>
                      <p className="text-xs text-slate-500">{manageMentorProject.mentor_email || 'Assigned Faculty Guide'}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full">
                      ACTIVE
                    </span>
                  </div>
                </div>

                {showUnassignConfirm ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-extrabold text-rose-900">Confirm Faculty Removal</h4>
                        <p className="text-xs text-rose-800 mt-1">
                          Are you sure you want to remove <strong>{manageMentorProject.mentor_name}</strong> from project <strong>"{manageMentorProject.title}"</strong>?
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowUnassignConfirm(false)}
                        disabled={mentorActionLoading}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleAdminUnassignMentor}
                        disabled={mentorActionLoading}
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1 disabled:opacity-50"
                      >
                        {mentorActionLoading ? 'Removing...' : 'Confirm Removal'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">To change mentor, remove current assignment first:</span>
                    <button
                      type="button"
                      onClick={() => setShowUnassignConfirm(true)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Remove Current Mentor</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* STEP 2: NO MENTOR ASSIGNED -> MANUAL ASSIGNMENT */
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Current Mentor Status</span>
                  <p className="text-sm font-bold text-slate-700">No Faculty Assigned (Unassigned)</p>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Select Faculty Mentor to Assign <span className="text-indigo-600">*</span>
                  </label>
                  <select
                    value={selectedMentorId}
                    onChange={e => setSelectedMentorId(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">-- Choose Faculty Member --</option>
                    {faculty.map((f: any) => (
                      <option key={f.user_id} value={f.user_id}>
                        {f.name} ({f.department_name}) — {f.designation || 'Faculty'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManageMentorProject(null);
                      setSelectedMentorId('');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminAssignMentor}
                    disabled={mentorActionLoading || !selectedMentorId}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{mentorActionLoading ? 'Assigning...' : 'Assign Faculty Mentor'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
