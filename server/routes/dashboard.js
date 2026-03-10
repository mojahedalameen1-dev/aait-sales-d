const express = require('express');
const router = express.Router();
const db = require('../database');

// GET Global Dashboard Statistics
router.get('/stats', (req, res) => {
    try {
        const clients = db.prepare(`
      SELECT 
        c.id, c.client_name, c.sector, c.created_at,
        d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
        s.total_score
      FROM clients c
      LEFT JOIN deals d ON d.client_id = c.id
      LEFT JOIN scores s ON s.client_id = c.id
    `).all();

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
