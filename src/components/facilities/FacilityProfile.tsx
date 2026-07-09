import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search, Building2, MapPin, Phone, ChevronRight, ChevronDown, ChevronUp,
  Loader2, AlertCircle, X, Info, ArrowLeft, Layers, ArrowUpDown, ArrowUp, ArrowDown, Users,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { searchNppes, getPracticeAddress, getPrimaryTaxonomy, mapSpecialty, getDisplayName } from '../../api/nppes';
import { getInstitutionCptByNpi, getSystemCptProfile, getInstitutionCptProfile, searchProvidersByOrg } from '../../api/cms';
import type { NppesResult } from '../../api/nppes';
import type { CptProviderRow, PhysicianCompareRecord } from '../../api/cms';

const US_STATES = ['','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
const fmt$ = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString();

// ─── CPT Category utilities ───────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  'E&M': '#3b82f6', 'Surgery': '#ef4444', 'Musculoskeletal': '#8b5cf6',
  'Radiology': '#f59e0b', 'Lab & Pathology': '#06b6d4', 'Medicine': '#10b981',
  'Anesthesia': '#84cc16', 'HCPCS Level II': '#6b7280', 'Other': '#9ca3af',
};
function getCptCategory(code: string): string {
  const num = parseInt(code);
  if (isNaN(num)) return 'HCPCS Level II';
  if (num >= 99202 && num <= 99499) return 'E&M';
  if (num >= 90000) return 'Medicine';
  if (num >= 80000) return 'Lab & Pathology';
  if (num >= 70000) return 'Radiology';
  if (num >= 20000 && num <= 29999) return 'Musculoskeletal';
  if (num >= 10000) return 'Surgery';
  if (num >= 100) return 'Anesthesia';
  return 'Other';
}

// ─── Sortable table header ────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc';
interface SortState { key: string; dir: SortDir }

function SortTh({ label, sortKey, sort, onSort, className = '' }: {
  label: string; sortKey: string; sort: SortState; onSort: (k: string) => void; className?: string;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      onClick={() => onSort(sortKey)}
      className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active
          ? sort.dir === 'desc' ? <ArrowDown className="w-3 h-3 text-blue-500" /> : <ArrowUp className="w-3 h-3 text-blue-500" />
          : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  );
}

function useSort(defaultKey: string): [SortState, (k: string) => void, <T>(arr: T[], getter: (r: T, k: string) => number) => T[]] {
  const [sort, setSort] = useState<SortState>({ key: defaultKey, dir: 'desc' });
  const toggle = (k: string) => setSort(s => s.key === k ? { ...s, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: 'desc' });
  const sorted = <T,>(arr: T[], getter: (r: T, k: string) => number) =>
    [...arr].sort((a, b) => sort.dir === 'desc' ? getter(b, sort.key) - getter(a, sort.key) : getter(a, sort.key) - getter(b, sort.key));
  return [sort, toggle, sorted];
}

// ─── Grouping ─────────────────────────────────────────────────────────────────
interface OrgGroup { name: string; orgs: NppesResult[]; expanded: boolean }
function groupResults(orgs: NppesResult[]): OrgGroup[] {
  const map = new Map<string, NppesResult[]>();
  for (const org of orgs) {
    const name = getDisplayName(org);
    if (!map.has(name)) map.set(name, []);
    map.get(name)!.push(org);
  }
  return Array.from(map.entries()).map(([name, list]) => ({ name, orgs: list, expanded: false }));
}

// ─── GroupCard ────────────────────────────────────────────────────────────────
function OrgCard({ org, onSelect }: { org: NppesResult; onSelect: () => void }) {
  const addr = getPracticeAddress(org);
  const tax = getPrimaryTaxonomy(org);
  return (
    <div onClick={onSelect} className="px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            {addr && <div className="text-xs text-gray-600">{addr.address_1}, {addr.city}, {addr.state} {addr.postal_code?.slice(0, 5)}</div>}
            <div className="text-xs text-gray-400">{tax ? mapSpecialty(tax.code, tax.desc) : 'Organization'} · NPI {org.number}</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" />
      </div>
    </div>
  );
}

