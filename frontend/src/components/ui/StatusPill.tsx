import React from 'react';

interface StatusPillProps {
  status: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({ status }) => {
  let color = 'bg-slate-100 text-slate-700 border-slate-200';

  const s = status.toUpperCase();

  if (['PUBLISHED', 'COMPLETED', 'APPROVED', 'VERIFIED', 'ACTIVE', 'ACCEPTED'].includes(s)) {
    color = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'IN_REVIEW', 'SCHEDULED'].includes(s)) {
    color = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (['REJECTED', 'CANCELLED', 'REVISION_REQUESTED', 'URGENT'].includes(s)) {
    color = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (['TODO', 'LOW', 'MEDIUM', 'HIGH'].includes(s)) {
    color = 'bg-sky-50 text-sky-700 border-sky-200';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      {status === 'VERIFIED' ? 'VERIFIED' : status === 'REJECTED' ? 'REJECTED' : status.replace('_', ' ')}
    </span>
  );
};
