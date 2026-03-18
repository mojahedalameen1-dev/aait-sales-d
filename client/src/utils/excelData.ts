const MAIN_PUB_URL = 'https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vThOI_pq9C9-AVOqH7vVkNhoe834Op3bMkUnvmF1A7w7AYcy_COHveU-do-wbECug/pubhtml';
const INDIVIDUAL_TARGET = 115000;

export interface MonthData {
    name: string;
    gid: string;
    actual: number;
    target: number;
    ratio: number;
    isCurrent: boolean;
    rows: any[];
}

export interface ExcelStats {
    currentMonth: MonthData | null;
    previousMonth: MonthData | null;
    ytdActual: number;
    bestMonth: MonthData | null;
    consistencyScore: number;
    forecast: number;
    avgMonthlyActual: number;
}

const normalizeArabic = (text: string) => {
    if (!text) return '';
    return text
        .replace(/[أإآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[\u064B-\u065F]/g, '')
        .trim()
        .toLowerCase();
};

export async function fetchExcelStats(userName: string): Promise<ExcelStats> {
    try {
        const res = await fetch(MAIN_PUB_URL);
        const html = await res.text();
        
        const tabs: { name: string; gid: string }[] = [];
        const regex = /\{name:\s*"([^"]+)",\s*pageUrl:\s*"[^"]+",\s*gid:\s*"(\d+)"/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            const tabName = match[1].trim();
            if (!['تقرير', 'ملخص', 'عمولات', 'المستهدف'].some(word => tabName.includes(word))) {
                tabs.push({ name: tabName, gid: match[2] });
            }
        }

        if (tabs.length === 0) throw new Error('No data tabs found');

        const userNameNorm = normalizeArabic(userName);
        const userFirstNameNorm = normalizeArabic(userName.split(' ')[0]);

        // Process all tabs in parallel
        const allMonthsData: MonthData[] = await Promise.all(tabs.map(async (tab, i) => {
            const sheetUrl = `${MAIN_PUB_URL}/sheet?pli=1&headers=false&gid=${tab.gid}`;
            const sheetRes = await fetch(sheetUrl);
            const sheetHtml = await sheetRes.text();
            
            const doc = new DOMParser().parseFromString(sheetHtml, 'text/html');
            const rows = Array.from(doc.querySelectorAll('tbody tr'));
            
            const getCellText = (td: any) => td?.textContent?.trim() || '';
            
            let headerIdx = -1, headers: string[] = [];
            for (let j = 0; j < Math.min(rows.length, 30); j++) {
                const cells = Array.from(rows[j].querySelectorAll('td')).map(getCellText);
                if (cells.includes('م') && (cells.some(c => c.includes('العميل')) || cells.some(c => c.includes('مطور')))) {
                    headerIdx = j; headers = cells; break;
                }
            }

            let monthActual = 0;
            const parsedRows: any[] = [];

            if (headerIdx !== -1) {
                const salesCol = headers.findIndex(h => h.includes('مطور اعمال') || h.includes('المبيعات'));
                const amountCol = headers.findIndex(h => h.includes('المبلغ') || h.includes('الدفع الاولى'));
                
                if (salesCol !== -1 && amountCol !== -1) {
                    for (let j = headerIdx + 1; j < rows.length; j++) {
                        const cells = Array.from(rows[j].querySelectorAll('td')).map(getCellText);
                        if (!cells[salesCol]) continue;
                        
                        const rowSalesNorm = normalizeArabic(cells[salesCol]);
                        if (rowSalesNorm.includes(userNameNorm) || rowSalesNorm.includes(userFirstNameNorm)) {
                            const amt = parseFloat((cells[amountCol] || '0').replace(/[^\d.-]/g, '')) || 0;
                            monthActual += amt;
                            parsedRows.push({
                                amount: amt,
                                client: cells[headers.findIndex(h => h.includes('العميل'))] || '',
                                date: cells[headers.findIndex(h => h.includes('التاريخ') || h.includes('تاريخ'))] || ''
                            });
                        }
                    }
                }
            }

            return {
                name: tab.name,
                gid: tab.gid,
                actual: monthActual,
                target: INDIVIDUAL_TARGET,
                ratio: monthActual / INDIVIDUAL_TARGET,
                isCurrent: i === tabs.length - 1,
                rows: parsedRows
            };
        }));

        const currentMonth = allMonthsData[allMonthsData.length - 1];
        const previousMonth = allMonthsData.length > 1 ? allMonthsData[allMonthsData.length - 2] : null;
        const ytdActual = allMonthsData.reduce((sum, m) => sum + m.actual, 0);
        const bestMonth = [...allMonthsData].sort((a, b) => b.ratio - a.ratio)[0];
        const consistencyScore = allMonthsData.filter(m => m.ratio >= 0.8).length;

        // Forecast Logic
        // متوسط المحقق الشهري = إجمالي المحقق 2026 ÷ عدد الأشهر الكاملة الماضية
        const fullPastMonths = allMonthsData.filter(m => !m.isCurrent);
        const avgMonthlyActual = fullPastMonths.length > 0 
            ? fullPastMonths.reduce((sum, m) => sum + m.actual, 0) / fullPastMonths.length 
            : currentMonth.actual;

        // المتوقع لنهاية الشهر = المحقق حتى الآن + (متوسط أسبوعي × أسابيع متبقية)
        const today = new Date();
        const daysElapsed = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const weeksRemaining = (daysInMonth - daysElapsed) / 7;
        const weeklyAvg = currentMonth.actual / (daysElapsed / 7);
        const forecast = currentMonth.actual + (weeklyAvg * weeksRemaining);

        return {
            currentMonth: currentMonth || null,
            previousMonth: previousMonth || null,
            ytdActual,
            bestMonth: bestMonth || null,
            consistencyScore,
            forecast,
            avgMonthlyActual
        };
    } catch (err) {
        console.error('Error fetching excel stats:', err);
        return {
            currentMonth: null,
            previousMonth: null,
            ytdActual: 0,
            bestMonth: null,
            consistencyScore: 0,
            forecast: 0,
            avgMonthlyActual: 0
        };
    }
}
