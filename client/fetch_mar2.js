const https = require('https');
const url = 'https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vThOI_pq9C9-AVOqH7vVkNhoe834Op3bMkUnvmF1A7w7AYcy_COHveU-do-wbECug/pubhtml/sheet?pli=1&headers=false&gid=843831458';

https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        const tableRegex = /<table[^>]*>.*?<\/table>/is;
        const tableMatch = data.match(tableRegex);
        if (!tableMatch) return console.log('No table found');
        const tableHtml = tableMatch[0];
        const rowRegex = /<tr[^>]*>.*?<\/tr>/isg;
        const rows = tableHtml.match(rowRegex) || [];

        const parsed = rows.map(r => {
            const tdRegex = /<td[^>]*>(.*?)<\/td>/isg;
            const cells = [];
            let match;
            while ((match = tdRegex.exec(r)) !== null) cells.push(match[1].replace(/<[^>]*>/g, '').trim());
            return cells;
        }).filter(c => c.length > 5);

        console.log(JSON.stringify(parsed.slice(0, 15), null, 2));
    });
});
