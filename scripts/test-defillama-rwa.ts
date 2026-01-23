// Test DeFiLlama RWA data for ETH and L2s

async function fetchRWAData() {
  console.log('=== Fetching DeFiLlama RWA Protocols ===\n');

  // 1. Get all protocols
  const response = await fetch('https://api.llama.fi/protocols');
  const protocols = await response.json();

  // 2. Filter RWA category
  const rwaProtocols = protocols.filter((p: any) => p.category === 'RWA');

  console.log(`Total RWA protocols: ${rwaProtocols.length}\n`);

  // 3. Group by chain and calculate TVL
  const ethChains = ['Ethereum', 'Arbitrum', 'Optimism', 'Base', 'Polygon', 'zkSync Era', 'Linea', 'Scroll'];

  let totalRWA = 0;
  const byChain: Record<string, number> = {};
  const byProtocol: Array<{ name: string; tvl: number; chains: string[]; description: string }> = [];

  for (const protocol of rwaProtocols) {
    const chainTvls = protocol.chainTvls || {};

    // Sum TVL for ETH + L2s
    let protocolEthTvl = 0;
    for (const chain of ethChains) {
      if (chainTvls[chain]) {
        protocolEthTvl += chainTvls[chain];
        byChain[chain] = (byChain[chain] || 0) + chainTvls[chain];
      }
    }

    if (protocolEthTvl > 0) {
      totalRWA += protocolEthTvl;
      byProtocol.push({
        name: protocol.name,
        tvl: protocolEthTvl,
        chains: protocol.chains?.filter((c: string) => ethChains.includes(c)) || [],
        description: protocol.description?.substring(0, 100) || ''
      });
    }
  }

  // Sort by TVL
  byProtocol.sort((a, b) => b.tvl - a.tvl);

  // 4. Print results
  console.log('=== RWA on ETH + L2s ===\n');
  console.log(`TOTAL RWA TVL: $${(totalRWA / 1e9).toFixed(2)}B\n`);

  console.log('--- By Chain ---');
  Object.entries(byChain)
    .sort((a, b) => b[1] - a[1])
    .forEach(([chain, tvl]) => {
      console.log(`  ${chain}: $${(tvl / 1e9).toFixed(3)}B`);
    });

  console.log('\n--- Top 20 RWA Protocols (ETH + L2) ---');
  byProtocol.slice(0, 20).forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}: $${(p.tvl / 1e6).toFixed(1)}M`);
    console.log(`   Chains: ${p.chains.join(', ')}`);
    console.log(`   ${p.description}...`);
    console.log('');
  });

  // 5. Try to categorize by asset type (manual mapping)
  console.log('\n=== Categorization Attempt ===\n');

  const categories = {
    'Treasuries/Bonds': ['Ondo', 'Ondo Finance', 'BlackRock', 'Franklin Templeton', 'OpenEden', 'Backed', 'Matrixdock', 'Hashnote'],
    'Gold': ['Paxos Gold', 'Tether Gold', 'PAXG', 'XAUT'],
    'Stocks/Equities': ['Backed', 'Swarm'],
    'Real Estate': ['RealT', 'Tangible'],
    'Private Credit': ['Centrifuge', 'Maple', 'Goldfinch', 'Credix'],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    const matching = byProtocol.filter(p =>
      keywords.some(k => p.name.toLowerCase().includes(k.toLowerCase()))
    );
    const categoryTvl = matching.reduce((sum, p) => sum + p.tvl, 0);
    console.log(`${category}: $${(categoryTvl / 1e6).toFixed(1)}M`);
    matching.forEach(p => console.log(`  - ${p.name}: $${(p.tvl / 1e6).toFixed(1)}M`));
    console.log('');
  }
}

fetchRWAData().catch(console.error);
