import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SkeletonLoader from '../components/SkeletonLoader';
import BusinessDeveloperDashboard from './BusinessDeveloperDashboard';

export default function Dashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, navigate]);

  if (authLoading) {
    return <SkeletonLoader type="dashboard" />;
  }

  if (isAdmin) {
    return null; // Navigation will handle it or AdminDashboard would be here if not redirecting
  }

  return <BusinessDeveloperDashboard />;
}
