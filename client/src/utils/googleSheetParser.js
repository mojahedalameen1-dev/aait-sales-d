export const parseGoogleSheetHtml = (htmlString) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  // Find the first set of table rows. Usually Google Sheets published HTML has a single tbody with many trs.
  const rows = Array.from(doc.querySelectorAll('tbody tr'));
  
  if (!rows || rows.length === 0) {
    throw new Error('No data rows found in the provided HTML.');
  }

  // The first few rows might be empty or Google Sheet headers.
  // We need to find the actual header row containing our Arabic column names.
  let headerRowIndex = -1;
  let headers = [];

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const cells = Array.from(rows[i].querySelectorAll('td')).map(td => td.textContent.trim());
    if (cells.includes('م') && cells.includes('اسم العميل حسب العقد')) {
      headerRowIndex = i;
      headers = cells;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('Could not find the header row with the expected columns.');
  }

  const data = [];

  // Parse actual data rows
  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const cells = Array.from(rows[i].querySelectorAll('td')).map(td => td.textContent.trim());
    
    // Skip completely empty rows
    if (cells.every(cell => cell === '')) continue;

    const rowData = {};
    headers.forEach((header, index) => {
      // Clean up headers like replacing newlines to match reliably, or just use exact mapping as found
      if (header) {
        rowData[header] = cells[index] || '';
      }
    });

    // Clean up empty objects if they slipped through
    if (Object.keys(rowData).length > 0 && rowData['اسم العميل حسب العقد']) {
        // Business Logic for First Payment
        const netValueStr = rowData['صافي المبلغ'] || '0';
        const netValue = parseFloat(netValueStr.replace(/,/g, '')) || 0;
        
        let firstPaymentPercentage = 0.50; // Default 50%
        const notes = rowData['ملاحظات'] || '';
        
        // Extract percentage from notes like "75%" or "100%"
        const percentageMatch = notes.match(/(\d+)%/);
        if (percentageMatch && percentageMatch[1]) {
            firstPaymentPercentage = parseInt(percentageMatch[1], 10) / 100;
        }
        
        rowData['الدفعة الأولى المحتسبة'] = netValue * firstPaymentPercentage;

        // Parse numeric values to make charting/summing easier
        ['اجمالي مبلغ التعاقد', 'صافي المبلغ', 'ضريبة 15%', 'عمولة 6% الرياض'].forEach(col => {
             if (rowData[col]) {
                  rowData[col] = parseFloat(rowData[col].replace(/,/g, '')) || 0;
             } else {
                 rowData[col] = 0;
             }
        });

      data.push(rowData);
    }
  }

  return data;
};
