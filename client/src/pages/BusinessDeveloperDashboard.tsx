import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { fetchExcelStats, ExcelStats } from '../utils/excelData';
import PacingHeader from './bd/PacingHeader';
import GoldenTargetCard from './bd/GoldenTargetCard';
import HistoricalComparison from './bd/HistoricalComparison';
import VitalNumbers from './bd/VitalNumbers';
import IntelligenceEngine from './bd/IntelligenceEngine';
import ActionCenter from './bd/ActionCenter';
import RecentSales from './bd/RecentSales';
import SkeletonLoader from '../components/SkeletonLoader';
import { API_URL } from '../utils/apiConfig';
import SlackMentionsBox from '../components/SlackMentionsBox';

export default function BusinessDeveloperDashboard() {
    const { user, apiFetch } = useAuth();
    const [neonStats, setNeonStats] = useState<any>(null);
    const [excelStats, setExcelStats] = useState<ExcelStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                const [nRes, eStats] = await Promise.all([
                    apiFetch(API_URL('/api/dashboard/stats')).then(r => r.json()),
                    fetchExcelStats(user?.fullName || user?.username || '')
                ]);
                setNeonStats(nRes);
                setExcelStats(eStats);
            } catch (err) {
                console.error('Error loading BD dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [user, apiFetch]);

    if (loading || !neonStats || !excelStats) {
        return <SkeletonLoader type="dashboard" />;
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex flex-col gap-8 pb-10 direction-rtl"
        >
            {/* 1. Welcome & Pacing Alert */}
            <PacingHeader 
                userName={user?.fullName || user?.username || ''} 
                excelActual={excelStats.currentMonth?.actual || 0}
                excelTarget={excelStats.currentMonth?.target || 115000}
            />

            {/* 2. Golden Target Card */}
            <GoldenTargetCard 
                actual={excelStats.currentMonth?.actual || 0}
                target={excelStats.currentMonth?.target || 115000}
            />

            {/* 3. Historical Comparison Bar */}
            <HistoricalComparison 
                ytdActual={excelStats.ytdActual}
                currentMonthActual={excelStats.currentMonth?.actual || 0}
                previousMonthActual={excelStats.previousMonth?.actual || 0}
                previousMonthName={excelStats.previousMonth?.name || ''}
            />

            {/* 4. إحصائيات الأداء الحيوية (خالية من القيم الصفرية) */}
            <VitalNumbers 
                monthActual={excelStats.currentMonth?.actual || 0}
                achievementRatio={excelStats.currentMonth?.ratio || 0}
                ytdActual={excelStats.ytdActual || 0}
                bestMonthGap={Math.max(0, (excelStats.bestMonth?.actual || 0) - (excelStats.currentMonth?.actual || 0))}
            />

            {/* Slack Mentions Inbox for Business Developers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <ActionCenter 
                        followups={neonStats.todayFollowups || []}
                        topDeals={neonStats.topDeals || []}
                        stats={excelStats}
                    />
                </div>
                <div className="lg:col-span-1">
                    <SlackMentionsBox />
                </div>
            </div>

            {/* 6. تحليل الأداء الذكي */}
            <IntelligenceEngine 
                stats={excelStats}
                neonStats={neonStats}
            />

            {/* 7. مبيعات المطور للشهر الحالي */}
            <RecentSales 
                sales={excelStats.currentMonth?.rows || []} 
                developerName={user?.fullName || user?.username || ''}
                monthName={excelStats.currentMonth?.name || ''}
            />
        </motion.div>
    );
}
