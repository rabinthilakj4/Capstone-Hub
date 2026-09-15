import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, X, Send, AlertCircle, CheckCircle2, FolderPlus, ShieldAlert, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';

interface HireMentorModalProps {
  isOpen: boolean;
  mentor: any;
  onClose: () => void;
  onSuccess: () => void;
  initialProjectId?: string;
}

export const HireMentorModal: React.FC<HireMentorModalProps> = ({
  isOpen,
  mentor,
  onClose,
  onSuccess,
  initialProjectId
}) => {
  const { user } = useAuth();
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [mentoredProjectsList, setMentoredProjectsList] = useState<any[]>([]);
  const [allProjectsCount, setAllProjectsCount] = useState<number>(0);
  const [isTeamLeader, setIsTeamLeader] = useState<boolean>(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      fetchStudentProjects();
      setError('');
      setMessage('');
      setIsConfirming(false);
    }
  }, [isOpen]);

  const fetchStudentProjects = async () => {
    try {
      setFetchingProjects(true);
      const res = await api.get('/projects/mine');
      if (res.data.success) {
        const allProjects = [...(res.data.myProjects || []), ...(res.data.otherProjects || [])];
        setAllProjectsCount(allProjects.length);

        // Identify projects where the logged-in student is the Team Leader
        const ledProjects = allProjects.filter((p: any) => {
          const isCreator = p.created_by === user?.user_id;
          const isLeaderRole = p.role === 'Project Leader' || p.role === 'Leader';
          const isMemberLeader = p.team?.members?.some((m: any) =>
            m.student_id === user?.user_id && (m.role === 'Leader' || m.role === 'LEADER')
          );
          return isCreator || isLeaderRole || isMemberLeader;
        });

        setIsTeamLeader(ledProjects.length > 0);

        // Separate into unassigned vs assigned mentor projects
        const unassigned = ledProjects.filter((p: any) => !p.mentor_id);
        const assigned = ledProjects.filter((p: any) => Boolean(p.mentor_id));

        setMyProjects(unassigned);
        setMentoredProjectsList(assigned);

        if (initialProjectId && unassigned.some((p: any) => p.project_id === initialProjectId)) {
          setSelectedProjectId(initialProjectId);
        } else if (unassigned.length > 0) {
          setSelectedProjectId(unassigned[0].project_id);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setFetchingProjects(false);
    }
  };

  if (!isOpen || !mentor) return null;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setError('Please select a project to request mentorship for.');
      return;
    }
    setError('');
    setIsConfirming(true);
  };

  const handleConfirmRequest = async () => {
    if (!selectedProjectId) {
      setError('Please select a project to request mentorship for.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.post('/mentor-requests', {
        projectId: selectedProjectId,
        mentorId: mentor.mentor_id || mentor.user_id,
        message
      });

      if (res.data.success) {
        alert(res.data.message || 'Mentorship request sent successfully!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to send mentorship request.';
      if (errMsg.toLowerCase().includes('already exists')) {
        alert('Mentorship request sent successfully!');
        onSuccess();
        onClose();
      } else {
        setError(errMsg);
        setIsConfirming(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = myProjects.find(p => p.project_id === selectedProjectId);
  const hasPendingForThisMentor = Boolean(
    selectedProject &&
    Array.isArray(selectedProject.mentorship_requests) &&
    selectedProject.mentorship_requests.some(
      (r: any) => (r.mentor_id === mentor.mentor_id || r.mentor_id === mentor.user_id) && r.status === 'PENDING'
    )
  );

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 relative space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {isConfirming ? 'Confirm Mentor Assignment' : 'Hire as Guide'}
            </h2>
            <p className="text-xs text-slate-500">
              {isConfirming
                ? 'Please review assignment details before sending the request'
                : <>Send a mentorship request to <strong className="text-slate-800">{mentor.name}</strong> ({mentor.department})</>}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Mentor Workload & Slots Summary */}
        {!isConfirming && !hasPendingForThisMentor && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs flex justify-between items-center">
            <div>
              <span className="text-slate-500 font-medium block">Current Workload</span>
              <span className="font-extrabold text-slate-800">{mentor.workloadPercentage || 0}% ({mentor.current_load || 0}/5 teams)</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium block">Available Slots</span>
              <span className="font-extrabold text-emerald-600">{mentor.remainingCapacity ?? (5 - (mentor.current_load || 0))} slots free</span>
            </div>
          </div>
        )}

        {fetchingProjects ? (
          <div className="py-8 text-center text-xs font-bold text-slate-500">
            Loading your projects...
          </div>
        ) : hasPendingForThisMentor && !isConfirming ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
            <Clock className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-amber-900">Mentorship Request Sent / Pending</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              You have already sent a mentorship request to <strong className="text-amber-950">{mentor.name}</strong> for project <strong className="text-amber-950">"{selectedProject?.title}"</strong>. The status is currently <strong>Request Sent / Pending</strong> while awaiting faculty response.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-amber-700 text-white font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        ) : isConfirming ? (
          /* Confirmation Step View */
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Project</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedProject?.title || 'Selected Project'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Mentor</span>
                <span className="font-extrabold text-emerald-600 text-sm">{mentor.name}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Department</span>
                <span className="font-bold text-slate-800">{mentor.department || 'N/A'}</span>
              </div>
              {message && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-semibold block uppercase tracking-wider text-[10px]">Invitation Note</span>
                  <span className="italic text-slate-700">{message}</span>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={loading}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRequest}
                disabled={loading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
              >
                {loading ? 'Confirming...' : 'Confirm'}
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : myProjects.length > 0 ? (
          <form onSubmit={handleProceedToConfirm} className="space-y-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Select Capstone Project
              </label>
              <select
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {myProjects.map(p => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.title} ({p.domain})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                Invitation Note (Optional)
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Briefly explain your project context and why you chose this mentor..."
                rows={3}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
              >
                Proceed to Confirm
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : mentoredProjectsList.length > 0 ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-bold text-emerald-900">Mentor Already Assigned</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Your capstone project <strong className="text-emerald-950">"{mentoredProjectsList[0].title}"</strong> already has an assigned mentor ({mentoredProjectsList[0].mentor?.name || 'Assigned Faculty Guide'}). A project can only have one assigned mentor.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-emerald-700 text-white font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        ) : allProjectsCount > 0 && !isTeamLeader ? (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-amber-900">Team Leader Authorization Required</h3>
            <p className="text-xs text-amber-800 leading-relaxed">
              Only the Team Leader is authorized to request a mentor for your project. Please ask your Team Leader to send the mentorship request.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-amber-700 text-white font-bold rounded-xl text-xs"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
            <FolderPlus className="w-10 h-10 text-amber-600 mx-auto" />
            <h3 className="text-sm font-bold text-amber-900">No Capstone Projects Found</h3>
            <p className="text-xs text-amber-800">
              You haven't created a project proposal yet. Create a project proposal first to hire a faculty guide.
            </p>
            <Link
              to="/projects/create"
              onClick={onClose}
              className="inline-block px-5 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow"
            >
              Create Project Proposal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
