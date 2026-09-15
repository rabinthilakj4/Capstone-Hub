import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, Layers, Sparkles, FolderCheck, AlertCircle, Info, X, ExternalLink } from 'lucide-react';
import api from '../../services/api';

interface NotificationItem {
  notification_id: string;
  type: string;
  message: string;
  project_id?: string;
  status?: string;
  read: boolean;
  created_at: string;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    notification_id: 'n-1',
    type: 'SYSTEM',
    message: 'Welcome to Capstone Hub! Your multidisciplinary collaboration portal is active.',
    read: false,
    created_at: new Date().toISOString()
  },
  {
    notification_id: 'n-2',
    type: 'MILESTONE',
    message: 'Milestone 1 (Project Proposal) deadline is coming up in 7 days.',
    read: false,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    notification_id: 'n-3',
    type: 'MENTORSHIP',
    message: 'Faculty mentor allocation & expertise matching is enabled for your department.',
    read: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
];

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/notifications');
      const fetched = res.data.notifications || [];
      if (fetched.length > 0) {
        setNotifications(fetched);
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS);
      }
    } catch (e) {
      setNotifications(DEFAULT_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/users/notifications/read', {});
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await api.patch('/users/notifications/read', { notification_id: id });
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
    } catch (e) {
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markSingleRead(item.notification_id);
    if (item.project_id) {
      setIsOpen(false);
      navigate(`/projects/details/${item.project_id}`);
    }
  };

  const handleResponse = async (notificationId: string, action: 'ACCEPT' | 'REJECT', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.post('/projects/join-request/respond', { notification_id: notificationId, action });
      setNotifications(prev =>
        prev.map(n => n.notification_id === notificationId ? { ...n, status: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED', read: true } : n)
      );
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to respond to invitation.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROJECT':
      case 'PROJECT_INVITE':
      case 'PROJECT_ACCEPT':
      case 'PROJECT_REJECT':
        return <span className="bg-indigo-100 text-indigo-700 p-1 rounded-md"><FolderCheck className="w-3.5 h-3.5" /></span>;
      case 'MILESTONE':
        return <span className="bg-amber-100 text-amber-700 p-1 rounded-md"><Clock className="w-3.5 h-3.5" /></span>;
      case 'MENTORSHIP':
        return <span className="bg-emerald-100 text-emerald-700 p-1 rounded-md"><Sparkles className="w-3.5 h-3.5" /></span>;
      case 'TASK':
        return <span className="bg-blue-100 text-blue-700 p-1 rounded-md"><Layers className="w-3.5 h-3.5" /></span>;
      default:
        return <span className="bg-slate-100 text-slate-700 p-1 rounded-md"><Info className="w-3.5 h-3.5" /></span>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button Trigger */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition relative"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
        )}
      </button>

      {/* Popover Menu Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-slate-900 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Panel Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs uppercase tracking-wider">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-extrabold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-indigo-300 hover:text-white font-semibold flex items-center gap-1 transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length > 0 ? (
              notifications.map(item => (
                <div
                  key={item.notification_id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 text-xs transition cursor-pointer flex gap-3 items-start ${
                    item.read ? 'bg-white hover:bg-slate-50 opacity-75' : 'bg-indigo-50/50 hover:bg-indigo-50 font-semibold'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getTypeBadge(item.type)}
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <p className="text-slate-800 leading-snug whitespace-pre-line">{item.message}</p>

                    {item.type === 'PROJECT_INVITE' && (
                      <div className="pt-1 flex items-center gap-2">
                        {item.status === 'PENDING' || !item.status ? (
                          <>
                            <button
                              onClick={e => handleResponse(item.notification_id, 'ACCEPT', e)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[10px] shadow transition"
                            >
                              Accept
                            </button>
                            <button
                              onClick={e => handleResponse(item.notification_id, 'REJECT', e)}
                              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-[10px] transition"
                            >
                              Decline
                            </button>
                          </>
                        ) : item.status === 'ACCEPTED' ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md">
                            Accepted
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
                            Declined
                          </span>
                        )}

                        <span className="text-[10px] text-indigo-600 font-bold ml-auto flex items-center gap-0.5 hover:underline">
                          <span>Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 mt-1 flex-shrink-0" title="Unread notification"></span>
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                No notifications found.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] font-bold text-slate-500">
            Capstone Hub System Alerts & Workflow Notifications
          </div>
        </div>
      )}
    </div>
  );
};