function GroupCard({ group, onSelectSingle, onSelectSystem, onToggle }: {
  group: OrgGroup; onSelectSingle: (org: NppesResult) => void;
  onSelectSystem: (name: string, orgs: NppesResult[]) => void; onToggle: () => void;
}) {
  const firstAddr = getPracticeAddress(group.orgs[0]);
  if (group.orgs.length === 1) {
    const org = group.orgs[0];
    const tax = getPrimaryTaxonomy(org);
    return (
      <div onClick={() => onSelectSingle(org)} className="card cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-blue-600" /></div>
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-blue-700">{group.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">{tax ? mapSpecialty(tax.code, tax.desc) : 'Health System / Organization'}</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 mt-1" />
        </div>
        {firstAddr && <div className="mt-2 flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3.5 h-3.5" />{firstAddr.address_1}, {firstAddr.city}, {firstAddr.state} {firstAddr.postal_code?.slice(0, 5)}</div>}
        <div className="mt-1 text-xs text-gray-400 font-mono">NPI {org.number}</div>
      </div>
    );
  }
  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-white" /></div>
          <div>
            <div className="font-semibold text-gray-900">{group.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{group.orgs.length} locations</span>
              {firstAddr && <span className="text-xs text-gray-400">{firstAddr.state} and more</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={e => { e.stopPropagation(); onSelectSystem(group.name, group.orgs); }}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" /> View as System
          </button>
          {group.expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>
      {group.expanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.orgs.map(org => <OrgCard key={org.number} org={org} onSelect={() => onSelectSingle(org)} />)}
        </div>
      )}
    </div>
  );
}

// ─── Detail target ────────────────────────────────────────────────────────────
type DetailTarget =
  | { kind: 'single'; org: NppesResult }
  | { kind: 'system'; name: string; orgs: NppesResult[] };

