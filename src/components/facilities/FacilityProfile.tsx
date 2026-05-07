import { useState, useCallback, useRef } from 'react';
import { Search, Building2, MapPin, Phone, ChevronRight, Loader2, AlertCircle, X, Info, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { searchNppes, getPracticeAddress, getPrimaryTaxonomy, mapSpecialty, getDisplayName } from '../../api/nppes';
import { getInstitutionCptProfile } from '../../api/cms';
import type { NppesResult } from '../../api/nppes';
import type { CptProviderRow } from '../../api/cms';

const US_STATES = ['','AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
const fmt$ = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString();

function OrgCard({ org, onSelect }: { org: NppesResult; onSelect: () => void }) {
  const addr = getPracticeAddress(org);
  const tax = getPrimaryTaxonomy(org);
  return (
    <div onClick={onSelect} className="card cursor-pointer hover:border-blue-200 hover:shadow-md transition-all group">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{getDisplayName(org)}</div>
            <div className="text-xs text-gray-500 mt-0.5">{tax ? mapSpecialty(tax.code, tax.desc) : 'Health System / Organization'}</div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 mt-1 flex-shrink-0" />
      </div>
      {addr && (
        <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />{addr.address_1}, {addr.city}, {addr.state} {addr.postal_code?.slice(0, 5)}
        </div>
      )}
      <div className="mt-1 text-xs text-gray-400 font-mono">NPI {org.number}</div>
    </div>
  );
}

function FacilityDetail({ org, onBack, setActiveView, setSelectedNpi }: {
  org: NppesResult; onBack: () => void;
  setActiveView: (v: string) => void; setSelectedNpi: (npi: string) => void;
}) {
  const [cptData, setCptData] = useState<CptProviderRow[] | null>(null);
  const [cptLoading, setCptLoading] = useState(true);
  const [cptError, setCptError] = useState<string | null>(null);
  const [tab, setTab] = useState<'cpt' | 'providers'>('cpt');
  const addr = getPracticeAddress(org);
  const name = getDisplayName(org);

  const didLoad = useRef(false);
  if (!didLoad.current) {
    didLoad.current = true;
    getInstitutionCptProfile(name, { limit: 500 })
      .then(rows => setCptData(rows))
      .catch(e => setCptError((e as Error).message))
      .finally(() => setCptLoading(false));
  }

  const cptSummary = (() => {
    if (!cptData) return [];
    const map = new Map<string, { hcpcs: string; desc: string; services: number; patients: number; revenue: number }>();
    for (const r of cptData) {
      const e = map.get(r.hcpcs);
      if (e) { e.services += r.totalServices; e.patients += r.uniquePatients; e.revenue += r.totalServices * r.avgAllowedAmt; }
      else { map.set(r.hcpcs, { hcpcs: r.hcpcs, desc: r.description, services: r.totalServices, patients: r.uniquePatients, revenue: r.totalServices * r.avgAllowedAmt }); }
    }
    return Array.from(map.values()).sort((a, b) => b.services - a.services);
  })();

  const totalServices = cptSummary.reduce((s, r) => s + r.services, 0);
  const totalRevenue = cptSummary.reduce((s, r) => s + r.revenue, 0);
  const providerCount = new Set(cptData?.map(r => r.npi) ?? []).size;

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="p-4 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to search
        </button>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{name}</h2>
            {addr && <div className="flex items-center gap-1 text-sm text-gray-500 mt-1"><MapPin className="w-3.5 h-3.5" />{addr.address_1}, {addr.city}, {addr.state} {addr.postal_code?.slice(0, 5)}</div>}
            {addr?.telephone_number && <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5"><Phone className="w-3.5 h-3.5" />{addr.telephone_number}</div>}
            <div className="text-xs text-gray-400 font-mono mt-1">NPI {org.number}</div>
          </div>
        </div>
        {cptData && cptData.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-900">{fmtN(providerCount)}</div><div className="text-xs text-blue-600">Billing providers</div></div>
            <div className="bg-purple-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-purple-900">{fmtN(totalServices)}</div><div className="text-xs text-purple-600">Total services (2023)</div></div>
            <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-900">{fmt$(totalRevenue)}</div><div className="text-xs text-green-600">Est. Medicare revenue</div></div>
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 bg-white px-4">
        <nav className="flex gap-1">
          {(['cpt', 'providers'] as const).map(id => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {id === 'cpt' ? 'CPT Revenue Mix' : 'Providers'}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {cptLoading && <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-12"><Loader2 className="w-4 h-4 animate-spin text-blue-500" />Loading Medicare procedure data…</div>}
        {cptError && <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{cptError}</div>}
        {!cptLoading && cptData?.length === 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>No Medicare billing data found for <strong>{name}</strong>. CMS stores org names as submitted in billing records — try all-caps (e.g. "MAYO CLINIC") to match how providers report it to Medicare.</span>
          </div>
        )}

        {tab === 'cpt' && cptSummary.length > 0 && (
          <>
            <div className="card">
              <div className="font-semibold text-gray-800 mb-3">Top Procedures by Volume · Medicare 2023</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cptSummary.slice(0, 12).map(r => ({ name: r.hcpcs, services: r.services, desc: r.desc }))} margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n)} />
                  <Tooltip formatter={(v: number) => [fmtN(v) + ' services']} labelFormatter={(_l: string, p: any[]) => p[0]?.payload?.desc ?? _l} />
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
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Services</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Patients</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {cptSummary.slice(0, 30).map((r, i) => (
                    <tr key={r.hcpcs + i} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-700">{r.hcpcs}</td>
                      <td className="px-4 py-2.5 text-gray-700 max-w-xs truncate">{r.desc}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(r.services)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{fmtN(r.patients)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmt$(r.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'providers' && cptData && cptData.length > 0 && (() => {
          const provMap = new Map<string, { npi: string; name: string; specialty: string; city: string; state: string; services: number }>();
          for (const r of cptData) {
            if (provMap.has(r.npi)) { provMap.get(r.npi)!.services += r.totalServices; }
            else { provMap.set(r.npi, { npi: r.npi, name: r.displayName, specialty: r.specialty, city: r.city, state: r.state, services: r.totalServices }); }
          }
          const providers = Array.from(provMap.values()).sort((a, b) => b.services - a.services);
          return (
            <div className="card overflow-hidden p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Services</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {providers.slice(0, 50).map(p => (
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
          );
        })()}
      </div>
    </div>
  );
}

interface FacilitiesViewProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string) => void;
}

export default function FacilitiesView({ setActiveView, setSelectedNpi }: FacilitiesViewProps) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [results, setResults] = useState<NppesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<NppesResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string, state: string) => {
    if (!q.trim()) { setResults([]); setTotalCount(0); return; }
    setLoading(true); setError(null);
    try {
      const data = await searchNppes({ organization_name: q.trim(), enumeration_type: 'NPI-2', state: state || undefined, limit: 25 });
      setResults(data.results ?? []);
      setTotalCount(data.result_count ?? 0);
    } catch (e) { setError((e as Error).message ?? 'Search failed'); }
    finally { setLoading(false); }
  }, []);

  const trigger = (q: string, state: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(q, state), 500);
  };

  if (selected) return <FacilityDetail org={selected} onBack={() => setSelected(null)} setActiveView={setActiveView} setSelectedNpi={setSelectedNpi} />;

  return (
    <div className="flex flex-col h-full fade-in">
      <div className="p-4 border-b border-gray-100 bg-white space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9 pr-9" placeholder="Search by health system, hospital, or clinic name…" value={query}
              onChange={e => { setQuery(e.target.value); trigger(e.target.value, stateFilter); }} />
            {query && <button onClick={() => { setQuery(''); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
          </div>
          <select className="select w-28" value={stateFilter} onChange={e => { setStateFilter(e.target.value); trigger(query, e.target.value); }}>
            <option value="">All States</option>
            {US_STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          {loading && <div className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin text-blue-500" />Searching NPPES…</div>}
          {!loading && results.length > 0 && <span><span className="font-semibold text-gray-900">{results.length}</span>{totalCount > results.length ? ` of ${totalCount.toLocaleString()}` : ''} organizations found</span>}
          {!loading && !query && <span className="text-gray-400">Search the NPPES registry for health systems, hospitals, and clinics</span>}
          <span className="flex items-center gap-1 text-xs text-gray-400 ml-auto"><Building2 className="w-3.5 h-3.5" />NPPES + Medicare PUF 2023</span>
        </div>
      </div>

      {error && <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4 flex-shrink-0" />{error}</div>}

      {!query && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Building2 className="w-12 h-12 mb-4 opacity-20" />
          <div className="text-lg font-medium text-gray-500 mb-1">Find any health system or facility</div>
          <div className="text-sm max-w-sm">Search by organization name to see their Medicare CPT billing mix, revenue by procedure, and individual providers — sourced from NPPES and the 2023 Medicare PUF.</div>
          <div className="mt-5 flex flex-wrap gap-2 justify-center">
            {['Mayo Clinic', 'Kaiser Permanente', 'Cleveland Clinic', 'HCA Healthcare', 'Ascension'].map(n => (
              <button key={n} onClick={() => { setQuery(n); search(n, stateFilter); }}
                className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-xs text-gray-600 transition-colors">{n}</button>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-1 gap-3 max-w-3xl">
            {results.map(org => <OrgCard key={org.number} org={org} onSelect={() => setSelected(org)} />)}
          </div>
          {totalCount > results.length && <p className="text-center text-xs text-gray-400 mt-4">Showing {results.length} of {totalCount.toLocaleString()} — refine to narrow results</p>}
        </div>
      )}
      {loading && results.length === 0 && (
        <div className="flex-1 p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />)}
        </div>
      )}
    </div>
  );
}
