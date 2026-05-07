import { useState, useCallback } from 'react';
import { getCptProviders } from '../api/cms';
import type { CptProviderRow } from '../api/cms';

export interface StateAggregate {
  state: string;
  stateFips: string;
  totalServices: number;
  providerCount: number;
  totalRevenue: number;  // sum of totalServices * avgAllowedAmt
}

export interface InstitutionAggregate {
  orgName: string;
  state: string;
  city: string;
  totalServices: number;
  providerCount: number;
  avgAllowedAmt: number;
  totalRevenue: number;
}

export interface CptSummary {
  hcpcs: string;
  description: string;
  totalServices: number;
  totalProviders: number;
  avgAllowedAmt: number;
  avgPaymentAmt: number;
  avgSubmittedCharge: number;
  stateAggregates: StateAggregate[];
  topProviders: CptProviderRow[];
  topInstitutions: InstitutionAggregate[];
  year: string;
  isTruncated: boolean;  // true if >500 providers (we only fetched a sample)
}

function aggregateStates(rows: CptProviderRow[]): StateAggregate[] {
  const map = new Map<string, StateAggregate>();
  for (const r of rows) {
    if (!r.state) continue;
    const key = r.state;
    const revenue = r.totalServices * r.avgAllowedAmt;
    if (map.has(key)) {
      const s = map.get(key)!;
      s.totalServices += r.totalServices;
      s.providerCount += 1;
      s.totalRevenue += revenue;
    } else {
      map.set(key, {
        state: r.state,
        stateFips: r.stateFips,
        totalServices: r.totalServices,
        providerCount: 1,
        totalRevenue: revenue,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalServices - a.totalServices);
}

function aggregateInstitutions(rows: CptProviderRow[]): InstitutionAggregate[] {
  const map = new Map<string, { rows: CptProviderRow[] }>();
  for (const r of rows) {
    // Use org name if available, otherwise skip (individual providers are separate)
    const key = r.orgName || `__ind__${r.npi}`;
    if (!r.orgName) continue;
    if (!map.has(key)) map.set(key, { rows: [] });
    map.get(key)!.rows.push(r);
  }
  return Array.from(map.entries())
    .map(([, { rows }]) => {
      const totalServices = rows.reduce((s, r) => s + r.totalServices, 0);
      const totalWeightedAmt = rows.reduce((s, r) => s + r.avgAllowedAmt * r.totalServices, 0);
      return {
        orgName: rows[0].orgName,
        state: rows[0].state,
        city: rows[0].city,
        totalServices,
        providerCount: rows.length,
        avgAllowedAmt: totalServices > 0 ? totalWeightedAmt / totalServices : 0,
        totalRevenue: totalWeightedAmt,
      };
    })
    .sort((a, b) => b.totalServices - a.totalServices)
    .slice(0, 100);
}

export interface CptExplorerState {
  summary: CptSummary | null;
  rawRows: CptProviderRow[];   // all fetched rows, for state-level filtering
  loading: boolean;
  error: string | null;
}

export function useCptExplorer() {
  const [state, setState] = useState<CptExplorerState>({
    summary: null,
    rawRows: [],
    loading: false,
    error: null,
  });

  const search = useCallback(async (hcpcsCode: string, year: '2023' | '2022' = '2023') => {
    if (!hcpcsCode.trim()) return;
    setState({ summary: null, rawRows: [], loading: true, error: null });
    try {
      const rows = await getCptProviders(hcpcsCode, { limit: 500, year });
      if (rows.length === 0) {
        setState({ summary: null, rawRows: [], loading: false, error: `No Medicare data found for CPT ${hcpcsCode} in ${year}. Check the code or try ${year === '2023' ? '2022' : '2023'}.` });
        return;
      }

      const totalServices = rows.reduce((s, r) => s + r.totalServices, 0);
      const totalWeightedAmt = rows.reduce((s, r) => s + r.avgAllowedAmt * r.totalServices, 0);
      const totalWeightedPmt = rows.reduce((s, r) => s + r.avgPaymentAmt * r.totalServices, 0);
      const totalWeightedChg = rows.reduce((s, r) => s + r.avgSubmittedCharge * r.totalServices, 0);

      const summary: CptSummary = {
        hcpcs: rows[0].hcpcs,
        description: rows[0].description,
        totalServices,
        totalProviders: rows.length,
        avgAllowedAmt: totalServices > 0 ? totalWeightedAmt / totalServices : 0,
        avgPaymentAmt: totalServices > 0 ? totalWeightedPmt / totalServices : 0,
        avgSubmittedCharge: totalServices > 0 ? totalWeightedChg / totalServices : 0,
        stateAggregates: aggregateStates(rows),
        topProviders: rows.slice(0, 200),
        topInstitutions: aggregateInstitutions(rows),
        year,
        isTruncated: rows.length >= 500,
      };

      setState({ summary, rawRows: rows, loading: false, error: null });
    } catch (e) {
      setState({ summary: null, rawRows: [], loading: false, error: (e as Error).message ?? 'Failed to load CPT data' });
    }
  }, []);

  return { ...state, search };
}
