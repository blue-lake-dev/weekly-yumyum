"use client";

import { useEffect, useState, useCallback } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { Header, SectionHeader, DataTable, ActionButtons } from "@/components";
import { formatCurrency, formatPercent, formatCompact, formatNumber, formatRatio } from "@/lib/utils";
import { getStoredData, saveStoredData } from "@/lib/client-storage";
import type { DashboardData } from "@/lib/types";

// Source URLs for manual input fields
const SOURCE_URLS = {
  btc_etf: "https://defillama.com/etfs",
  eth_etf: "https://defillama.com/etfs/ethereum",
  cex_flow_btc: "https://www.coinglass.com/spot-inflow-outflow",
  cex_flow_eth: "https://www.coinglass.com/spot-inflow-outflow",
  miner_breakeven: "https://en.macromicro.me/macro",
  btc_oi: "https://www.coinglass.com/open-interest/BTC",
  long_short_ratio: "https://www.coinglass.com/LongShortRatio",
  funding_rate: "https://www.coinglass.com/FundingRate",
  // Macro manual fields
  cpi: "https://www.investing.com/economic-calendar/cpi-733",
  ppi: "https://www.investing.com/economic-calendar/ppi-734",
  nfp: "https://www.investing.com/economic-calendar/nonfarm-payrolls-227",
  unemployment: "https://www.investing.com/economic-calendar/unemployment-rate-300",
  sofr: "https://www.newyorkfed.org/markets/reference-rates/sofr",
  fedwatch: "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html",
};

