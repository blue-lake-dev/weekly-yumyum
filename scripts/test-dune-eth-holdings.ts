import 'dotenv/config';

const DUNE_API_KEY = process.env.VITE_DUNE_API_KEY;

// More query IDs to test - from various dashboards
const queries = [
  // ETH ETF - WORKS!
  { id: 3944634, name: 'ETH ETF Overview (hildobby)' },

  // From springzhang whale tracking dashboard
  { id: 1681741, name: 'ETH Whales (springzhang)' },

  // Try hildobby's other queries (he has comprehensive ETH data)
  { id: 3944641, name: 'ETH ETF Flows (hildobby)' },
  { id: 3944648, name: 'ETH ETF Daily (hildobby)' },

  // Ethereum Foundation related
  { id: 892941, name: 'Ethereum Foundation Wallet' },
  { id: 3467891, name: 'EF Treasury' },

  // Corporate treasuries / DAT
  { id: 4125678, name: 'Corporate ETH Holdings' },
  { id: 3891234, name: 'Digital Asset Treasuries' },

  // General ETH distribution
  { id: 1559347, name: 'ETH Supply Distribution' },
  { id: 2847391, name: 'ETH Holder Distribution' },
];

async function testQuery(queryId: number, name: string) {
  console.log(`\n--- ${name} (ID: ${queryId}) ---`);

  const response = await fetch(
    `https://api.dune.com/api/v1/query/${queryId}/results?limit=10`,
    {
      headers: { 'x-dune-api-key': DUNE_API_KEY! }
    }
  );

  const data = await response.json();

  if (data.error) {
    console.log(`❌ ${data.error.substring(0, 80)}`);
    return null;
  }

  if (data.result?.rows?.length > 0) {
    console.log(`✅ ${data.result.rows.length} rows`);
    console.log('Columns:', Object.keys(data.result.rows[0]).slice(0, 8).join(', '));

    // Pretty print first row
    const firstRow = data.result.rows[0];
    console.log('Sample:', JSON.stringify(firstRow, null, 2).substring(0, 400));
    return data;
  }

  console.log('No rows');
  return null;
}

async function main() {
  console.log('=== Testing Dune Queries for ETH Holdings ===\n');

  const working: string[] = [];

  for (const q of queries) {
    const result = await testQuery(q.id, q.name);
    if (result) working.push(`${q.name} (${q.id})`);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log('\n\n=== WORKING QUERIES ===');
  working.forEach(q => console.log(`✅ ${q}`));
}

main().catch(console.error);
