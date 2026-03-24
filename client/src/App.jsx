import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Lazy load pages
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ClientsList = React.lazy(() => import('./pages/ClientsList'));
const ClientDetail = React.lazy(() => import('./pages/ClientDetail'));
const AddEditClient = React.lazy(() => import('./pages/AddEditClient'));
const MeetingPrepHub = React.lazy(() => import('./pages/MeetingPrepHub'));
const PrintPrepPage = React.lazy(() => import('./pages/PrintPrepPage'));
const Pipeline = React.lazy(() => import('./pages/Pipeline'));
const TechnicalProposals = React.lazy(() => import('./pages/TechnicalProposals'));
const GlobalTarget = React.lazy(() => import('./pages/GlobalTarget'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const DeveloperDetail = React.lazy(() => import('./pages/DeveloperDetail'));
const TeamManagement = React.lazy(() => import('./pages/TeamManagement'));
const AdminSettings = React.lazy(() => import('./pages/AdminSettings'));
const Profile = React.lazy(() => import('./pages/Profile'));

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
);

export default function App() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(window.innerWidth < 1200);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isPrint = location.pathname.includes('/print');
  const isLoginPage = location.pathname === '/login';

  // If not logged in and not loading, and not already on the login page or a public path
  // Show full-screen login for any protected path to preserve the URL
  if (!user && !loading && !isLoginPage) {
    return (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    );
  }

  const sidebarWidth = isCollapsed ? '80px' : '280px';

  return (
    <div id="app-wrapper" className="min-h-screen bg-[var(--bg-main)]">
      {isLoginPage ? (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      ) : (
        <div id="app-layout-wrapper" className="flex flex-col lg:flex-row min-h-screen text-slate-800 dark:text-slate-200" style={{ direction: 'rtl', fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          
          {/* Sidebar Area */}
          {!isPrint && (
            <div className="print:hidden z-[110]">
              <Sidebar
                isCollapsed={isCollapsed}
                setIsCollapsed={setIsCollapsed}
                isMobile={isMobile}
                isMobileOpen={isMobileOpen}
                setIsMobileOpen={setIsMobileOpen}
              />
            </div>
          )}

          {/* Main Content Area */}
          <main
            className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isPrint ? 'm-0 p-0 w-full' : ''}`}
            style={{
              marginRight: isPrint ? 0 : (isMobile ? 0 : sidebarWidth)
            }}
          >
            {/* Topbar visible except on print pages */}
            {!isPrint && <Topbar isMobile={isMobile} setIsMobileOpen={setIsMobileOpen} />}

            {/* Dynamic Padding Container */}
            <div className={`flex-1 ${isPrint ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
              <div className={`${isPrint ? '' : 'max-w-[1600px] mx-auto w-full'}`}>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                }>
                  <AnimatePresence mode="wait">
                    <Routes location={location} key={location.pathname}>
                      <Route path="/" element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>} />
                      <Route path="/pipeline" element={<ProtectedRoute><PageWrapper><Pipeline /></PageWrapper></ProtectedRoute>} />
                      <Route path="/proposals" element={<ProtectedRoute><PageWrapper><TechnicalProposals /></PageWrapper></ProtectedRoute>} />
                      <Route path="/global-target" element={<ProtectedRoute><PageWrapper><GlobalTarget /></PageWrapper></ProtectedRoute>} />
                      <Route path="/meeting-preps" element={<ProtectedRoute><PageWrapper><MeetingPrepHub /></PageWrapper></ProtectedRoute>} />
                      <Route path="/meeting-preps/:id/print" element={<ProtectedRoute><PrintPrepPage /></ProtectedRoute>} />
                      <Route path="/clients" element={<ProtectedRoute><PageWrapper><ClientsList /></PageWrapper></ProtectedRoute>} />
                      <Route path="/hot-clients" element={<ProtectedRoute><PageWrapper><ClientsList filter="hot" /></PageWrapper></ProtectedRoute>} />
                      <Route path="/follow-ups" element={<ProtectedRoute><PageWrapper><ClientsList filter="followup" /></PageWrapper></ProtectedRoute>} />
                      <Route path="/clients/new" element={<ProtectedRoute><PageWrapper><AddEditClient /></PageWrapper></ProtectedRoute>} />
                      <Route path="/clients/:id" element={<ProtectedRoute><PageWrapper><ClientDetail /></PageWrapper></ProtectedRoute>} />
                      <Route path="/clients/:id/edit" element={<ProtectedRoute><PageWrapper><AddEditClient /></PageWrapper></ProtectedRoute>} />
                      
                      {/* Admin Routes */}
                      <Route path="/admin" element={<ProtectedRoute adminOnly={true}><PageWrapper><AdminDashboard /></PageWrapper></ProtectedRoute>} />
                      <Route path="/admin/team" element={<ProtectedRoute adminOnly={true}><PageWrapper><TeamManagement /></PageWrapper></ProtectedRoute>} />
                      <Route path="/admin/settings" element={<ProtectedRoute adminOnly={true}><PageWrapper><AdminSettings /></PageWrapper></ProtectedRoute>} />
                      <Route path="/admin/developer/:id" element={<ProtectedRoute adminOnly={true}><PageWrapper><DeveloperDetail /></PageWrapper></ProtectedRoute>} />
                      <Route path="/profile" element={<ProtectedRoute><PageWrapper><Profile /></PageWrapper></ProtectedRoute>} />
                      
                      <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
                    </Routes>
                  </AnimatePresence>
                </Suspense>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
