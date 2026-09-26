import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from '../ui/NotificationDropdown';
import { ProfileModal } from '../ui/ProfileModal';
import {
  GraduationCap, LayoutDashboard, UserCheck, Building, Layers,
  ArrowRightLeft, Users, Sliders, Shield, LogOut, Menu, X, MessageSquare
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: any) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab = 'DASHBOARD', onTabChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (onTabChange) {
      onTabChange('DASHBOARD');
    }
    setMobileOpen(false);
    navigate('/admin/dashboard');
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of Admin Dashboard?')) {
      await logout();
      navigate('/login');
    }
  };

  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'STUDENTS', label: 'Students', icon: GraduationCap },
    { id: 'FACULTY', label: 'Faculty', icon: UserCheck },
    { id: 'DEPARTMENTS', label: 'Departments', icon: Building },
    { id: 'PROJECTS', label: 'Projects', icon: Layers },
    { id: 'REQUESTS', label: 'Requests', icon: ArrowRightLeft },
    { id: 'MESSAGES', label: 'Messages', icon: MessageSquare },
    { id: 'USERS', label: 'Users', icon: Users },
    { id: 'SETTINGS', label: 'Settings', icon: Sliders }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white w-full">
      {/* Top Navbar - Exact match to AppShell Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md w-full relative">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 xl:gap-3 min-w-0">
            <Link
              to="/admin/dashboard"
              onClick={handleLogoClick}
              className="flex items-center gap-2 sm:gap-2.5 group shrink-0 whitespace-nowrap text-nowrap cursor-pointer"
              title="Go to Admin Dashboard"
            >
              <img src="/logo.svg" alt="Capstone Hub Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl group-hover:scale-105 transition shadow-lg shadow-indigo-600/30 object-contain shrink-0" />
              <div className="flex flex-col whitespace-nowrap text-nowrap shrink-0">
                <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent whitespace-nowrap text-nowrap">
                  CAPSTONE HUB
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-indigo-400 whitespace-nowrap text-nowrap">
                  ADMIN MODULE
                </span>
              </div>
            </Link>

            {/* Top Header Navigation Bar (Desktop Only) */}
            <nav className="hidden xl:flex items-center gap-0.5 2xl:gap-1 ml-2 xl:ml-3 2xl:ml-6 min-w-0">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange?.(item.id)}
                    className={`flex items-center gap-1 xl:gap-1.5 px-2 xl:px-2.5 2xl:px-3 py-1.5 2xl:py-2 rounded-xl text-[11px] xl:text-xs font-bold transition active:scale-[0.98] whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 xl:gap-4 shrink-0">
            {/* Notification Dropdown */}
            <div className="shrink-0">
              <NotificationDropdown />
            </div>

            {/* Clickable Admin Profile Badge (Desktop Only) */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="hidden xl:flex items-center gap-2.5 pl-3 border-l border-slate-800 cursor-pointer hover:opacity-90 transition p-1.5 rounded-xl hover:bg-slate-800/60 active:scale-[0.98] shrink-0"
              title="Click to view Admin Profile"
            >
              <div className="hidden 2xl:block text-right">
                <p className="text-xs font-bold text-slate-100 truncate max-w-[140px] 2xl:max-w-[200px]">
                  {user?.name || 'Rabin Thilak J'}
                </p>
                <p className="text-[10px] text-indigo-400 font-semibold truncate max-w-[140px] 2xl:max-w-[200px]">
                  {user?.email || 'rabinthilakj@gmail.com'}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-indigo-600 rounded-full flex items-center justify-center font-extrabold text-white shadow-md text-xs sm:text-sm border-2 border-indigo-400/30 shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>

            {/* Logout Button (Desktop Only) */}
            <button
              onClick={handleLogout}
              className="hidden xl:flex p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition active:scale-[0.98]"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition active:scale-[0.95]"
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
              className="xl:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in"
              onClick={() => setMobileOpen(false)}
            />

            {/* Light Theme Compact Floating Top Dropdown Menu directly below header */}
            <div className="xl:hidden absolute top-full right-4 left-4 sm:left-auto sm:w-85 z-50 mt-2 rounded-2xl shadow-2xl bg-white border border-slate-200/90 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-150">
              {/* Account / Profile Badge */}
              <div
                onClick={() => { setIsProfileOpen(true); setMobileOpen(false); }}
                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 rounded-xl cursor-pointer transition active:scale-[0.98] shadow-xs group"
              >
                <div className="w-9 h-9 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center text-sm shadow-md shadow-indigo-600/20 shrink-0">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition">{user?.name || 'Rabin Thilak J'}</p>
                  <p className="text-xs text-indigo-600 font-semibold truncate">View Admin Profile Details →</p>
                </div>
              </div>

              {/* Navigation Items Grid (Compact 2-column grid to keep menu tight and concise) */}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                {navItems.map(item => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onTabChange?.(item.id);
                        setMobileOpen(false);
                      }}
                      className={`flex items-center gap-2 px-2.5 py-2 text-xs font-bold rounded-xl transition active:scale-[0.98] ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                          : 'text-slate-700 bg-slate-50 hover:bg-indigo-50/70 hover:text-indigo-600 border border-slate-200/50'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-white' : 'text-indigo-600'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Destructive Red Logout Option */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setMobileOpen(false); handleLogout(); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 transition active:scale-[0.98] shadow-xs"
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

      {/* Main Content Area - Full Available Screen Width (No Left Sidebar Wasted Space!) */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 sm:py-8">
        {children}
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Footer - Exact match to AppShell Footer */}
      <footer className="bg-white border-t border-slate-200 py-3 sm:py-6 text-center text-[11px] sm:text-xs text-slate-500 w-full px-4 sm:px-8 lg:px-12">
        <p>© 2026 Capstone Hub — Dynamic Multi-Disciplinary University Governance & Mentorship Ecosystem</p>
      </footer>
    </div>
  );
};