// ─── FacilityDetail ───────────────────────────────────────────────────────────
function FacilityDetail({ target, onBack, setActiveView, setSelectedNpi }: {
  target: DetailTarget; onBack: () => void;
  setActiveView: (v: string) => void; setSelectedNpi: (npi: string) => void;
}) {
  const [cptData, setCptData] = useState<CptProviderRow[] | null>(null);
  const [cptLoading, setCptLoading] = useState(true);
  const [cptError, setCptError] = useState<string | null>(null);
  const [matchedBy, setMatchedBy] = useState<'npi' | 'name' | 'affiliated' | 'none' | null>(null);
  const [affPhysCount, setAffPhysCount] = useState(0);
  const [tab, setTab] = useState<'cpt' | 'providers' | 'physicians'>('cpt');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [physicians, setPhysicians] = useState<PhysicianCompareRecord[] | null>(null);
  const [physLoading, setPhysLoading] = useState(false);
  const [cptSort, toggleCptSort, sortedCpt] = useSort('services');
  const [provSort, toggleProvSort, sortedProv] = useSort('services');

  const name = target.kind === 'single' ? getDisplayName(target.org) : target.name;
  const addr = target.kind === 'single' ? getPracticeAddress(target.org) : getPracticeAddress(target.orgs[0]);
  const npi = target.kind === 'single' ? target.org.number : null;
  const npis = target.kind === 'system' ? target.orgs.map(o => o.number) : [target.org.number];

  const didLoad = useRef(false);
  if (!didLoad.current) {
    didLoad.current = true;
    (async () => {
      try {
        if (target.kind === 'system') {
          const rows = await getSystemCptProfile(npis, { limit: 200 });
          if (rows.length > 0) { setCptData(rows); setMatchedBy('npi'); setCptLoading(false); return; }
          // System with no direct NPI data → aggregate from affiliated physicians
          const physicians = await searchProvidersByOrg(name, 100);
          if (physicians.length > 0) {
            setPhysicians(physicians);
            setAffPhysCount(physicians.length);
            const physNpis = [...new Set(physicians.map(p => p.npi))].slice(0, 20);
            const affRows = await getSystemCptProfile(physNpis, { limit: 200 });
            setCptData(affRows); setMatchedBy(affRows.length > 0 ? 'affiliated' : 'none');
          } else {
            setCptData([]); setMatchedBy('none');
          }
        } else {
          const byNpi = await getInstitutionCptByNpi(target.org.number, { limit: 500 });
          if (byNpi.length > 0) { setCptData(byNpi); setMatchedBy('npi'); setCptLoading(false); return; }
          const byName = await getInstitutionCptProfile(name, { limit: 500 });
          if (byName.length > 0) { setCptData(byName); setMatchedBy('name'); setCptLoading(false); return; }
          // Both direct lookups failed — aggregate from affiliated physicians
          const physResults = await searchProvidersByOrg(name, 100);
          if (physResults.length > 0) {
            setPhysicians(physResults);
            setAffPhysCount(physResults.length);
            const physNpis = [...new Set(physResults.map(p => p.npi))].slice(0, 20);
            const affRows = await getSystemCptProfile(physNpis, { limit: 200 });
            setCptData(affRows); setMatchedBy(affRows.length > 0 ? 'affiliated' : 'none');
          } else {
            setCptData([]); setMatchedBy('none');
          }
        }
      } catch (e) { setCptError((e as Error).message ?? 'Failed to load data'); }
      finally { setCptLoading(false); }
    })();
  }

  const loadPhysicians = async () => {
    // Already loaded (either by auto-aggregate or previous tab click)
    if (physicians !== null || physLoading) return;
    setPhysLoading(true);
    const results = await searchProvidersByOrg(name, 100);
    setPhysicians(results);
    if (results.length > 0) setAffPhysCount(results.length);
    setPhysLoading(false);
  };

  useEffect(() => { if (tab === 'physicians') loadPhysicians(); }, [tab]);

  // Aggregate CPT rows by HCPCS
  const cptSummary = (() => {
    if (!cptData) return [];
    const map = new Map<string, { hcpcs: string; desc: string; category: string; services: number; patients: number; revenue: number }>();
    for (const r of cptData) {
      const e = map.get(r.hcpcs);
      if (e) { e.services += r.totalServices; e.patients += r.uniquePatients; e.revenue += r.totalServices * r.avgAllowedAmt; }
      else map.set(r.hcpcs, { hcpcs: r.hcpcs, desc: r.description, category: getCptCategory(r.hcpcs), services: r.totalServices, patients: r.uniquePatients, revenue: r.totalServices * r.avgAllowedAmt });
    }
    return Array.from(map.values());
  })();

  const categorySummary = (() => {
    const map = new Map<string, { category: string; services: number; revenue: number; codeCount: number }>();
    for (const r of cptSummary) {
      const e = map.get(r.category);
      if (e) { e.services += r.services; e.revenue += r.revenue; e.codeCount++; }
      else map.set(r.category, { category: r.category, services: r.services, revenue: r.revenue, codeCount: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.services - a.services);
  })();

  const sortedCptRows = sortedCpt(cptSummary, (r, k) => k === 'revenue' ? r.revenue : k === 'patients' ? r.patients : r.services);
  const totalServices = cptSummary.reduce((s, r) => s + r.services, 0);
  const totalRevenue = cptSummary.reduce((s, r) => s + r.revenue, 0);
  const providerCount = new Set(cptData?.map(r => r.npi) ?? []).size;

  // Provider aggregation
  const providerRows = (() => {
    const map = new Map<string, { npi: string; name: string; specialty: string; city: string; state: string; services: number }>();
    for (const r of cptData ?? []) {
      if (map.has(r.npi)) map.get(r.npi)!.services += r.totalServices;
      else map.set(r.npi, { npi: r.npi, name: r.displayName, specialty: r.specialty, city: r.city, state: r.state, services: r.totalServices });
    }
    return Array.from(map.values());
  })();
  const sortedProvRows = sortedProv(providerRows, (r, k) => r.services);

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to search
        </button>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0"><Building2 className="w-6 h-6 text-white" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              {target.kind === 'system' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{target.orgs.length} locations aggregated</span>}
            </div>
            {addr && <div className="flex items-center gap-1 text-sm text-gray-500 mt-1"><MapPin className="w-3.5 h-3.5" />{addr.address_1}, {addr.city}, {addr.state} {addr.postal_code?.slice(0, 5)}</div>}
            {addr?.telephone_number && target.kind === 'single' && <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5"><Phone className="w-3.5 h-3.5" />{addr.telephone_number}</div>}
            {npi && <div className="text-xs text-gray-400 font-mono mt-1">NPI {npi}</div>}
            {matchedBy === 'npi' && <div className="text-xs text-green-600 mt-0.5">✓ Matched by NPI in Medicare PUF 2023</div>}
            {matchedBy === 'name' && <div className="text-xs text-amber-600 mt-0.5">Matched by organization name in Medicare PUF 2023</div>}
            {matchedBy === 'affiliated' && <div className="text-xs text-purple-700 mt-0.5">📊 Aggregated from {affPhysCount} affiliated physicians (Physician Compare + Medicare PUF)</div>}
          </div>
        </div>
        {cptData && cptData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-900">{fmtN(providerCount)}</div><div className="text-xs text-blue-600">Billing providers</div></div>
            <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-purple-900">{fmtN(totalServices)}</div><div className="text-xs text-purple-600">Total services (Medicare)</div></div>
            <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-900">{fmt$(totalRevenue)}</div><div className="text-xs text-green-600">Est. Medicare revenue</div></div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4 flex items-center justify-between">
        <nav className="flex gap-1">
          {([
            ['cpt', 'CPT Revenue Mix'],
            ['providers', 'Providers'],
            ['physicians', 'Affiliated Physicians'],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </nav>
        {tab === 'cpt' && cptSummary.length > 0 && (
          <button onClick={() => setGroupByCategory(g => !g)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${groupByCategory ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Layers className="w-3.5 h-3.5" /> Group by Category
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {cptLoading && <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-12"><Loader2 className="w-4 h-4 animate-spin text-blue-500" />Loading Medicare procedure data…</div>}
        {cptError && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4" />{cptError}</div>}

        {!cptLoading && matchedBy === 'none' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>No Medicare billing data found for {name}.</strong>
              <p className="mt-1">We searched by NPI, organization name, and affiliated physician NPIs (via Physician Compare) — all returned no results. The facility may use a different legal name in CMS records, or bill under a parent entity. Try Provider Search to find individual physicians by name.</p>
            </div>
          </div>
        )}

        {/* CPT flat view */}
        {tab === 'cpt' && cptSummary.length > 0 && !groupByCategory && (
          <>
            <div className="card">
              <div className="font-semibold text-gray-800 mb-3">Top Procedures by Volume · Medicare</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={sortedCptRows.slice(0, 12).map(r => ({ name: r.hcpcs, services: r.services, desc: r.desc }))} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)} />
                  <Tooltip formatter={(v: number) => [fmtN(v) + ' services']} labelFormatter={(_: string, p: any[]) => p[0]?.payload?.desc ?? _} />
                  <Bar dataKey="services" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">HCPCS</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Procedure</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <SortTh label="Services" sortKey="services" sort={cptSort} onSort={toggleCptSort} className="text-right" />
                    <SortTh label="Patients" sortKey="patients" sort={cptSort} onSort={toggleCptSort} className="text-right" />
                    <SortTh label="Est. Revenue" sortKey="revenue" sort={cptSort} onSort={toggleCptSort} className="text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {sortedCptRows.slice(0, 30).map((r, i) => (
                    <tr key={r.hcpcs + i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-blue-700">{r.hcpcs}</td>
                      <td className="px-4 py-2 text-gray-700 text-xs truncate max-w-xs">{r.desc}</td>
                      <td className="px-4 py-2"><span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: (CATEGORY_COLORS[r.category] ?? '#6b7280') + '20', color: CATEGORY_COLORS[r.category] ?? '#6b7280' }}>{r.category}</span></td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900 text-xs">{fmtN(r.services)}</td>
                      <td className="px-4 py-2 text-right text-gray-600 text-xs">{fmtN(r.patients)}</td>
                      <td className="px-4 py-2 text-right font-medium text-green-700 text-xs">{fmt$(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* CPT grouped by category */}
        {tab === 'cpt' && cptSummary.length > 0 && groupByCategory && (
          <>
            <div className="card">
              <div className="font-semibold text-gray-800 mb-3">Revenue Mix by CPT Category</div>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={200} height={180}>
                  <PieChart>
                    <Pie data={categorySummary} dataKey="revenue" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {categorySummary.map((entry, i) => <Cell key={i} fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmt$(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {categorySummary.map(cat => (
                    <div key={cat.category} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: CATEGORY_COLORS[cat.category] ?? '#6b7280' }} />
                      <span className="text-xs text-gray-700 flex-1">{cat.category}</span>
                      <span className="text-xs font-semibold text-gray-900">{fmtN(cat.services)}</span>
                      <span className="text-xs text-green-700 w-20 text-right">{fmt$(cat.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {categorySummary.map(cat => {
              const rows = sortedCptRows.filter(r => r.category === cat.category);
              return (
                <div key={cat.category} className="card overflow-hidden p-0">
                  <div className="px-4 py-2.5 flex items-center gap-2 border-b border-gray-100" style={{ background: (CATEGORY_COLORS[cat.category] ?? '#6b7280') + '18' }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CATEGORY_COLORS[cat.category] ?? '#6b7280' }} />
                    <span className="font-semibold text-sm text-gray-800">{cat.category}</span>
                    <span className="text-xs text-gray-500 ml-1">{cat.codeCount} codes · {fmtN(cat.services)} services · {fmt$(cat.revenue)}</span>
                  </div>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {rows.slice(0, 15).map((r, i) => (
                        <tr key={r.hcpcs + i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs font-semibold text-blue-700 w-16">{r.hcpcs}</td>
                          <td className="px-4 py-2 text-gray-700 text-xs truncate">{r.desc}</td>
                          <td className="px-4 py-2 text-right font-semibold text-gray-900 text-xs">{fmtN(r.services)}</td>
                          <td className="px-4 py-2 text-right text-gray-600 text-xs">{fmtN(r.patients)}</td>
                          <td className="px-4 py-2 text-right font-medium text-green-700 text-xs">{fmt$(r.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}

        {/* Providers tab */}
        {tab === 'providers' && cptData && cptData.length > 0 && (
          <div className="card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                  <SortTh label="Services" sortKey="services" sort={provSort} onSort={toggleProvSort} className="text-right" />
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {sortedProvRows.slice(0, 50).map(p => (
                  <tr key={p.npi} className="hover:bg-blue-50/40 cursor-pointer group" onClick={() => { setSelectedNpi(p.npi); setActiveView('profile'); }}>
                    <td className="px-4 py-2.5"><div className="font-medium text-gray-900 group-hover:text-blue-700">{p.name}</div><div className="text-xs text-gray-400 font-mono">NPI {p.npi}</div></td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[160px] truncate">{p.specialty}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{p.city}, {p.state}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(p.services)}</td>
                    <td className="px-4 py-2.5"><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Affiliated physicians tab */}
        {tab === 'physicians' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
              <Users className="w-4 h-4 flex-shrink-0" />
              Physicians affiliated with <strong>{name}</strong> — sourced from CMS Physician Compare (facility_name field). Click any provider to view their full profile including Medicare procedure data and Open Payments.
            </div>
            {physLoading && <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-8"><Loader2 className="w-4 h-4 animate-spin text-blue-500" />Searching Physician Compare…</div>}
            {!physLoading && physicians !== null && physicians.length === 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex gap-2">
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>No affiliated physicians found in Physician Compare for "{name}". The org name in CMS records may differ — try searching by the primary campus name (e.g., "STANFORD HEALTH CARE" or "STANFORD HOSPITAL").</span>
              </div>
            )}
            {!physLoading && physicians && physicians.length > 0 && (
              <div className="card overflow-hidden p-0">
                <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">{physicians.length} affiliated physicians found</div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Physician</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Organization</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {physicians.slice(0, 100).map(p => (
                      <tr key={p.npi} className="hover:bg-blue-50/40 cursor-pointer group" onClick={() => { setSelectedNpi(p.npi); setActiveView('profile'); }}>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">{p.provider_first_name} {p.provider_last_name}{p.cred ? `, ${p.cred}` : ''}</div>
                          <div className="text-xs text-gray-400 font-mono">NPI {p.npi}</div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[140px] truncate">{p.pri_spec}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[140px] truncate">{p.facility_name}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{p.citytown}, {p.state}</td>
                        <td className="px-4 py-2.5"><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main FacilitiesView ──────────────────────────────────────────────────────
interface FacilitiesViewProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string) => void;
  initialQuery?: string;
  onQueryUsed?: () => void;
}

export default function FacilitiesView({ setActiveView, setSelectedNpi, initialQuery, onQueryUsed }: FacilitiesViewProps) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [rawResults, setRawResults] = useState<NppesResult[]>([]);
  const [groups, setGroups] = useState<OrgGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [detail, setDetail] = useState<DetailTarget | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, state: string) => {
    if (!q.trim()) { setRawResults([]); setGroups([]); setTotalCount(0); return; }
    setLoading(true); setError(null);
    try {
      const data = await searchNppes({ organization_name: q.trim(), enumeration_type: 'NPI-2', state: state || undefined, limit: 25 });
      const results = data.results ?? [];
      setRawResults(results); setTotalCount(data.result_count ?? 0); setGroups(groupResults(results));
    } catch (e) { setError((e as Error).message ?? 'Search failed'); }
    finally { setLoading(false); }
  }, []);

  // Handle inbound facility search from provider profile
  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery);
      search(initialQuery, stateFilter);
      onQueryUsed?.();
    }
  }, [initialQuery]);

  const trigger = (q: string, state: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, state), 400);
  };

  const toggleGroup = (idx: number) => setGroups(prev => prev.map((g, i) => i === idx ? { ...g, expanded: !g.expanded } : g));

  if (detail) return <FacilityDetail target={detail} onBack={() => setDetail(null)} setActiveView={setActiveView} setSelectedNpi={setSelectedNpi} />;

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="p-4 border-b border-gray-100 bg-white space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 pr-9" placeholder="Search by health system, hospital, or clinic name…" value={query}
              onChange={e => { setQuery(e.target.value); trigger(e.target.value, stateFilter); }} />
            {query && <button onClick={() => { setQuery(''); setRawResults([]); setGroups([]); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
          </div>
          <select className="select w-28" value={stateFilter} onChange={e => { setStateFilter(e.target.value); trigger(query, e.target.value); }}>
            <option value="">All States</option>
            {US_STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          {loading && <div className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin text-blue-500" />Searching NPPES…</div>}
          {!loading && groups.length > 0 && <span><span className="font-semibold text-gray-900">{rawResults.length}</span>{totalCount > rawResults.length ? ` of ${totalCount.toLocaleString()}` : ''} organizations · {groups.length} unique names</span>}
          {!loading && !query && <span className="text-gray-400">Search the NPPES registry for health systems, hospitals, and clinics</span>}
          <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto"><Building2 className="w-3.5 h-3.5" />NPPES + Medicare PUF 2023</span>
        </div>
      </div>

      {error && <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4" />{error}</div>}

      {!query && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Building2 className="w-12 h-12 mb-4 opacity-20" />
          <div className="text-lg font-medium text-gray-500 mb-1">Find any health system or facility</div>
          <div className="text-sm max-w-sm">Partial name search supported. Same-name groups show count badge — expand to pick a location or click "View as System" to aggregate billing data across all.</div>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {['Mayo Clinic', 'Kaiser Permanente', 'Cleveland Clinic', 'HCA Healthcare', 'Ascension'].map(n => (
              <button key={n} onClick={() => { setQuery(n); search(n, stateFilter); }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-xs text-gray-600 transition-colors">{n}</button>
            ))}
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3 max-w-3xl">
            {groups.map((group, idx) => (
              <GroupCard key={group.name + idx} group={group}
                onSelectSingle={org => setDetail({ kind: 'single', org })}
                onSelectSystem={(name, orgs) => setDetail({ kind: 'system', name, orgs })}
                onToggle={() => toggleGroup(idx)} />
            ))}
          </div>
          {totalCount > rawResults.length && <p className="text-center text-xs text-gray-400 mt-4">Showing {rawResults.length} of {totalCount.toLocaleString()} — refine to narrow results</p>}
        </div>
      )}
      {loading && groups.length === 0 && (
        <div className="flex-1 p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}</div>
      )}
    </div>
  );
}
