import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ToastProvider';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

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
  const [isCollapsed, setIsCollapsed] = React.useState(window.innerWidth < 1200);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);
  const [mainPadding, setMainPadding] = React.useState(window.innerWidth < 768 ? '16px' : '32px');

  // Auto-collapse and padding reactivity on resize
  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
      // We will handle padding mostly via tailwind classes now, but keep state for specific overrides if needed
      setMainPadding(window.innerWidth < 768 ? '16px' : '32px');
    };
    // initial check
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = isCollapsed ? '80px' : '280px';
  const isPrint = location.pathname.includes('/print');

  return (
    <ThemeProvider>
      <ToastProvider>
        <div id="app-layout-wrapper" className="flex flex-col lg:flex-row min-h-screen bg-[var(--bg-main)] text-slate-800 dark:text-slate-200" style={{ direction: 'rtl', fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
          
          {/* Sidebar Area */}
          {!isPrint && (
            <div className="print:hidden z-50">
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
              // Apply margin on desktop matching sidebar width so content doesn't slip under it
              marginRight: isPrint ? 0 : (isMobile ? 0 : sidebarWidth)
            }}
          >
            {/* Topbar visible except on print pages */}
            {!isPrint && <Topbar isMobile={isMobile} setIsMobileOpen={setIsMobileOpen} />}

            {/* Dynamic Padding Container */}
            <div className={`flex-1 ${isPrint ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>
              <React.Suspense fallback={
                <div className="flex items-center justify-center h-screen">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }>
                <AnimatePresence mode="wait">
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<PageWrapper><Dashboard /></PageWrapper>} />
                    <Route path="/pipeline" element={<PageWrapper><Pipeline /></PageWrapper>} />
                    <Route path="/proposals" element={<PageWrapper><TechnicalProposals /></PageWrapper>} />
                    <Route path="/global-target" element={<PageWrapper><GlobalTarget /></PageWrapper>} />
                    <Route path="/meeting-preps" element={<PageWrapper><MeetingPrepHub /></PageWrapper>} />
                    <Route path="/meeting-preps/:id/print" element={<PrintPrepPage />} />
                    <Route path="/clients" element={<PageWrapper><ClientsList /></PageWrapper>} />
                    <Route path="/hot-clients" element={<PageWrapper><ClientsList filter="hot" /></PageWrapper>} />
                    <Route path="/follow-ups" element={<PageWrapper><ClientsList filter="followup" /></PageWrapper>} />
                    <Route path="/clients/new" element={<PageWrapper><AddEditClient /></PageWrapper>} />
                    <Route path="/clients/:id" element={<PageWrapper><ClientDetail /></PageWrapper>} />
                    <Route path="/clients/:id/edit" element={<PageWrapper><AddEditClient /></PageWrapper>} />
                    <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
                  </Routes>
                </AnimatePresence>
              </React.Suspense>
            </div>
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
