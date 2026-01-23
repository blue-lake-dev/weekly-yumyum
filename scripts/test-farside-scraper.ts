import puppeteer from 'puppeteer';

async function scrapeFarsideETH() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('Navigating to Farside ETH ETF page...');
    await page.goto('https://farside.co.uk/eth/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit more for dynamic content
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('Page loaded, analyzing structure...');

    // Get all tables and their classes
    const tableInfo = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const info: string[] = [];

      tables.forEach((table, i) => {
        info.push(`Table ${i}: class="${table.className}", rows=${table.querySelectorAll('tr').length}`);

        // Get first row content
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          const cells = firstRow.querySelectorAll('th, td');
          const cellTexts = Array.from(cells).map(c => c.textContent?.trim().substring(0, 20));
          info.push(`  Headers: ${cellTexts.join(' | ')}`);
        }
      });

      return info;
    });

    console.log('\nTable analysis:');
    tableInfo.forEach(line => console.log(line));

    // Try to get the main data table
    const data = await page.evaluate(() => {
      // Look for a table with ETF data - usually has dates and numbers
      const tables = document.querySelectorAll('table');

      for (const table of tables) {
        const rows = table.querySelectorAll('tr');
        if (rows.length > 5) { // Main data table should have many rows
          const headers: string[] = [];
          const dataRows: string[][] = [];

          rows.forEach((row, i) => {
            const cells = row.querySelectorAll('th, td');
            const cellValues = Array.from(cells).map(c => c.textContent?.trim() || '');

            if (i === 0 || i === 1) {
              // Could be header
              if (cellValues.some(v => v.includes('ETHA') || v.includes('FETH') || v.includes('Date'))) {
                headers.push(...cellValues);
              }
            }

            // Data row - check if first cell looks like a date
            if (cellValues[0] && /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(cellValues[0])) {
              dataRows.push(cellValues);
            }
          });

          if (dataRows.length > 0) {
            return { headers, rows: dataRows.slice(0, 7) }; // Last 7 days
          }
        }
      }

      return null;
    });

    if (data) {
      console.log('\n✅ Found ETF data table!');
      console.log('Headers:', data.headers);
      console.log('\nRecent data:');
      data.rows.forEach(row => {
        console.log(row.slice(0, 6).join(' | ')); // First 6 columns
      });
    } else {
      console.log('\n❌ Could not find ETF data table');

      // Get page HTML snippet for debugging
      const bodyText = await page.evaluate(() => {
        return document.body?.innerText?.substring(0, 1000) || 'No body text';
      });
      console.log('\nPage text preview:\n', bodyText);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

scrapeFarsideETH();
