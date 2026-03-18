import React, { useEffect, useState } from 'react';
import { API_URL } from '../utils/apiConfig';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/formatDate';
import { useParams } from 'react-router-dom';
import MeetingPrepPrintLayout from '../components/MeetingPrepPrintLayout';
import SkeletonLoader from '../components/SkeletonLoader';

export default function PrintPrepPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiFetch } = useAuth();

  useEffect(() => {
    async function fetchPrep() {
      try {
        const res = await apiFetch(API_URL(`/api/meeting-preps/${id}`));
        if (!res.ok) throw new Error('Failed to fetch prep data');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Print page fetch error:", e);
        setError("تعذر تحميل بيانات التقرير.");
      } finally {
        setLoading(false);
      }
    }
    fetchPrep();
  }, [id]);

  useEffect(() => {
    if (data && !loading) {
      // Small timeout to ensure fonts and layout are fully painted before print
      const timer = setTimeout(() => {
        window.print();
        // Optional: window.close() after print dialog if preferred, but usually better to let user handle it
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [data, loading]);

  if (loading) return (
    <div className="p-20 bg-white min-h-screen text-center">
      <div className="animate-pulse text-2xl font-bold mb-10">جاري تحضير ملف الطباعة الاستراتيجي...</div>
      <SkeletonLoader type="client_detail" />
    </div>
  );

  if (error) return (
    <div className="p-20 bg-white min-h-screen text-center">
      <div className="text-red-500 text-2xl font-bold">{error}</div>
    </div>
  );

  return <MeetingPrepPrintLayout data={data} />;
}
