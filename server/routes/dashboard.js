const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateJWT } = require('../middleware/auth');

// Apply auth to all routes
router.use(authenticateJWT);

// GET Global Dashboard Statistics
router.get('/stats', async (req, res) => {
    try {
        const isAdmin = req.user.isAdmin;
        const userId = req.user.id;

        let query = `
            SELECT 
                c.id, c.client_name, c.sector, c.created_at,
                d.expected_value, d.payment_percentage, d.stage, d.last_contact_date, d.next_followup_date,
                s.total_score
            FROM clients c
            LEFT JOIN deals d ON c.id = d.client_id
            LEFT JOIN scores s ON c.id = s.client_id
        `;
        let params = [];

        if (!isAdmin) {
            query += ' WHERE c.user_id = $1';
            params.push(userId);
        }

        const result = await db.query(query, params);
        const clients = result.rows;

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

        // Top active deals to close
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
            return c.next_followup_date <= todayStr;
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
        // Note: created_at in DB is timestamptz, need to handle it correctly
        const todayAddedValue = clients.filter(c => {
            if (!c.created_at) return false;
            const dStr = new Date(c.created_at).toISOString().split('T')[0];
            return dStr === todayStr;
        }).reduce((s, c) => s + (parseFloat(c.expected_value) || 0), 0);

        // Granular Counts for BD Dashboard
        const activeDealsCount = activeClients.length;
        const closingBoardCount = clients.filter(c => c.stage === 'تفاوض').length;
        
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
        const monthClientsCount = clients.filter(c => {
            if (!c.created_at) return false;
            return new Date(c.created_at).toISOString().split('T')[0] >= firstDayOfMonth;
        }).length;

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        const coldDealsCount = activeClients.filter(c => {
            const lastContact = c.last_contact_date || c.created_at;
            if (!lastContact) return true;
            return new Date(lastContact).toISOString().split('T')[0] < sevenDaysAgoStr;
        }).length;

        res.json({
            totalClients,
            hotClientsCount,
            activeValue,
            targetProgress,
            weightedActiveValue,
            topActiveToClose,
            todayFollowups,
            topHotClients,
            todayAddedValue,
            activeDealsCount,
            closingBoardCount,
            monthClientsCount,
            coldDealsCount
        });

    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل إحصائيات لوحة التحكم' });
    }
});

module.exports = router;
