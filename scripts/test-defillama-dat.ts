// Test DeFiLlama Digital Asset Treasuries API

async function fetchDATData() {
  console.log('=== Fetching DeFiLlama Digital Asset Treasuries ===\n');

  const response = await fetch('https://api.llama.fi/treasuries');
  const treasuries = await response.json();

  console.log(`Total treasuries: ${treasuries.length}\n`);

  // Filter for ETH-holding treasuries (check tokenBreakdowns.majors or chain)
  const ethTreasuries = treasuries
    .filter((t: any) => {
      // Has ETH holdings (majors typically = ETH + BTC)
      const hasMajors = t.tokenBreakdowns?.majors > 0;
      const isEthChain = t.chains?.includes('Ethereum');
      return hasMajors && isEthChain;
    })
    .map((t: any) => ({
      name: t.name.replace(' (treasury)', ''),
      tvl: t.tvl,
      majors: t.tokenBreakdowns?.majors || 0,
      stablecoins: t.tokenBreakdowns?.stablecoins || 0,
      ownTokens: t.tokenBreakdowns?.ownTokens || 0,
      description: t.description?.substring(0, 80) || '',
    }))
    .sort((a: any, b: any) => b.majors - a.majors);

  console.log('=== ETH/BTC Holding Treasuries (Top 20) ===\n');

  let totalMajors = 0;
  ethTreasuries.slice(0, 20).forEach((t: any, i: number) => {
    totalMajors += t.majors;
    console.log(`${i + 1}. ${t.name}`);
    console.log(`   Majors (ETH/BTC): $${(t.majors / 1e6).toFixed(1)}M`);
    console.log(`   Total TVL: $${(t.tvl / 1e6).toFixed(1)}M`);
    console.log(`   ${t.description}...`);
    console.log('');
  });

  console.log(`\n=== TOTAL Majors (ETH/BTC) in Top 20: $${(totalMajors / 1e9).toFixed(2)}B ===`);

  // Now let's check if we can get ETH-specific data
  console.log('\n\n=== Checking for ETH-specific breakdown ===\n');

  // Get a specific treasury detail
  const golemDetail = await fetch('https://api.llama.fi/treasury/golem-network').then(r => r.json()).catch(() => null);
  console.log('Golem Treasury Detail:', JSON.stringify(golemDetail, null, 2)?.substring(0, 500) || 'Not found');
}

fetchDATData().catch(console.error);
