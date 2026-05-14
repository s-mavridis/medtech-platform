import { useState, useEffect, useCallback } from 'react';
import { Loader2, Map, AlertCircle, Users, Activity, DollarSign, TrendingUp, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { searchNppes } from '../../api/nppes';
import { PUF_2023_ID } from '../../api/cms';
import type { PhysicianPufRecord } from '../../api/cms';

const US_STATES = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' }, { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' }, { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' }, { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' }, { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' }, { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' }, { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' }, { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' }, { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' }, { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' }, { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' }, { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' }, { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' }, { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' }, { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' }, { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' }, { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' }, { abbr: 'DC', name: 'DC' },
];

const SPECIALTIES = [
  { label: 'Orthopedic Surgery', tax: 'Orthopedic Surgery', color: '#3b82f6' },
  { label: 'Internal Medicine',  tax: 'Internal Medicine',  color: '#8b5cf6' },
  { label: 'Family Medicine',    tax: 'Family Medicine',    color: '#10b981' },
  { label: 'Cardiology',         tax: 'Cardiology',         color: '#f59e0b' },
  { label: 'General Surgery',    tax: 'General Surgery',    color: '#ef4444' },
  { label: 'Neurology',          tax: 'Neurology',          color: '#06b6d4' },
  { label: 'Rheumatology',       tax: 'Rheumatology',       color: '#ec4899' },
  { label: 'Gastroenterology',   tax: 'Gastroenterology',   color: '#84cc16' },
];

const fmt$ = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString();

type SortDir = 'asc' | 'desc';
interface SortState { key: string; dir: SortDir }

function SortTh({ label, sortKey, sort, onSort }: {
  label: string; sortKey: string; sort: SortState; onSort: (k: string) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th onClick={() => onSort(sortKey)}
      className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors">
      <span className="inline-flex items-center gap-1 justify-end w-full">
        {label}
        {active
          ? sort.dir === 'desc' ? <ArrowDown className="w-3 h-3 text-blue-500" /> : <ArrowUp className="w-3 h-3 text-blue-500" />
          : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  );
}

interface TerritoryData {
  state: string;
  specialtyCounts: { label: string; count: number; color: string }[];
  totalProviders: number;
  topProcedures: { hcpcs: string; desc: string; services: number; revenue: number }[];
  totalServices: number;
  totalRevenue: number;
}

async function fetchTerritoryData(stateAbbr: string): Promise<TerritoryData> {
  // 1. Provider counts by specialty from NPPES (parallel, limit=1 just to get result_count)
  const specialtyResults = await Promise.allSettled(
    SPECIALTIES.map(s =>
      searchNppes({ taxonomy_description: s.tax, state: stateAbbr, enumeration_type: 'NPI-1', limit: 5 })
        .then(r => ({ label: s.label, count: r.result_count ?? r.results?.length ?? 0, color: s.color }))
    )
  );
  const specialtyCounts = specialtyResults
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean) as { label: string; count: number; color: string }[];
  const totalProviders = specialtyCounts.reduce((s, r) => s + r.count, 0);

  // 2. Top procedures from Medicare PUF for this state
  let topProcedures: { hcpcs: string; desc: string; services: number; revenue: number }[] = [];
  let totalServices = 0;
  let totalRevenue = 0;
  try {
    const params = new URLSearchParams({ 'filter[Rndrng_Prvdr_State_Abrvtn]': stateAbbr, size: '500' });
    const resp = await fetch(`/api/cms-data/${PUF_2023_ID}/data?${params}`, { signal: AbortSignal.timeout(15000) });
    if (resp.ok) {
      const rows: PhysicianPufRecord[] = await resp.json();
      const agg: Record<string, { hcpcs: string; desc: string; services: number; revenue: number }> = {};
      for (const r of rows) {
        const svc = parseInt(r.Tot_Srvcs) || 0;
        const amt = parseFloat(r.Avg_Mdcr_Alowd_Amt) || 0;
        if (agg[r.HCPCS_Cd]) { agg[r.HCPCS_Cd].services += svc; agg[r.HCPCS_Cd].revenue += svc * amt; }
        else { agg[r.HCPCS_Cd] = { hcpcs: r.HCPCS_Cd, desc: r.HCPCS_Desc, services: svc, revenue: svc * amt }; }
      }
      topProcedures = Object.values(agg).sort((a, b) => b.services - a.services).slice(0, 20);
      totalServices = rows.reduce((s, r) => s + (parseInt(r.Tot_Srvcs) || 0), 0);
      totalRevenue = topProcedures.reduce((s, r) => s + r.revenue, 0);
    }
  } catch { /* PUF optional — show specialty data regardless */ }

  return { state: stateAbbr, specialtyCounts, totalProviders, topProcedures, totalServices, totalRevenue };
}

interface TerritoryAnalyticsProps {
  onCptSearch?: (code: string) => void;
}

