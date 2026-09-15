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
  activeTab: string;
  onTabChange: (tab: any) => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
    { id: 'REQUESTS', label: 'Project Requests', icon: ArrowRightLeft },
    { id: 'MESSAGES', label: 'Messages', icon: MessageSquare },
    { id: 'USERS', label: 'Users', icon: Users },
    { id: 'SETTINGS', label: 'Settings', icon: Sliders }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-indigo-600 selection:text-white w-full">
      {/* Top Navbar - Exact match to AppShell Navbar */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md w-full">
        <div className="w-full px-4 sm:px-8 lg:px-12 xl:px-16 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
              <img src="/logo.svg" alt="Capstone Hub Logo" className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl group-hover:scale-105 transition shadow-lg shadow-indigo-600/30 object-contain" />
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  CAPSTONE HUB
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-indigo-400">
                  ADMIN MODULE
                </span>
              </div>
            </Link>

            {/* Top Header Navigation Bar (No Left Sidebar!) */}
            <nav className="hidden xl:flex items-center gap-1 ml-6">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Notification Dropdown */}
            <NotificationDropdown />

            {/* Clickable Admin Profile Badge */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 pl-3 border-l border-slate-800 cursor-pointer hover:opacity-90 transition p-1.5 rounded-xl hover:bg-slate-800/60"
              title="Click to view Admin Profile"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs sm:text-sm font-bold text-slate-100 truncate max-w-[180px] sm:max-w-[260px]">
                  {user?.name || 'Rabin Thilak J'}
                </p>
                <p className="text-[10px] text-indigo-400 font-semibold truncate max-w-[180px] sm:max-w-[260px]">
                  {user?.email || 'rabinthilakj@gmail.com'}
                </p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-600 rounded-full flex items-center justify-center font-extrabold text-white shadow-md text-sm border-2 border-indigo-400/30">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="xl:hidden p-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="xl:hidden bg-slate-900 border-t border-slate-800 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top-4 duration-200 shadow-2xl">
            <div
              onClick={() => { setIsProfileOpen(true); setMobileOpen(false); }}
              className="flex items-center gap-3 p-3 bg-slate-800/80 hover:bg-slate-800 rounded-2xl mb-3 cursor-pointer"
            >
              <div className="w-10 h-10 bg-indigo-600 text-white font-bold rounded-xl flex items-center justify-center text-sm">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{user?.name || 'Rabin Thilak J'}</p>
                <p className="text-xs text-indigo-400 font-semibold">{user?.email || 'rabinthilakj@gmail.com'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition ${
                      active ? 'bg-indigo-600 text-white' : 'text-slate-200 bg-slate-800/60 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area - Full Available Screen Width (No Left Sidebar Wasted Space!) */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 xl:px-16 py-6 sm:py-8">
        {children}
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Footer - Exact match to AppShell Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 w-full px-4 sm:px-8 lg:px-12">
        <p>© 2026 Capstone Hub — Dynamic Multi-Disciplinary University Governance & Mentorship Ecosystem</p>
      </footer>
    </div>
  );
};
