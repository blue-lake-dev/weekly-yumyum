import 'dotenv/config';

const DUNE_API_KEY = process.env.VITE_DUNE_API_KEY;

if (!DUNE_API_KEY) {
  console.error('VITE_DUNE_API_KEY not found in .env');
  process.exit(1);
}

console.log('API Key found:', DUNE_API_KEY.substring(0, 8) + '...\n');

// Try executing a query to get fresh results
async function executeAndGetResults(queryId: number, name: string) {
  console.log(`\n--- ${name} (ID: ${queryId}) ---`);

  // First try to get latest results
  const latestResponse = await fetch(
    `https://api.dune.com/api/v1/query/${queryId}/results`,
    { headers: { 'x-dune-api-key': DUNE_API_KEY! } }
  );

  if (latestResponse.ok) {
    const data = await latestResponse.json();
    if (data.result?.rows?.length > 0) {
      console.log(`✅ Got cached results: ${data.result.rows.length} rows`);
      console.log('Columns:', Object.keys(data.result.rows[0]).join(', '));
      console.log('Sample:', JSON.stringify(data.result.rows[0], null, 2).substring(0, 400));
      return true;
    }
  }

  // Try executing the query
  console.log('No cached results, trying to execute...');
  const execResponse = await fetch(
    `https://api.dune.com/api/v1/query/${queryId}/execute`,
    {
      method: 'POST',
      headers: { 'x-dune-api-key': DUNE_API_KEY! }
    }
  );

  if (!execResponse.ok) {
    const err = await execResponse.text();
    console.log(`❌ Execute failed: ${err.substring(0, 200)}`);
    return false;
  }

  const execData = await execResponse.json();
  const executionId = execData.execution_id;
  console.log(`Execution started: ${executionId}`);

  // Poll for results (max 30 seconds)
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    console.log(`Checking status... (${(i + 1) * 5}s)`);

    const statusResponse = await fetch(
      `https://api.dune.com/api/v1/execution/${executionId}/results`,
      { headers: { 'x-dune-api-key': DUNE_API_KEY! } }
    );

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      if (statusData.state === 'QUERY_STATE_COMPLETED' && statusData.result?.rows) {
        console.log(`✅ Execution complete: ${statusData.result.rows.length} rows`);
        console.log('Columns:', Object.keys(statusData.result.rows[0]).join(', '));
        console.log('Sample:', JSON.stringify(statusData.result.rows[0], null, 2).substring(0, 400));
        return true;
      } else if (statusData.state === 'QUERY_STATE_FAILED') {
        console.log(`❌ Query failed: ${statusData.error}`);
        return false;
      }
    }
  }

  console.log('⏳ Query still running, skipping...');
  return false;
}

// Test various RWA-related queries
const queries = [
  // From my search results
  { id: 1971178, name: 'Maker RWA Collateral' },
  { id: 19894, name: 'Private Credit' },

  // Try some common dashboard queries
  { id: 2988582, name: 'Tokenized Treasuries Total' },
  { id: 3257657, name: 'RWA TVL Overview' },
  { id: 2636979, name: 'Ondo Finance TVL' },
];

async function main() {
  for (const q of queries) {
    await executeAndGetResults(q.id, q.name);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n--- Done ---');
}

main();
