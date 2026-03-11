const express = require('express');
const router = express.Router();
const supabase = require('../supabase');

// GET Global Dashboard Statistics
router.get('/stats', async (req, res) => {
    try {
        const { data: clientsRaw, error } = await supabase
            .from('clients')
            .select(`
                id, client_name, sector, created_at,
                deals!deals_client_id_fkey (expected_value, payment_percentage, stage, last_contact_date, next_followup_date),
                scores!scores_client_id_fkey (total_score)
            `);

        if (error) throw error;

        // Flatten data for the existing calculation logic
        const clients = clientsRaw.map(c => ({
            id: c.id,
            client_name: c.client_name,
            sector: c.sector,
            created_at: c.created_at,
            expected_value: c.deals?.[0]?.expected_value || 0,
            payment_percentage: c.deals?.[0]?.payment_percentage || 0.50,
            stage: c.deals?.[0]?.stage || 'جديد',
            last_contact_date: c.deals?.[0]?.last_contact_date || '',
            next_followup_date: c.deals?.[0]?.next_followup_date || '',
            total_score: c.scores?.[0]?.total_score || 0
        }));

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const todayStr = new Date().toISOString().split('T')[0];

        // Basic Metrics
        const totalClients = clients.length;
        const hotClientsCount = clients.filter(c => (c.total_score || 0) >= 80).length;

        // Active Deals Value
        const activeClients = clients.filter(c => c.stage && !['فاز', 'خسر'].includes(c.stage));
        const activeValue = activeClients.reduce((s, c) => s + (parseFloat(c.expected_value) || 0), 0);

        // Won Deals this month (Target Progress)
        const wonThisMonth = clients.filter(c => {
            if (c.stage !== 'فاز') return false;
            // using created_at/last_contact_date logic from current dashboard as approximation
            const dealDate = new Date(c.last_contact_date || c.created_at);
            return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
        });

        const targetProgress = wonThisMonth.reduce((s, c) => {
            const payPct = c.payment_percentage != null ? parseFloat(c.payment_percentage) : 0.50;
            return s + ((parseFloat(c.expected_value) || 0) * payPct);
        }, 0);

        // Weighted Active Value Forecast
        const weightedActiveValue = activeClients.reduce((s, c) => {
            const payPct = c.payment_percentage != null ? parseFloat(c.payment_percentage) : 0.50;
            const targetValue = (parseFloat(c.expected_value) || 0) * payPct;
            const probability = (c.total_score || 0) / 100;
            return s + (targetValue * probability);
        }, 0);

        // Top active deals to close (Recommendation Engine)
        const topActiveToClose = [...activeClients]
            .map(c => {
                const payPct = c.payment_percentage != null ? parseFloat(c.payment_percentage) : 0.50;
                const targetValue = (parseFloat(c.expected_value) || 0) * payPct;
                const probability = (c.total_score || 0) / 100;
                return { ...c, forecastValue: targetValue * probability, rawTargetValue: targetValue };
            })
            .sort((a, b) => b.forecastValue - a.forecastValue)
            .slice(0, 2);

        // Today's Followups
        const todayFollowups = clients.filter(c => {
            if (!c.next_followup_date) return false;
            return c.next_followup_date <= todayStr; // Includes overdue
        }).map(c => ({
            id: c.id,
            client_name: c.client_name,
            next_followup_date: c.next_followup_date,
            created_at: c.created_at
        }));

        // Top Hot Clients
        const topHotClients = [...clients]
            .sort((a, b) => (b.total_score || 0) - (a.total_score || 0))
            .slice(0, 5)
            .map(c => ({
                id: c.id,
                client_name: c.client_name,
                sector: c.sector,
                expected_value: c.expected_value,
                total_score: c.total_score
            }));

        // Today added value
        const todayAddedValue = clients.filter(c => c.created_at && c.created_at.startsWith(todayStr))
            .reduce((s, c) => s + (parseFloat(c.expected_value) || 0), 0);

        res.json({
            totalClients,
            hotClientsCount,
            activeValue,
            targetProgress,
            weightedActiveValue,
            topActiveToClose,
            todayFollowups,
            topHotClients,
            todayAddedValue
        });

    } catch (err) {
        console.error('Dashboard Auth/Stats Error:', err);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل إحصائيات لوحة التحكم' });
    }
});

module.exports = router;
