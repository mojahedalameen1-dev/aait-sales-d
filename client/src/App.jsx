import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ToastProvider';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ClientsList from './pages/ClientsList';
import ClientDetail from './pages/ClientDetail';
import AddEditClient from './pages/AddEditClient';
import MeetingPrepHub from './pages/MeetingPrepHub';
import PrintPrepPage from './pages/PrintPrepPage';
import Pipeline from './pages/Pipeline';
import TechnicalProposals from './pages/TechnicalProposals';
import GlobalTarget from './pages/GlobalTarget';
import Topbar from './components/Topbar';

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
      setMainPadding(window.innerWidth < 768 ? '16px' : '32px');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidth = isCollapsed ? '80px' : '280px';

  return (
    <ThemeProvider>
      <ToastProvider>
        <div id="app-layout-wrapper" style={{ display: 'flex', direction: 'rtl', minHeight: '100vh', background: 'var(--bg-main)' }}>
          <div className="print:hidden" id="app-shell-sidebar">
            <Sidebar
              isCollapsed={isCollapsed}
              setIsCollapsed={setIsCollapsed}
              isMobile={isMobile}
              isMobileOpen={isMobileOpen}
              setIsMobileOpen={setIsMobileOpen}
            />
          </div>
          <main
            className="main-content print:m-0 print:p-0 print:w-full flex-col flex"
            style={{
              marginRight: location.pathname.includes('/print') ? 0 : (isMobile ? 0 : sidebarWidth),
              flex: 1,
              width: isMobile ? '100%' : `calc(100% - ${sidebarWidth})`,
              minHeight: '100vh',
              transition: 'margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Topbar visible except on print pages */}
            {!location.pathname.includes('/print') && <Topbar isMobile={isMobile} setIsMobileOpen={setIsMobileOpen} />}

            <div style={{ padding: location.pathname.includes('/print') ? 0 : mainPadding, flex: 1 }}>
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
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
