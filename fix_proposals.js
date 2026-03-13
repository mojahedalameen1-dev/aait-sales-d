const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'server', 'routes', 'proposals_fixed.js');
const target = path.join(__dirname, 'server', 'routes', 'proposals.js');

try {
    const data = fs.readFileSync(source);
    fs.writeFileSync(target, data);
    console.log('Successfully overwritten proposals.js');
    fs.unlinkSync(source);
    console.log('Deleted proposals_fixed.js');
} catch (err) {
    console.error('Error during file operation:', err.message);
    process.exit(1);
}
