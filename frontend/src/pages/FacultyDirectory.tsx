import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { HireMentorModal } from '../components/ui/HireMentorModal';
import { SearchableDepartmentSelect } from '../components/ui/SearchableDepartmentSelect';
import {
  Users, Search, UserCheck, Shield, BookOpen, AlertCircle, RefreshCw
} from 'lucide-react';

export const FacultyDirectory: React.FC = () => {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hire Guide Modal State
  const [isHireModalOpen, setIsHireModalOpen] = useState(false);
  const [selectedMentorForHire, setSelectedMentorForHire] = useState<any>(null);

  useEffect(() => {
    fetchMentors();
    api.get('/users/departments').then(res => setDepartments(res.data.departments || [])).catch(() => {});
  }, []);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/mentors/all');
      if (res.data.success) {
        setMentors(res.data.mentors || []);
      } else {
        setError(res.data.message || 'Failed to fetch faculty members.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load faculty directory.');
    } finally {
      setLoading(false);
    }
  };

  const filteredMentors = useMemo(() => {
    return mentors.filter(m => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || (
        m.name?.toLowerCase().includes(query) ||
        m.department?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query) ||
        (Array.isArray(m.expertise) && m.expertise.some((e: string) => e.toLowerCase().includes(query)))
      );

      const matchesDept = !selectedDeptId || String(m.department_id) === String(selectedDeptId);

      return matchesSearch && matchesDept;
    });
  }, [mentors, search, selectedDeptId]);

  const handleOpenHireModal = (mentor: any) => {
    setSelectedMentorForHire(mentor);
    setIsHireModalOpen(true);
  };

  const isStudent = user?.role === 'STUDENT';

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              <span>University Faculty Directory</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Faculty Members & Guides</h1>
            <p className="text-slate-300 text-sm mt-1">Explore faculty members across all departments and request mentorship for your capstone project</p>
          </div>

          <button
            onClick={fetchMentors}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition disabled:opacity-50"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search & Department Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search faculty members by name, email, or expertise..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="sm:w-72">
            <SearchableDepartmentSelect
              departments={departments}
              selectedId={selectedDeptId ? String(selectedDeptId) : ''}
              onChange={id => setSelectedDeptId(String(id))}
              placeholder="Filter by Department"
            />
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Loading faculty directory...</p>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 p-6 rounded-3xl text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <p className="text-xs font-bold text-rose-900">{error}</p>
            <button
              onClick={fetchMentors}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition"
            >
              Retry
            </button>
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No faculty members found matching your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMentors.map(mentor => (
              <div key={mentor.mentor_id || mentor.user_id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition">
                <div className="space-y-3">
                  {/* Avatar & Header Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-md flex-shrink-0">
                      {mentor.name?.charAt(0) || 'F'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-slate-900 text-base truncate">{mentor.name}</h3>
                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                          mentor.isFullyBooked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {mentor.isFullyBooked ? 'Fully Booked' : `${mentor.remainingCapacity}/5 slots free`}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-indigo-600 truncate">{mentor.department}</p>
                      <p className="text-[11px] text-slate-400 font-medium truncate">{mentor.email}</p>
                    </div>
                  </div>

                  {/* Workload Progress Bar */}
                  <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Workload Capacity</span>
                      <span>{mentor.workloadPercentage}% ({mentor.activeProjectsCount || 0}/5 active teams)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          mentor.isFullyBooked ? 'bg-rose-500' : mentor.workloadPercentage > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${mentor.workloadPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Expertise Badges */}
                  {Array.isArray(mentor.expertise) && mentor.expertise.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expertise Areas:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {mentor.expertise.map((e: string) => (
                          <span key={e} className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg">
                            {e}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Hire as Guide Button (Available for Students) */}
                {isStudent && (
                  <div className="pt-3 border-t border-slate-100">
                    {mentor.isAssigned ? (
                      <div className="w-full py-2.5 bg-emerald-100 text-emerald-800 font-extrabold text-xs rounded-xl text-center border border-emerald-300">
                        ✓ Assigned Guide & Mentor
                      </div>
                    ) : mentor.isRequested ? (
                      <div className="w-full py-2.5 bg-amber-100 text-amber-800 font-bold text-xs rounded-xl text-center border border-amber-300">
                        Request Sent / Pending
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenHireModal(mentor)}
                        disabled={mentor.isFullyBooked}
                        className={`w-full py-2.5 text-xs font-bold rounded-xl shadow-sm transition flex items-center justify-center gap-2 ${
                          mentor.isFullyBooked
                            ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>{mentor.isFullyBooked ? 'Fully Booked' : 'Hire as Guide'}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hire Guide Modal */}
        <HireMentorModal
          isOpen={isHireModalOpen}
          mentor={selectedMentorForHire}
          onClose={() => setIsHireModalOpen(false)}
          onSuccess={fetchMentors}
        />
      </div>
    </AppShell>
  );
};
