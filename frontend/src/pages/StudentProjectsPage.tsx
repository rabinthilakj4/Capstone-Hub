import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { ENGINEERING_DOMAINS } from '../constants/domains';
import { SearchableDomainSelect } from '../components/ui/SearchableDomainSelect';
import {
  Compass, Search, Filter, RotateCcw, Eye, UserCheck, UserPlus, Users, GraduationCap,
  Building2, CheckCircle2, Clock, AlertCircle, Calendar, Sparkles, BookOpen, Layers, X
} from 'lucide-react';

const YEAR_OPTIONS = ['I Year', 'II Year', 'III Year', 'IV Year'];

export const StudentProjectsPage: React.FC = () => {
  const { user, refetchUser } = useAuth();

  const [projects, setProjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  // Filter States
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedMentorStatus, setSelectedMentorStatus] = useState('ALL');
  const [selectedProjectStatus, setSelectedProjectStatus] = useState('ALL');

  // Selected Project Modal
  const [selectedProjectModal, setSelectedProjectModal] = useState<any | null>(null);

  useEffect(() => {
    fetchProjects();
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/users/departments');
      setDepartments(res.data.departments || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mentors/all-student-projects');
      setProjects(res.data.projects || []);
    } catch (e) {
      console.error('Failed to fetch student projects:', e);
    } finally {
      setLoading(false);
    }
  };

  // Available domain options combined from engineering domains and database projects
  const availableDomains = useMemo(() => {
    const projDomains = projects.map(p => p.domain).filter(Boolean);
    const set = new Set([...ENGINEERING_DOMAINS, ...projDomains]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  // Handle direct mentorship acceptance
  const handleAcceptMentorship = async (projectId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to accept mentorship for "${title}"?`)) {
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [projectId]: true }));
      const res = await api.post(`/mentors/project/${projectId}/accept`);
      alert(res.data.message || 'Mentorship accepted successfully!');
      if (selectedProjectModal && selectedProjectModal.project_id === projectId) {
        setSelectedProjectModal(null);
      }
      await fetchProjects();
      await refetchUser();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to accept project mentorship.');
    } finally {
      setActionLoading(prev => ({ ...prev, [projectId]: false }));
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedDept('ALL');
    setSelectedYear('ALL');
    setSelectedDomain('ALL');
    setSelectedMentorStatus('ALL');
    setSelectedProjectStatus('ALL');
  };

  // Client-side filtering
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      // 1. Search Query (Title, Abstract, Leader Name, Register Number)
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesProjectCode = p.project_code?.toLowerCase().includes(q);
        const matchesTeamCode = p.team_code?.toLowerCase().includes(q);
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const matchesLeader = p.leader_name?.toLowerCase().includes(q);
        const matchesRegNo = p.leader_register_number?.toLowerCase().includes(q);
        const matchesAbstract = p.abstract?.toLowerCase().includes(q);
        const matchesDomain = p.domain?.toLowerCase().includes(q);

        if (!matchesProjectCode && !matchesTeamCode && !matchesTitle && !matchesLeader && !matchesRegNo && !matchesAbstract && !matchesDomain) {
          return false;
        }
      }

      // 2. Department Filter
      if (selectedDept !== 'ALL') {
        const pDeptId = String(p.department_id || '');
        const pDeptName = (p.department_name || '').toLowerCase();
        const target = selectedDept.toLowerCase();
        if (pDeptId !== selectedDept && !pDeptName.includes(target) && target !== pDeptName) {
          return false;
        }
      }

      // 3. Academic Year Filter
      if (selectedYear !== 'ALL') {
        const pYear = (p.academic_year || '').toLowerCase();
        const target = selectedYear.toLowerCase();
        if (!pYear.includes(target) && !target.includes(pYear)) {
          return false;
        }
      }

      // 4. Domain Filter
      if (selectedDomain !== 'ALL' && selectedDomain !== '') {
        if ((p.domain || '').toLowerCase() !== selectedDomain.toLowerCase()) {
          return false;
        }
      }

      // 5. Mentor Status Filter
      if (selectedMentorStatus !== 'ALL') {
        if (selectedMentorStatus === 'NEEDED' && p.mentor_id) return false;
        if (selectedMentorStatus === 'ASSIGNED' && !p.mentor_id) return false;
      }

      // 6. Project Status Filter
      if (selectedProjectStatus !== 'ALL') {
        if ((p.status || '').toLowerCase() !== selectedProjectStatus.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [projects, search, selectedDept, selectedYear, selectedDomain, selectedMentorStatus, selectedProjectStatus]);

  // Statistics
  const totalCount = projects.length;
  const mentorNeededCount = projects.filter(p => !p.mentor_id).length;
  const mentorAssignedCount = projects.filter(p => !!p.mentor_id).length;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Banner / Header */}
        <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>University Capstone Repository</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Student Projects Directory</h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              Browse, search, and review all student-created capstone projects across all university departments.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 w-full md:w-auto relative z-10">
            <div className="bg-slate-800/80 backdrop-blur-md px-4 py-3 rounded-2xl border border-slate-700/60 text-center flex-1 sm:flex-none min-w-[110px]">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Projects</div>
              <div className="text-xl font-extrabold text-white mt-0.5">{totalCount}</div>
            </div>
            <div className="bg-amber-500/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/20 text-center flex-1 sm:flex-none min-w-[110px]">
              <div className="text-xs text-amber-300 font-semibold uppercase">Mentor Needed</div>
              <div className="text-xl font-extrabold text-amber-400 mt-0.5">{mentorNeededCount}</div>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-emerald-500/20 text-center flex-1 sm:flex-none min-w-[110px]">
              <div className="text-xs text-emerald-300 font-semibold uppercase">Assigned</div>
              <div className="text-xl font-extrabold text-emerald-400 mt-0.5">{mentorAssignedCount}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by project title, leader name, register number, or keywords..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition"
              />
            </div>

            {/* Domain Selector */}
            <div className="w-full lg:w-72">
              <SearchableDomainSelect
                domains={availableDomains}
                selectedDomain={selectedDomain === 'ALL' ? '' : selectedDomain}
                onChange={(domainStr: string) => setSelectedDomain(domainStr || 'ALL')}
              />
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>

          {/* Secondary Dropdown Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Department Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-indigo-500" />
                <span>Department</span>
              </label>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Departments</option>
                {departments.map(d => (
                  <option key={d.department_id} value={String(d.department_id)}>
                    {d.department_name} ({d.department_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-indigo-500" />
                <span>Academic Year</span>
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Academic Years</option>
                {YEAR_OPTIONS.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* Mentor Status Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-indigo-500" />
                <span>Mentor Status</span>
              </label>
              <select
                value={selectedMentorStatus}
                onChange={e => setSelectedMentorStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Mentor Statuses</option>
                <option value="NEEDED">Mentor Needed</option>
                <option value="ASSIGNED">Mentor Assigned</option>
              </select>
            </div>

            {/* Project Status Filter */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-500" />
                <span>Project Status</span>
              </label>
              <select
                value={selectedProjectStatus}
                onChange={e => setSelectedProjectStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="ALL">All Project Statuses</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Showing {filteredProjects.length} of {totalCount} Student Projects
          </p>
          {(search || selectedDept !== 'ALL' || selectedYear !== 'ALL' || selectedDomain !== 'ALL' || selectedMentorStatus !== 'ALL' || selectedProjectStatus !== 'ALL') && (
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              Filters Active
            </span>
          )}
        </div>

        {/* Loading Indicator */}
        {loading ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-bold text-slate-700">Loading Student Projects from database...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">No Student Projects Found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No projects matched your search criteria or current filter selections. Try adjusting your search query or reset filters.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Project Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => {
              const isMentorNeeded = !project.mentor_id;

              return (
                <div
                  key={project.project_id}
                  className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden group hover:border-slate-300"
                >
                  <div className="p-6 space-y-4">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex flex-wrap items-center gap-2">
                        {project.project_code && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold rounded-md border border-indigo-200">
                            Project ID: {project.project_code}
                          </span>
                        )}
                        {project.team_code && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold rounded-md border border-emerald-200">
                            Team ID: {project.team_code}
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-lg truncate max-w-[180px]">
                          {project.domain}
                        </span>
                      </div>

                      {/* Mentor Status Badge */}
                      {isMentorNeeded ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-extrabold rounded-lg">
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                          <span>Mentor Needed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-extrabold rounded-lg">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Mentor Assigned</span>
                        </span>
                      )}
                    </div>

                    {/* Project Title */}
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition">
                        {project.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {project.description || project.abstract}
                      </p>
                    </div>

                    {/* Project Leader & Dept Details */}
                    <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Project Leader:</span>
                        <span className="font-extrabold text-slate-900 truncate max-w-[160px]">{project.leader_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Register No:</span>
                        <span className="font-bold text-slate-700 font-mono text-[11px]">{project.leader_register_number}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Department:</span>
                        <span className="font-bold text-slate-800 truncate max-w-[160px]">{project.department_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Academic Year:</span>
                        <span className="font-extrabold text-indigo-600">{project.academic_year}</span>
                      </div>
                    </div>

                    {/* Team Size & Mentor Details */}
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span>{project.current_team_size} / {project.max_team_size} Members</span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-500">
                        {project.created_at ? new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                      </div>
                    </div>

                    {/* Required Skills Tags */}
                    {Array.isArray(project.required_skills) && project.required_skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Required Skills:</span>
                        <div className="flex flex-wrap gap-1">
                          {project.required_skills.slice(0, 3).map((skill: string) => (
                            <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                              {skill}
                            </span>
                          ))}
                          {project.required_skills.length > 3 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                              +{project.required_skills.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Action Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProjectModal(project)}
                      className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-4 h-4 text-indigo-600" />
                      <span>View Project</span>
                    </button>

                    {isMentorNeeded && (
                      <button
                        type="button"
                        disabled={actionLoading[project.project_id]}
                        onClick={() => handleAcceptMentorship(project.project_id, project.title)}
                        className="py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Accept</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DETAILED PROJECT MODAL */}
        {selectedProjectModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-6 sm:p-8 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-lg">
                      {selectedProjectModal.domain}
                    </span>
                    {!selectedProjectModal.mentor_id ? (
                      <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-extrabold rounded-lg flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Mentor Needed</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold rounded-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mentor Assigned ({selectedProjectModal.mentor_name || 'Faculty'})</span>
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {selectedProjectModal.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedProjectModal(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Section 1: Leader & Metadata Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Project Leader</span>
                    <span className="font-extrabold text-slate-900 text-sm">{selectedProjectModal.leader_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Register Number</span>
                    <span className="font-bold text-slate-800 font-mono">{selectedProjectModal.leader_register_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Department</span>
                    <span className="font-bold text-slate-800">{selectedProjectModal.department_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Academic Year</span>
                    <span className="font-extrabold text-indigo-600">{selectedProjectModal.academic_year}</span>
                  </div>
                </div>

                {/* Section 2: Abstract & Problem Statement */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">Project Abstract</h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {selectedProjectModal.abstract || selectedProjectModal.description}
                    </p>
                  </div>

                  {selectedProjectModal.problem_statement && (
                    <div>
                      <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">Problem Statement</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {selectedProjectModal.problem_statement}
                      </p>
                    </div>
                  )}

                  {selectedProjectModal.proposed_solution && (
                    <div>
                      <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">Proposed Solution</h3>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        {selectedProjectModal.proposed_solution}
                      </p>
                    </div>
                  )}
                </div>

                {/* Section 3: Required Skills & Technologies */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Array.isArray(selectedProjectModal.required_skills) && selectedProjectModal.required_skills.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Required Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProjectModal.required_skills.map((skill: string) => (
                          <span key={skill} className="px-2.5 py-1 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-lg shadow-sm">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {Array.isArray(selectedProjectModal.preferred_mentor_expertise) && selectedProjectModal.preferred_mentor_expertise.length > 0 && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">Preferred Mentor Expertise</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProjectModal.preferred_mentor_expertise.map((exp: string) => (
                          <span key={exp} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold rounded-lg">
                            {exp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 4: Team Roster */}
                <div className="space-y-3">
                  <h3 className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Assigned Team Members</span>
                    <span className="text-slate-500 font-bold text-xs">{selectedProjectModal.current_team_size} / {selectedProjectModal.max_team_size} Members</span>
                  </h3>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    {Array.isArray(selectedProjectModal.team_members) && selectedProjectModal.team_members.map((member: any) => (
                      <div key={member.user_id || member.name} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{member.name}</div>
                            <div className="text-slate-400 font-mono text-[11px]">{member.register_number}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded text-[11px]">
                            {member.role}
                          </span>
                          <div className="text-slate-500 text-[11px] mt-0.5">{member.department_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProjectModal(null)}
                  className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition"
                >
                  Close
                </button>

                {!selectedProjectModal.mentor_id && (
                  <button
                    type="button"
                    disabled={actionLoading[selectedProjectModal.project_id]}
                    onClick={() => handleAcceptMentorship(selectedProjectModal.project_id, selectedProjectModal.title)}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Accept Project Mentorship</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
