const fs = require('fs');
const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function run() {
    const html = await fetchUrl('https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vThOI_pq9C9-AVOqH7vVkNhoe834Op3bMkUnvmF1A7w7AYcy_COHveU-do-wbECug/pubhtml/sheet?pli=1&headers=false&gid=843831458');
    fs.writeFileSync('mar.html', html);
    console.log('Done downloading mar.html');
}

run();