export default function TerritoryAnalytics({ onCptSearch }: TerritoryAnalyticsProps) {
  const [selectedState, setSelectedState] = useState('CA');
  const [data, setData] = useState<TerritoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [procSort, setProcSort] = useState<SortState>({ key: 'services', dir: 'desc' });

  const toggleProcSort = (k: string) => setProcSort(s => s.key === k ? { ...s, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: 'desc' });

  const load = useCallback(async (state: string) => {
    setLoading(true); setError(null); setData(null);
    try {
      const result = await fetchTerritoryData(state);
      setData(result);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load territory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(selectedState); }, [selectedState, load]);

  const stateName = US_STATES.find(s => s.abbr === selectedState)?.name ?? selectedState;

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Territory Analytics</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live data from NPPES NPI Registry + Medicare PUF 2023</p>
        </div>
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-gray-400" />
          <select className="select w-52" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
            {US_STATES.map(s => <option key={s.abbr} value={s.abbr}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Querying NPPES + Medicare PUF for {stateName}…</p>
          <p className="text-xs text-gray-300">Running {SPECIALTIES.length} specialty queries in parallel</p>
        </div>
      )}

      {error && <div className="m-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {data && !loading && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* KPI strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="card text-center p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-blue-600 mb-1"><Users className="w-3.5 h-3.5" />Total Providers</div>
              <div className="text-2xl font-bold text-blue-900">{fmtN(data.totalProviders)}</div>
              <div className="text-xs text-gray-400">across {SPECIALTIES.length} specialties</div>
            </div>
            <div className="card text-center p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-purple-600 mb-1"><Activity className="w-3.5 h-3.5" />Medicare Services</div>
              <div className="text-2xl font-bold text-purple-900">{data.totalServices > 0 ? fmtN(data.totalServices) : '—'}</div>
              <div className="text-xs text-gray-400">sample · 2023 PUF</div>
            </div>
            <div className="card text-center p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-green-600 mb-1"><DollarSign className="w-3.5 h-3.5" />Est. Revenue (sample)</div>
              <div className="text-2xl font-bold text-green-900">{data.totalRevenue > 0 ? fmt$(data.totalRevenue) : '—'}</div>
              <div className="text-xs text-gray-400">Medicare allowed</div>
            </div>
            <div className="card text-center p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-orange-600 mb-1"><TrendingUp className="w-3.5 h-3.5" />Top Specialty</div>
              <div className="text-lg font-bold text-orange-900 leading-tight">{data.specialtyCounts.sort((a, b) => b.count - a.count)[0]?.label ?? '—'}</div>
              <div className="text-xs text-gray-400">{fmtN(data.specialtyCounts[0]?.count ?? 0)} providers</div>
            </div>
          </div>

          {/* Specialty breakdown */}
          <div className="card">
            <div className="font-semibold text-gray-800 mb-1">Provider Count by Specialty · {stateName}</div>
            <div className="text-xs text-gray-400 mb-3">Live from NPPES NPI Registry — individual providers (NPI-1) with active enrollment</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={[...data.specialtyCounts].sort((a, b) => b.count - a.count).map(s => ({ name: s.label.replace(' Medicine', ' Med.').replace('Gastroenterology', 'Gastro.'), count: s.count, color: s.color }))}
                margin={{ left: 10, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)} />
                <Tooltip formatter={(v: number) => [fmtN(v) + ' providers']} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {data.specialtyCounts.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Specialty table */}
          <div className="card overflow-hidden p-0">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-gray-800 text-sm">Specialty Breakdown — {stateName}</span>
              <span className="text-xs text-gray-400 ml-2">NPPES result counts · NPI-1 individual providers</span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Providers</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {[...data.specialtyCounts].sort((a, b) => b.count - a.count).map(s => (
                  <tr key={s.label} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="font-medium text-gray-800">{s.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(s.count)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {data.totalProviders > 0 ? `${((s.count / data.totalProviders) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top procedures */}
          {data.topProcedures.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-800 text-sm">Top Medicare Procedures · {stateName}</span>
                <span className="text-xs text-gray-400 ml-2">Medicare PUF 2023 · sample of 500 rows</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">HCPCS</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Procedure</th>
                    <SortTh label="Services" sortKey="services" sort={procSort} onSort={toggleProcSort} />
                    <SortTh label="Est. Revenue" sortKey="revenue" sort={procSort} onSort={toggleProcSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {[...data.topProcedures].sort((a, b) =>
                    procSort.dir === 'desc'
                      ? (b[procSort.key as 'services' | 'revenue'] - a[procSort.key as 'services' | 'revenue'])
                      : (a[procSort.key as 'services' | 'revenue'] - b[procSort.key as 'services' | 'revenue'])
                  ).slice(0, 15).map((p, i) => (
                    <tr key={p.hcpcs + i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <button
                          onClick={() => onCptSearch?.(p.hcpcs)}
                          className={`font-mono text-xs font-semibold ${onCptSearch ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : 'text-blue-700'}`}
                        >
                          {p.hcpcs}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-sm truncate">{p.desc}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(p.services)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmt$(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
