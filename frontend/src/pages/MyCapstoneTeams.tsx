import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { AppShell } from '../components/layout/AppShell';
import { StatusPill } from '../components/ui/StatusPill';
import {
  Users, ArrowRight, FileText, CheckCircle2, XCircle, AlertCircle, Phone
} from 'lucide-react';

export const MyCapstoneTeams: React.FC = () => {
  const { user } = useAuth();
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Milestone review modal
  const [selectedMilestone, setSelectedMilestone] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewRating, setReviewRating] = useState(5);

  useEffect(() => {
    loadMentorData();
  }, []);

  const loadMentorData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/mentors/assigned');
      setAssignedProjects(res.data.projects || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitMilestoneReview = async () => {
    if (!selectedMilestone) return;
    try {
      await api.post(`/workspace/${selectedMilestone.project_id}/milestones/${selectedMilestone.milestone_id}/review`, {
        status: reviewStatus,
        feedback: reviewFeedback,
        rating: reviewRating
      });
      alert(`Milestone successfully marked as ${reviewStatus === 'VERIFIED' ? 'VERIFIED & APPROVED' : 'REJECTED'}!`);
      setSelectedMilestone(null);
      setReviewFeedback('');
      loadMentorData();
    } catch (e) {
      alert('Failed to submit milestone evaluation.');
    }
  };

  // Extract all submitted milestones waiting for mentor verification across all assigned projects
  const pendingSubmittedMilestones: any[] = [];
  assignedProjects.forEach(proj => {
    if (proj.milestones && Array.isArray(proj.milestones)) {
      proj.milestones.forEach((m: any) => {
        if ((m.status || '').toUpperCase() === 'SUBMITTED') {
          pendingSubmittedMilestones.push({
            ...m,
            project_title: proj.title,
            team_members: proj.team?.members || []
          });
        }
      });
    }
  });

  const mentorProf = user?.mentor_profile;

  return (
    <AppShell>
      <div className="space-y-8">
        {/* Header Banner */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-xs font-semibold mb-3">
              <Users className="w-3.5 h-3.5" />
              <span>Capstone Team Guidance & Mentorship</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">My Capstone Teams</h1>
            <p className="text-slate-300 text-sm mt-1">
              Active projects & teams under your academic guidance ({assignedProjects.length} Teams)
            </p>
          </div>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase">Current Workload</span>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              {mentorProf?.current_load || assignedProjects.length} / {mentorProf?.mentoring_capacity || 5} Active Teams
            </div>
          </div>
        </div>

        {/* DEDICATED SECTION: Submitted Milestones Pending Verification */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-5 h-5 ${pendingSubmittedMilestones.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
              <div>
                <h2 className="text-lg font-bold text-slate-900">Submitted Milestones Pending Verification</h2>
                <p className="text-xs text-slate-500">Student deliverables awaiting mentor review and verification ({pendingSubmittedMilestones.length})</p>
              </div>
            </div>
            {pendingSubmittedMilestones.length > 0 && (
              <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold rounded-full">
                {pendingSubmittedMilestones.length} Pending Review
              </span>
            )}
          </div>

          {pendingSubmittedMilestones.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center space-y-1">
              <p className="text-sm font-bold text-slate-700">No Pending Submissions</p>
              <p className="text-xs text-slate-500">All submitted milestones from your capstone teams have been verified or reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSubmittedMilestones.map((ms) => (
                <div key={ms.milestone_id} className="p-5 bg-amber-50/60 border border-amber-200 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusPill status="SUBMITTED" />
                      <h3 className="font-extrabold text-slate-900 text-sm">{ms.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600">
                      Project: <strong className="text-slate-800">{ms.project_title}</strong>
                    </p>
                    {ms.submission_notes && (
                      <p className="text-xs text-amber-900 bg-white p-2 rounded-lg border border-amber-200 mt-1">
                        <strong>Student Notes:</strong> {ms.submission_notes}
                      </p>
                    )}
                    {ms.submission_url && (
                      <a href={ms.submission_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 underline block">
                        View Deliverables Document →
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedMilestone(ms);
                      setReviewStatus('VERIFIED');
                    }}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition shrink-0"
                  >
                    Verify & Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assigned Projects & Teams List */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Assigned Capstone Teams ({assignedProjects.length})</span>
          </h2>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium">Loading assigned teams...</div>
          ) : assignedProjects.length === 0 ? (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <p className="text-base font-bold text-slate-700">No Capstone Teams Assigned</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You currently have no active capstone teams assigned. Accept pending mentorship requests from the Mentor Dashboard to begin guiding projects.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {assignedProjects.map(proj => (
                <div key={proj.project_id} className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-5 hover:border-slate-300 transition">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
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
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-2">{proj.title}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">{proj.abstract}</p>
                    </div>

                    <Link
                      to={`/project/${proj.project_id}/overview`}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shrink-0 shadow-sm transition"
                    >
                      Guidance Workspace
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Team Members */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-500 block">Team Members:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {proj.team?.members.map((m: any) => {
                        const sName = m.student?.name || m.name;
                        const sReg = m.student?.student_id || m.register_number || 'N/A';
                        const sEmail = m.student?.email || m.email || '';
                        const sPhone = m.student?.student_profile?.phone || m.phone || '';
                        const sYear = m.student?.student_profile?.year || m.year || '1st Year';
                        const sDept = m.student?.department?.department_name || m.department_name || '';

                        return (
                          <div key={m.student_id || sReg} className="p-2.5 bg-white text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-900">{sName}</span>
                              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[9px]">{sYear}</span>
                            </div>
                            <p className="font-mono text-indigo-600 font-bold text-[10px]">Reg: {sReg}</p>
                            {sEmail && <p className="text-slate-500 text-[10px]">{sEmail}</p>}
                            {sPhone && (
                              <p className="text-slate-600 text-[10px] font-mono flex items-center gap-1">
                                <Phone className="w-3 h-3 text-indigo-500" />
                                {sPhone}
                              </p>
                            )}
                            {sDept && <p className="text-[9px] text-slate-400">{sDept}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* All Project Milestones Statuses */}
                  <div className="pt-3 border-t border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Project Milestones Status Tracker</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {proj.milestones?.map((m: any) => {
                        const mStatus = (m.status || 'PENDING').toUpperCase();
                        const isVerified = mStatus === 'VERIFIED' || mStatus === 'APPROVED';
                        const isSubmitted = mStatus === 'SUBMITTED';
                        const isRejected = mStatus === 'REJECTED' || mStatus === 'REVISION_REQUESTED';

                        return (
                          <div key={m.milestone_id} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{m.title}</span>
                              <StatusPill status={isVerified ? 'VERIFIED' : isRejected ? 'REJECTED' : mStatus} />
                            </div>

                            {isSubmitted && (
                              <button
                                onClick={() => {
                                  setSelectedMilestone(m);
                                  setReviewStatus('VERIFIED');
                                }}
                                className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                              >
                                Review & Verify Submission
                              </button>
                            )}

                            {isVerified && (
                              <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Verified (Rating: {m.rating || 5}/5 ★)</span>
                              </div>
                            )}

                            {isRejected && (
                              <div className="text-[11px] text-rose-800 font-semibold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Rejected (Revision Requested)</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Milestone Verification / Review Modal */}
        {selectedMilestone && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 space-y-5">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-extrabold text-slate-900 text-lg">Verify & Review Milestone</h3>
                <button onClick={() => setSelectedMilestone(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h4 className="font-extrabold text-slate-900 text-sm">{selectedMilestone.title}</h4>
                {selectedMilestone.submission_notes && (
                  <p className="text-xs text-slate-600"><strong>Notes:</strong> {selectedMilestone.submission_notes}</p>
                )}
                {selectedMilestone.submission_url && (
                  <a href={selectedMilestone.submission_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 underline block">
                    View Submission Document →
                  </a>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Verification Decision</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewStatus('VERIFIED')}
                      className={`py-3 rounded-2xl font-extrabold text-xs border transition flex items-center justify-center gap-1.5 ${
                        reviewStatus === 'VERIFIED'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus('REJECTED')}
                      className={`py-3 rounded-2xl font-extrabold text-xs border transition flex items-center justify-center gap-1.5 ${
                        reviewStatus === 'REJECTED'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject / Revisions</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Rating (1 to 5 Stars)</label>
                  <select
                    value={reviewRating}
                    onChange={e => setReviewRating(Number(e.target.value))}
                    className="w-full p-3 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value={5}>5 Stars — Outstanding</option>
                    <option value={4}>4 Stars — Good Progress</option>
                    <option value={3}>3 Stars — Satisfactory</option>
                    <option value={2}>2 Stars — Needs Improvement</option>
                    <option value={1}>1 Star — Unsatisfactory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Faculty Feedback Comments</label>
                  <textarea
                    value={reviewFeedback}
                    onChange={e => setReviewFeedback(e.target.value)}
                    rows={3}
                    placeholder="Enter detailed feedback or required revision notes for the student team..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMilestone(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitMilestoneReview}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition"
                >
                  Confirm Milestone Verification
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