function buildRows(data: DashboardData) {
  const cryptoMarketRows = [
    {
      label: "BTC Price",
      ...data.crypto_market.btc_price,
      format: "currency" as const,
    },
    {
      label: "ETH Price",
      ...data.crypto_market.eth_price,
      format: "currency" as const,
    },
    {
      label: "BTC Dominance",
      ...data.crypto_market.btc_dominance,
      format: "percent" as const,
      previousFieldPath: "crypto_market.btc_dominance.previous",
    },
    {
      label: "BTC/Gold Ratio",
      ...data.crypto_market.btc_gold_ratio,
      format: "number" as const,
    },
    {
      label: "ETH/BTC",
      ...data.crypto_market.eth_btc_ratio,
      format: "ratio" as const,
    },
    {
      label: "Fear & Greed",
      ...data.crypto_market.fear_greed,
      format: "number" as const,
    },
    {
      label: "MVRV",
      ...data.crypto_market.mvrv,
      format: "number" as const,
      sourceUrl: "https://www.coinglass.com/pro/i/mvrv-ratio",
      fieldPath: "crypto_market.mvrv",
      previousFieldPath: "crypto_market.mvrv.previous",
    },
    {
      label: "Realized Vol 7D",
      ...data.crypto_market.vol_7d,
      format: "percent" as const,
    },
    {
      label: "Realized Vol 30D",
      ...data.crypto_market.vol_30d,
      format: "percent" as const,
    },
    { label: "MSTR", ...data.crypto_market.mstr, format: "currency" as const },
    { label: "BMNR", ...data.crypto_market.bmnr, format: "currency" as const },
    {
      label: "CME Gap",
      ...data.crypto_market.cme_gap,
      format: "currency" as const,
    },
  ];

  const lendingRows =
    data.fund_flow.defi_top_protocols?.map((p) => ({
      label: `┗ ${p.name}`,
      ...p.borrow,
      format: "compact" as const,
    })) || [];

  const fundFlowRows = [
    {
      label: "BTC ETF Net Inflow",
      ...data.fund_flow.btc_etf_flow,
      format: "compact" as const,
      sourceUrl: SOURCE_URLS.btc_etf,
      fieldPath: "fund_flow.btc_etf_flow",
      previousFieldPath: "fund_flow.btc_etf_flow.previous",
    },
    {
      label: "ETH ETF Net Inflow",
      ...data.fund_flow.eth_etf_flow,
      format: "compact" as const,
      sourceUrl: SOURCE_URLS.eth_etf,
      fieldPath: "fund_flow.eth_etf_flow",
      previousFieldPath: "fund_flow.eth_etf_flow.previous",
    },
    {
      label: "Stablecoin Supply",
      ...data.fund_flow.stablecoin_supply,
      format: "compact" as const,
    },
    {
      label: "┗ Ethereum",
      ...data.fund_flow.stablecoin_by_chain.ethereum,
      format: "compact" as const,
    },
    {
      label: "  ┗ Base",
      ...data.fund_flow.stablecoin_by_chain.base,
      format: "compact" as const,
    },
    {
      label: "  ┗ Arbitrum",
      ...data.fund_flow.stablecoin_by_chain.arbitrum,
      format: "compact" as const,
    },
    {
      label: "  ┗ Optimism",
      ...data.fund_flow.stablecoin_by_chain.optimism,
      format: "compact" as const,
    },
    {
      label: "┗ Tron",
      ...data.fund_flow.stablecoin_by_chain.tron,
      format: "compact" as const,
    },
    {
      label: "┗ BSC",
      ...data.fund_flow.stablecoin_by_chain.bsc,
      format: "compact" as const,
    },
    {
      label: "┗ Solana",
      ...data.fund_flow.stablecoin_by_chain.solana,
      format: "compact" as const,
    },
    {
      label: "CEX Net Flow BTC",
      ...data.fund_flow.cex_flow_btc,
      format: "number" as const,
      sourceUrl: SOURCE_URLS.cex_flow_btc,
      fieldPath: "fund_flow.cex_flow_btc",
      previousFieldPath: "fund_flow.cex_flow_btc.previous",
    },
    {
      label: "CEX Net Flow ETH",
      ...data.fund_flow.cex_flow_eth,
      format: "number" as const,
      sourceUrl: SOURCE_URLS.cex_flow_eth,
      fieldPath: "fund_flow.cex_flow_eth",
      previousFieldPath: "fund_flow.cex_flow_eth.previous",
    },
    {
      label: "Miner Breakeven",
      ...data.fund_flow.miner_breakeven,
      format: "currency" as const,
      sourceUrl: SOURCE_URLS.miner_breakeven,
      fieldPath: "fund_flow.miner_breakeven",
      previousFieldPath: "fund_flow.miner_breakeven.previous",
    },
    {
      label: "DeFi Total Borrow",
      ...data.fund_flow.defi_total_borrow,
      format: "compact" as const,
    },
    ...lendingRows,
    {
      label: "BTC Open Interest",
      ...data.fund_flow.btc_oi,
      format: "compact" as const,
      sourceUrl: SOURCE_URLS.btc_oi,
      fieldPath: "fund_flow.btc_oi",
      previousFieldPath: "fund_flow.btc_oi.previous",
    },
    {
      label: "Long/Short Ratio",
      ...data.fund_flow.long_short_ratio,
      format: "number" as const,
      sourceUrl: SOURCE_URLS.long_short_ratio,
      fieldPath: "fund_flow.long_short_ratio",
      previousFieldPath: "fund_flow.long_short_ratio.previous",
    },
    {
      label: "Funding Rate (BTC)",
      ...data.fund_flow.funding_rate,
      format: "percent" as const,
      sourceUrl: SOURCE_URLS.funding_rate,
      fieldPath: "fund_flow.funding_rate",
      previousFieldPath: "fund_flow.funding_rate.previous",
    },
  ];

  const macroRows = [
    { label: "CPI", ...data.macro.cpi, format: "percent" as const, sourceUrl: SOURCE_URLS.cpi, fieldPath: "macro.cpi", previousFieldPath: "macro.cpi.previous" },
    { label: "PPI", ...data.macro.ppi, format: "percent" as const, sourceUrl: SOURCE_URLS.ppi, fieldPath: "macro.ppi", previousFieldPath: "macro.ppi.previous" },
    { label: "Non-farm Payrolls", ...data.macro.nfp, format: "number" as const, sourceUrl: SOURCE_URLS.nfp, fieldPath: "macro.nfp", previousFieldPath: "macro.nfp.previous" },
    { label: "Unemployment Rate", ...data.macro.unemployment, format: "percent" as const, sourceUrl: SOURCE_URLS.unemployment, fieldPath: "macro.unemployment", previousFieldPath: "macro.unemployment.previous" },
    { label: "FedWatch Rate", ...data.macro.fedwatch_rate, format: undefined, sourceUrl: SOURCE_URLS.fedwatch, fieldPath: "macro.fedwatch_rate", previousFieldPath: "macro.fedwatch_rate.previous" },
    { label: "SOFR", ...data.macro.sofr, format: "percent" as const, sourceUrl: SOURCE_URLS.sofr, fieldPath: "macro.sofr", previousFieldPath: "macro.sofr.previous" },
    { label: "DXY", ...data.macro.dxy, format: "number" as const },
    { label: "US 10Y Yield", ...data.macro.us_10y, format: "percent" as const },
    { label: "Gold", ...data.macro.gold, format: "currency" as const },
    { label: "S&P 500", ...data.macro.sp500, format: "number" as const },
    { label: "NASDAQ", ...data.macro.nasdaq, format: "number" as const },
    { label: "S&P 500 / NASDAQ", ...data.macro.sp500_nasdaq_ratio, format: "ratio" as const },
  ];

  return { cryptoMarketRows, fundFlowRows, macroRows };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCachedData = useCallback(() => {
    const cached = getStoredData();
    if (cached) {
      setData(cached);
    }
    setIsLoading(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/fetch-data", { method: "POST" });
      const result = await response.json();
      if (result.success && result.data) {
        let newData = result.data as DashboardData;

        // Preserve manual field values from current data
        if (data) {
          newData = {
            ...newData,
            crypto_market: {
              ...newData.crypto_market,
              // Preserve manually-input BTC Dominance previous value
              btc_dominance: {
                ...newData.crypto_market.btc_dominance,
                previous: data.crypto_market.btc_dominance?.previous ?? newData.crypto_market.btc_dominance?.previous,
              },
              // Preserve manually-input MVRV values
              mvrv: data.crypto_market.mvrv?.isManual ? data.crypto_market.mvrv : newData.crypto_market.mvrv,
            },
            fund_flow: {
              ...newData.fund_flow,
              btc_etf_flow: data.fund_flow.btc_etf_flow?.isManual ? data.fund_flow.btc_etf_flow : newData.fund_flow.btc_etf_flow,
              eth_etf_flow: data.fund_flow.eth_etf_flow?.isManual ? data.fund_flow.eth_etf_flow : newData.fund_flow.eth_etf_flow,
              cex_flow_btc: data.fund_flow.cex_flow_btc?.isManual ? data.fund_flow.cex_flow_btc : newData.fund_flow.cex_flow_btc,
              cex_flow_eth: data.fund_flow.cex_flow_eth?.isManual ? data.fund_flow.cex_flow_eth : newData.fund_flow.cex_flow_eth,
              miner_breakeven: data.fund_flow.miner_breakeven?.isManual ? data.fund_flow.miner_breakeven : newData.fund_flow.miner_breakeven,
              btc_oi: data.fund_flow.btc_oi?.isManual ? data.fund_flow.btc_oi : newData.fund_flow.btc_oi,
              long_short_ratio: data.fund_flow.long_short_ratio?.isManual ? data.fund_flow.long_short_ratio : newData.fund_flow.long_short_ratio,
              funding_rate: data.fund_flow.funding_rate?.isManual ? data.fund_flow.funding_rate : newData.fund_flow.funding_rate,
            },
            macro: {
              ...newData.macro,
              cpi: data.macro.cpi?.isManual ? data.macro.cpi : newData.macro.cpi,
              ppi: data.macro.ppi?.isManual ? data.macro.ppi : newData.macro.ppi,
              nfp: data.macro.nfp?.isManual ? data.macro.nfp : newData.macro.nfp,
              unemployment: data.macro.unemployment?.isManual ? data.macro.unemployment : newData.macro.unemployment,
              sofr: data.macro.sofr?.isManual ? data.macro.sofr : newData.macro.sofr,
              fedwatch_rate: data.macro.fedwatch_rate?.isManual ? data.macro.fedwatch_rate : newData.macro.fedwatch_rate,
            },
          };
        }

        setData(newData);
        saveStoredData(newData);
      } else {
        setError(result.error || "데이터 새로고침에 실패했습니다");
      }
    } catch {
      setError("서버 연결에 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  }, [data]);

  const handleManualUpdate = useCallback(async (fieldPath: string, value: number | string | null) => {
    if (!data) return;

    // Helper to calculate change percentage
    const calcChangePct = (current: number | null, previous: number | null): number | undefined => {
      if (current === null || previous === null || previous === 0) return undefined;
      return ((current - previous) / previous) * 100;
    };

    // Parse numeric value
    const parseNumeric = (val: number | string | null): number | null => {
      if (val === null) return null;
      const num = typeof val === "string" ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    };

    // Update client state and localStorage
    const newData = JSON.parse(JSON.stringify(data)) as DashboardData;
    const parts = fieldPath.split(".");

    // Handle nested path like "crypto_market.btc_dominance.previous"
    if (parts.length === 3 && parts[2] === "previous") {
      const [section, key] = parts;
      const sectionData = newData[section as keyof DashboardData] as unknown as Record<string, unknown>;
      if (sectionData && key in sectionData) {
        const existing = sectionData[key] as { current?: number | string | null; previous?: number | string | null };
        const newPrevious = parseNumeric(value);
        const currentVal = parseNumeric(existing.current ?? null);
        sectionData[key] = {
          ...existing,
          previous: value,
          change_pct: calcChangePct(currentVal, newPrevious),
        };
        setData(newData);
        saveStoredData(newData);
      }
      return;
    }

    // Handle regular path like "fund_flow.btc_etf_flow"
    const [section, key] = parts;
    const sectionData = newData[section as keyof DashboardData] as unknown as Record<string, unknown>;

    if (sectionData && key in sectionData) {
      const existing = sectionData[key] as { current?: number | string | null; previous?: number | string | null };
      const newCurrent = parseNumeric(value);
      const previousVal = parseNumeric(existing.previous ?? null);
      sectionData[key] = {
        ...existing,
        current: value,
        isManual: true,
        change_pct: calcChangePct(newCurrent, previousVal),
      };
      setData(newData);
      saveStoredData(newData);
    }
  }, [data]);

  const handleExportExcel = useCallback(async () => {
    if (!data) return;

    const formatValue = (val: number | string | null | undefined, format?: string, isManual?: boolean): string | number => {
      if (val === null || val === undefined) return "-";
      if (isManual || typeof val === "string") return String(val);
      switch (format) {
        case "currency": return formatCurrency(val);
        case "percent": return formatPercent(val);
        case "compact": return formatCompact(val);
        case "ratio": return formatRatio(val);
        default: return formatNumber(val);
      }
    };

    const formatChangePctExcel = (change_pct: number | undefined): string => {
      if (change_pct === undefined || change_pct === null || isNaN(change_pct)) return "-";
      const sign = change_pct >= 0 ? "+" : "";
      return `${sign}${change_pct.toFixed(2)}%`;
    };

    const { cryptoMarketRows, fundFlowRows, macroRows } = buildRows(data);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Dashboard");

    // Set column widths
    worksheet.columns = [
      { width: 20 },  // 지표
      { width: 15 },  // 이전
      { width: 15 },  // 현재
      { width: 12 },  // 변화율
      { width: 12 },  // 소스
    ];

    worksheet.addRow(["📊 암호화폐 시장", "", "", "", ""]);
    worksheet.addRow(["지표", "이전", "현재", "변화율", "소스"]);
    cryptoMarketRows.forEach(r => worksheet.addRow([
      r.label,
      formatValue(r.previous, r.format, r.isManual),
      formatValue(r.current, r.format, r.isManual),
      formatChangePctExcel(r.change_pct),
      r.source || ""
    ]));
    worksheet.addRow(["", "", "", "", ""]);
    worksheet.addRow(["💰 자금흐름", "", "", "", ""]);
    worksheet.addRow(["지표", "이전", "현재", "변화율", "소스"]);
    fundFlowRows.forEach(r => worksheet.addRow([
      r.label,
      formatValue(r.previous, r.format, r.isManual),
      formatValue(r.current, r.format, r.isManual),
      formatChangePctExcel(r.change_pct),
      r.source || ""
    ]));
    worksheet.addRow(["", "", "", "", ""]);
    worksheet.addRow(["🌍 매크로", "", "", "", ""]);
    worksheet.addRow(["지표", "이전", "현재", "변화율", "소스"]);
    macroRows.forEach(r => worksheet.addRow([
      r.label,
      formatValue(r.previous, r.format, r.isManual),
      formatValue(r.current, r.format, r.isManual),
      formatChangePctExcel(r.change_pct),
      r.source || ""
    ]));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const date = new Date().toISOString().split("T")[0];
    saveAs(blob, `yumyum_${date}.xlsx`);
  }, [data]);

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  // Loading skeleton
  if (isLoading && !data) {
    return (
      <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-neutral/10 rounded mb-6 w-64" />
          <div className="flex justify-end mb-6">
            <div className="h-8 bg-neutral/10 rounded w-48" />
          </div>
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <div className="h-6 bg-neutral/10 rounded w-32 mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-8 bg-neutral/5 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-foreground text-background rounded-md hover:opacity-90"
          >
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  // No cached data - show empty dashboard
  if (!data) {
    const emptyData: DashboardData = {
      updated_at: "",
      crypto_market: {
        btc_price: { current: null },
        eth_price: { current: null },
        btc_dominance: { current: null },
        btc_gold_ratio: { current: null },
        eth_btc_ratio: { current: null },
        fear_greed: { current: null },
        mvrv: { current: null, isManual: true, source: "manual" },
        vol_7d: { current: null },
        vol_30d: { current: null },
        mstr: { current: null },
        bmnr: { current: null },
        cme_gap: { current: null },
      },
      fund_flow: {
        btc_etf_flow: { current: null, isManual: true, source: "manual" },
        eth_etf_flow: { current: null, isManual: true, source: "manual" },
        stablecoin_supply: { current: null },
        stablecoin_by_chain: { ethereum: { current: null }, base: { current: null }, arbitrum: { current: null }, optimism: { current: null }, tron: { current: null }, bsc: { current: null }, solana: { current: null } },
        cex_flow_btc: { current: null, isManual: true, source: "manual" },
        cex_flow_eth: { current: null, isManual: true, source: "manual" },
        miner_breakeven: { current: null, isManual: true, source: "manual" },
        defi_total_borrow: { current: null },
        defi_top_protocols: [],
        btc_oi: { current: null, isManual: true, source: "manual" },
        long_short_ratio: { current: null, isManual: true, source: "manual" },
        funding_rate: { current: null, isManual: true, source: "manual" },
      },
      macro: {
        dxy: { current: null },
        us_10y: { current: null },
        gold: { current: null },
        sp500: { current: null },
        nasdaq: { current: null },
        sp500_nasdaq_ratio: { current: null },
        cpi: { current: null, isManual: true, source: "manual" },
        ppi: { current: null, isManual: true, source: "manual" },
        nfp: { current: null, isManual: true, source: "manual" },
        unemployment: { current: null, isManual: true, source: "manual" },
        sofr: { current: null, isManual: true, source: "manual" },
        fedwatch_rate: { current: null, isManual: true, source: "manual" },
      },
    };
    const { cryptoMarketRows, fundFlowRows, macroRows } = buildRows(emptyData);

    return (
      <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
        <Header updatedAt="" />

        <div className="flex justify-end mb-6">
          <ActionButtons
            onRefresh={handleRefresh}
            onExportExcel={handleExportExcel}
            isLoading={isLoading}
          />
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeader emoji="📊" title="암호화폐 시장" />
            <DataTable data={cryptoMarketRows} onUpdate={handleManualUpdate} disabled={isLoading} />
          </section>

          <section>
            <SectionHeader emoji="💰" title="자금흐름" />
            <DataTable data={fundFlowRows} onUpdate={handleManualUpdate} disabled={isLoading} />
          </section>

          <section>
            <SectionHeader emoji="🌍" title="매크로" />
            <DataTable data={macroRows} onUpdate={handleManualUpdate} disabled={isLoading} />
          </section>
        </div>
      </main>
    );
  }

  const { cryptoMarketRows, fundFlowRows, macroRows } = buildRows(data);

  return (
    <main className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <Header updatedAt={data.updated_at} />

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
          {error}
        </div>
      )}

      <div className="flex justify-end mb-6">
        <ActionButtons
          onRefresh={handleRefresh}
          onExportExcel={handleExportExcel}
          isLoading={isLoading}
        />
      </div>

      <div className="space-y-8">
        <section>
          <SectionHeader emoji="📊" title="암호화폐 시장" />
          <DataTable data={cryptoMarketRows} onUpdate={handleManualUpdate} disabled={isLoading} />
        </section>

        <section>
          <SectionHeader emoji="💰" title="자금흐름" />
          <DataTable data={fundFlowRows} onUpdate={handleManualUpdate} disabled={isLoading} />
        </section>

        <section>
          <SectionHeader emoji="🌍" title="매크로" />
          <DataTable data={macroRows} onUpdate={handleManualUpdate} disabled={isLoading} />
        </section>
      </div>
    </main>
  );
}
