import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ProfileModal } from '../ui/ProfileModal';
import { OnboardingModal } from '../ui/OnboardingModal';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import {
  GraduationCap, LayoutDashboard, FolderPlus, Compass, FolderCheck, Users, UserCheck,
  CheckSquare, MessageSquare, Shield, LogOut, User, Menu, X
} from 'lucide-react';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  React.useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStudent = user?.role === 'STUDENT';
  const isMentor = user?.role === 'MENTOR';
  const isAdmin = user?.role === 'ADMIN';

  const logoDestination = isStudent ? '/student/dashboard' : isMentor ? '/mentor/dashboard' : isAdmin ? '/admin/dashboard' : '/';

  const navItems = [
    ...(isStudent
      ? [
          { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
          { label: 'Create Project', path: '/projects/create', icon: FolderPlus },
          { label: 'Browse Projects', path: '/projects/browse', icon: Compass },
          { label: 'Faculty Members', path: '/faculty', icon: Users },
          { label: 'My Projects', path: '/my-projects', icon: FolderCheck }
        ]
      : []),
    ...(isMentor
      ? [
          { label: 'Mentor Dashboard', path: '/mentor/dashboard', icon: LayoutDashboard },
          { label: 'Student Projects', path: '/mentor/student-projects', icon: Compass },
          { label: 'My Capstone Teams', path: '/mentor/my-teams', icon: Users }
        ]
      : []),
    ...(isAdmin
      ? [
          { label: 'Admin Overview', path: '/admin/dashboard', icon: Shield }
        ]
      : [])
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white w-full">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md w-full relative">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to={logoDestination} className="flex items-center gap-2.5 group shrink-0 whitespace-nowrap text-nowrap">
              <img src="/logo.svg" alt="Capstone Hub Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl group-hover:scale-105 transition shadow-lg shadow-indigo-600/30 object-contain shrink-0" />
              <div className="flex flex-col whitespace-nowrap text-nowrap shrink-0">
                <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent whitespace-nowrap text-nowrap">
                  CAPSTONE HUB
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-indigo-400 whitespace-nowrap text-nowrap">
                  {user?.role || 'University Platform'}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-8">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-[0.98] ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* Clickable User Profile Badge (Desktop Only) */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="hidden lg:flex items-center gap-3 pl-3 border-l border-slate-800 cursor-pointer hover:opacity-90 transition p-1.5 rounded-xl hover:bg-slate-800/60 active:scale-[0.98]"
              title="Click to view & edit your profile details"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[180px] sm:max-w-[260px]">{user?.name}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[180px] sm:max-w-[260px]">{user?.department_name || user?.email}</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-full flex items-center justify-center font-extrabold text-white shadow-md text-sm border-2 border-indigo-400/30">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>

            {/* Logout Button (Desktop Only) */}
            <button
              onClick={handleLogout}
              className="hidden lg:flex p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition active:scale-[0.98]"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition active:scale-[0.95]"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Backdrop & Light Theme Floating Top Dropdown Menu */}
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <div
              className="lg:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
              onClick={() => setMobileOpen(false)}
            />

            {/* Light Theme Compact Top Dropdown Menu directly below header */}
            <div className="lg:hidden absolute top-full right-4 left-4 sm:left-auto sm:w-80 z-50 mt-2 rounded-2xl shadow-2xl bg-white border border-slate-200/90 p-4 space-y-3.5 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150">
              {/* Light Theme Account / Profile Badge */}
              <div
                onClick={() => { setIsProfileOpen(true); setMobileOpen(false); }}
                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 rounded-xl cursor-pointer transition active:scale-[0.98] shadow-xs group"
              >
                <div className="w-9 h-9 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-md shadow-indigo-600/20 shrink-0">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">{user?.name}</p>
                  <p className="text-xs text-indigo-600 font-semibold truncate">View Profile Details →</p>
                </div>
              </div>

              {/* Light Theme Navigation Links */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 mb-1.5">Navigation</p>
                {navItems.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname.startsWith(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-bold rounded-xl transition active:scale-[0.98] ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-600'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-indigo-600'}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Light Theme Destructive Red Logout Option */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs sm:text-sm font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 transition active:scale-[0.98] shadow-xs"
                >
                  <div className="flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-rose-600/80">Logout</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 sm:py-8">
        {children}
      </main>

      {/* First-Time Profile Setup Wizard Modal */}
      <OnboardingModal />

      {/* Profile Details Modal Component */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 sm:py-6 text-center text-[11px] sm:text-xs text-slate-500 w-full px-4 sm:px-8 lg:px-12">
        <p>© 2026 Capstone Hub — Dynamic Multi-Disciplinary University Collaboration & Mentorship Ecosystem</p>
      </footer>
    </div>
  );
};
