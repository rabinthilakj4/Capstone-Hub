import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ModalProvider } from './context/ModalContext';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AuthCallback } from './pages/AuthCallback';
import { StudentDashboard } from './pages/StudentDashboard';
import { MentorDashboard } from './pages/MentorDashboard';
import { MyCapstoneTeams } from './pages/MyCapstoneTeams';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProjectBrowse } from './pages/ProjectBrowse';
import { ProjectCreation } from './pages/ProjectCreation';
import { ProjectWorkspace } from './pages/ProjectWorkspace';
import { MyProjects } from './pages/MyProjects';
import { ProjectDetails } from './pages/ProjectDetails';
import { FacultyDirectory } from './pages/FacultyDirectory';
import { FacultyOnboarding } from './pages/FacultyOnboarding';
import { StudentProjectsPage } from './pages/StudentProjectsPage';
import { ScrollToTop } from './components/utils/ScrollToTop';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-bold">Authenticating...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check profile_completed status: if incomplete, redirect to appropriate setup page
  if (!user.profile_completed) {
    if (user.role === 'MENTOR' && window.location.pathname !== '/faculty/onboarding') {
      return <Navigate to="/faculty/onboarding" replace />;
    }
    if (user.role === 'STUDENT' && window.location.pathname !== '/register') {
      return <Navigate to="/register" replace />;
    }
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // 403 Forbidden redirect to user's dashboard
    if (user.role === 'STUDENT') return <Navigate to="/student/dashboard" replace />;
    if (user.role === 'MENTOR') return <Navigate to="/mentor/dashboard" replace />;
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <ModalProvider>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <ScrollToTop />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/faculty/onboarding"
                element={
                  <ProtectedRoute allowedRoles={['MENTOR']}>
                    <FacultyOnboarding />
                  </ProtectedRoute>
                }
              />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route
                path="/student/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mentor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['MENTOR']}>
                    <MentorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mentor/student-projects"
                element={
                  <ProtectedRoute allowedRoles={['MENTOR']}>
                    <StudentProjectsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/mentor/my-teams"
                element={
                  <ProtectedRoute allowedRoles={['MENTOR']}>
                    <MyCapstoneTeams />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/browse"
                element={
                  <ProtectedRoute>
                    <ProjectBrowse />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/create"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <ProjectCreation />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/my-projects"
                element={
                  <ProtectedRoute>
                    <MyProjects />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/faculty"
                element={
                  <ProtectedRoute>
                    <FacultyDirectory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/details/:projectId"
                element={
                  <ProtectedRoute>
                    <ProjectDetails />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <ProjectWorkspace />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/project/:projectId/*"
                element={
                  <ProtectedRoute>
                    <ProjectWorkspace />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Router>
        </SocketProvider>
      </AuthProvider>
    </ModalProvider>
  );
};

export default App;
