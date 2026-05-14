import { useState, useEffect } from 'react';
import {
  Search, Loader2, AlertCircle, TrendingUp, Users, Activity, DollarSign,
  Building2, MapPin, ChevronRight, X, ArrowLeft, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useCptExplorer } from '../../hooks/useCptExplorer';
import type { StateAggregate, InstitutionAggregate } from '../../hooks/useCptExplorer';
import type { CptProviderRow } from '../../api/cms';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json';

const COMMON_CODES = [
  { code: '27447', label: 'Total Knee Arthroplasty' },
  { code: '27130', label: 'Total Hip Arthroplasty' },
  { code: '22612', label: 'Lumbar Spinal Fusion' },
  { code: '23472', label: 'Total Shoulder Arthroplasty' },
  { code: '29827', label: 'Rotator Cuff Repair' },
  { code: '27486', label: 'Revision Total Knee' },
  { code: '62321', label: 'Epidural Injection' },
  { code: '99213', label: 'Office Visit (Lvl 3)' },
  { code: '70553', label: 'MRI Brain w/ Contrast' },
  { code: '93306', label: 'Echo w/ Doppler' },
];

const fmt$ = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const fmtN = (n: number) => n.toLocaleString();

// ─── Sort helpers ─────────────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc';
interface SortState { key: string; dir: SortDir }

function SortTh({ label, sortKey, sort, onSort, align = 'right' }: {
  label: string; sortKey: string; sort: SortState; onSort: (k: string) => void; align?: 'left' | 'right';
}) {
  const active = sort.key === sortKey;
  return (
    <th onClick={() => onSort(sortKey)}
      className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase cursor-pointer select-none hover:text-gray-800 transition-colors text-${align}`}>
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : ''}`}>
        {label}
        {active
          ? sort.dir === 'desc' ? <ArrowDown className="w-3 h-3 text-blue-500" /> : <ArrowUp className="w-3 h-3 text-blue-500" />
          : <ArrowUpDown className="w-3 h-3 text-gray-300" />}
      </span>
    </th>
  );
}

function useSort(defaultKey: string): [SortState, (k: string) => void] {
  const [sort, setSort] = useState<SortState>({ key: defaultKey, dir: 'desc' });
  const toggle = (k: string) => setSort(s => s.key === k ? { ...s, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key: k, dir: 'desc' });
  return [sort, toggle];
}

function applySortNum<T>(arr: T[], sort: SortState, getter: (r: T, k: string) => number): T[] {
  return [...arr].sort((a, b) => sort.dir === 'desc' ? getter(b, sort.key) - getter(a, sort.key) : getter(a, sort.key) - getter(b, sort.key));
}

// ─── Map ──────────────────────────────────────────────────────────────────────
const STATE_ABBR: Record<string, string> = {
  '01':'AL','02':'AK','04':'AZ','05':'AR','06':'CA','08':'CO','09':'CT','10':'DE','11':'DC',
  '12':'FL','13':'GA','15':'HI','16':'ID','17':'IL','18':'IN','19':'IA','20':'KS','21':'KY',
  '22':'LA','23':'ME','24':'MD','25':'MA','26':'MI','27':'MN','28':'MS','29':'MO','30':'MT',
  '31':'NE','32':'NV','33':'NH','34':'NJ','35':'NM','36':'NY','37':'NC','38':'ND','39':'OH',
  '40':'OK','41':'OR','42':'PA','44':'RI','45':'SC','46':'SD','47':'TN','48':'TX','49':'UT',
  '50':'VT','51':'VA','53':'WA','54':'WV','55':'WI','56':'WY',
};
const STATE_NAMES: Record<string, string> = {
  AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',
  DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',
  IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',
  MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',
  MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',
  NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',
  PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',
  TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',
  WI:'Wisconsin',WY:'Wyoming',
};

function getColor(value: number, max: number): string {
  if (max === 0) return '#e5e7eb';
  const t = Math.min(value / max, 1);
  const r = Math.round(219 - t * (219 - 29));
  const g = Math.round(190 - t * (190 - 78));
  const b = Math.round(254 - t * (254 - 216));
  return `rgb(${r},${g},${b})`;
}

const STATE_CENTROIDS: Record<string, [number, number]> = {
  AL:[-86.8,32.8],AK:[-153.4,64.2],AZ:[-111.7,34.3],AR:[-92.4,34.9],CA:[-119.5,37.3],
  CO:[-105.5,38.9],CT:[-72.7,41.6],DE:[-75.5,38.9],FL:[-81.5,27.8],GA:[-83.4,32.7],
  HI:[-157.8,20.1],ID:[-114.2,44.4],IL:[-89.2,40.0],IN:[-86.3,40.0],IA:[-93.4,42.1],
  KS:[-98.4,38.5],KY:[-84.9,37.5],LA:[-92.4,31.0],ME:[-69.2,45.4],MD:[-76.8,39.0],
  MA:[-71.5,42.3],MI:[-84.7,44.3],MN:[-94.3,46.4],MS:[-89.7,32.5],MO:[-92.5,38.3],
  MT:[-110.5,47.0],NE:[-99.9,41.5],NV:[-116.7,39.5],NH:[-71.5,44.0],NJ:[-74.5,40.1],
  NM:[-106.1,34.4],NY:[-75.5,43.0],NC:[-79.4,35.6],ND:[-100.5,47.4],OH:[-82.8,40.4],
  OK:[-97.5,35.6],OR:[-120.5,44.0],PA:[-77.2,40.9],RI:[-71.5,41.7],SC:[-80.9,33.8],
  SD:[-100.4,44.4],TN:[-86.7,35.9],TX:[-99.3,31.5],UT:[-111.1,39.3],VT:[-72.7,44.0],
  VA:[-78.5,37.8],WA:[-120.5,47.4],WV:[-80.6,38.6],WI:[-89.8,44.7],WY:[-107.6,43.0],
  DC:[-77.0,38.9],
};

function UsMap({ stateAggregates, onStateClick }: {
  stateAggregates: StateAggregate[];
  onStateClick: (abbr: string) => void;
}) {
  const [tooltipContent, setTooltipContent] = useState('');
  const byFips = new Map(stateAggregates.map(s => [s.stateFips.padStart(2, '0'), s]));
  const maxServices = Math.max(...stateAggregates.map(s => s.totalServices), 1);

  return (
    <div className="relative">
      <ComposableMap projection="geoAlbersUsa" style={{ width: '100%', height: 'auto' }} data-tooltip-id="map-tooltip">
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const fips = (geo.id as string).padStart(2, '0');
              const stateData = byFips.get(fips);
              const abbr = STATE_ABBR[fips];
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={stateData ? getColor(stateData.totalServices, maxServices) : '#f3f4f6'}
                  stroke="#fff" strokeWidth={0.5}
                  onClick={() => abbr && stateData && onStateClick(abbr)}
                  onMouseEnter={() => {
                    setTooltipContent(stateData
                      ? `${geo.properties.name}: ${fmtN(stateData.totalServices)} services · ${stateData.providerCount} providers · ${fmt$(stateData.totalRevenue)} — click to drill in`
                      : `${geo.properties.name}: No data`);
                  }}
                  onMouseLeave={() => setTooltipContent('')}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#f59e0b', outline: 'none', cursor: stateData ? 'pointer' : 'default' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
        {Object.entries(STATE_CENTROIDS).map(([abbr, coords]) => (
          <Marker key={abbr} coordinates={coords}>
            <text
              textAnchor="middle"
              style={{ fontFamily: 'sans-serif', fontSize: 7, fontWeight: 600, fill: '#374151', pointerEvents: 'none', userSelect: 'none' }}
            >
              {abbr}
            </text>
          </Marker>
        ))}
      </ComposableMap>
      <Tooltip id="map-tooltip" content={tooltipContent} />
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <span>Low</span>
        <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right, #dbeafe, #1d4ed8)' }} />
        <span>High · Click any state to drill in</span>
      </div>
    </div>
  );
}

// ─── State drill-down panel ───────────────────────────────────────────────────
function StatePanel({
  abbr, hcpcs, description, aggregate, rawRows, allInstitutions,
  onBack, onProviderClick,
}: {
  abbr: string;
  hcpcs: string;
  description: string;
  aggregate: StateAggregate;
  rawRows: CptProviderRow[];
  allInstitutions: InstitutionAggregate[];
  onBack: () => void;
  onProviderClick: (npi: string) => void;
}) {
  const [provSort, toggleProv] = useSort('totalServices');
  const [instSort, toggleInst] = useSort('totalServices');
  const [tab, setTab] = useState<'providers' | 'institutions'>('providers');
  const [provFilter, setProvFilter] = useState('');
  const [instFilter, setInstFilter] = useState('');

  const stateRows = rawRows.filter(r => r.state === abbr);
  const filteredProviders = provFilter
    ? stateRows.filter(p =>
        p.displayName.toLowerCase().includes(provFilter.toLowerCase()) ||
        p.specialty.toLowerCase().includes(provFilter.toLowerCase()) ||
        p.city.toLowerCase().includes(provFilter.toLowerCase())
      )
    : stateRows;
  const sortedProviders = applySortNum(filteredProviders, provSort, (r, k) => {
    if (k === 'totalServices') return r.totalServices;
    if (k === 'uniquePatients') return r.uniquePatients;
    if (k === 'avgAllowedAmt') return r.avgAllowedAmt;
    if (k === 'avgPaymentAmt') return r.avgPaymentAmt;
    return r.totalServices;
  });

  const stateInstitutions = allInstitutions.filter(i => i.state === abbr);
  const filteredInstitutions = instFilter
    ? stateInstitutions.filter(i =>
        i.orgName.toLowerCase().includes(instFilter.toLowerCase()) ||
        i.city.toLowerCase().includes(instFilter.toLowerCase())
      )
    : stateInstitutions;
  const sortedInstitutions = applySortNum(filteredInstitutions, instSort, (r, k) => {
    if (k === 'totalServices') return r.totalServices;
    if (k === 'providerCount') return r.providerCount;
    if (k === 'avgAllowedAmt') return r.avgAllowedAmt;
    if (k === 'totalRevenue') return r.totalRevenue;
    return r.totalServices;
  });

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to map
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{STATE_NAMES[abbr] ?? abbr}</h2>
            <div className="text-sm text-gray-500 mt-0.5">
              <span className="font-mono text-blue-700 font-semibold">{hcpcs}</span> · {description}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-blue-900">{fmtN(aggregate.totalServices)}</div><div className="text-xs text-blue-600">Total services</div></div>
          <div className="bg-orange-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-orange-900">{fmtN(aggregate.providerCount)}</div><div className="text-xs text-orange-600">Providers</div></div>
          <div className="bg-green-50 rounded-lg p-3 text-center"><div className="text-xl font-bold text-green-900">{fmt$(aggregate.totalRevenue)}</div><div className="text-xs text-green-600">Est. Medicare revenue</div></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white px-4">
        <nav className="flex gap-1">
          {([['providers', 'Top Providers'], ['institutions', 'Top Institutions']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {tab === 'providers' && (
          <div className="card overflow-hidden p-0">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Filter by name, specialty, city…"
                value={provFilter}
                onChange={e => setProvFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-6">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">City</th>
                  <SortTh label="Services" sortKey="totalServices" sort={provSort} onSort={toggleProv} />
                  <SortTh label="Patients" sortKey="uniquePatients" sort={provSort} onSort={toggleProv} />
                  <SortTh label="Avg Allowed" sortKey="avgAllowedAmt" sort={provSort} onSort={toggleProv} />
                  <SortTh label="Avg Paid" sortKey="avgPaymentAmt" sort={provSort} onSort={toggleProv} />
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {sortedProviders.slice(0, 100).map((p, i) => (
                  <tr key={`${p.npi}-${i}`} className="hover:bg-blue-50/40 cursor-pointer group" onClick={() => onProviderClick(p.npi)}>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900 group-hover:text-blue-700">{p.displayName}</div>
                      {p.orgName && <div className="text-xs text-purple-600">{p.orgName}</div>}
                      <div className="text-xs text-gray-400 font-mono">NPI {p.npi}</div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-[140px] truncate">{p.specialty}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{p.city}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(p.totalServices)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtN(p.uniquePatients)}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fmt$(p.avgAllowedAmt)}</td>
                    <td className="px-4 py-2.5 text-right text-green-700">{fmt$(p.avgPaymentAmt)}</td>
                    <td className="px-4 py-2.5"><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stateRows.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No individual provider data for this state in the current sample.</div>}
          </div>
        )}

        {tab === 'institutions' && (
          <div className="card overflow-hidden p-0">
            <div className="p-3 border-b border-gray-100">
              <input
                type="text"
                placeholder="Filter by name, specialty, city…"
                value={instFilter}
                onChange={e => setInstFilter(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-6">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Institution</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                  <SortTh label="Providers" sortKey="providerCount" sort={instSort} onSort={toggleInst} />
                  <SortTh label="Services" sortKey="totalServices" sort={instSort} onSort={toggleInst} />
                  <SortTh label="Avg Allowed" sortKey="avgAllowedAmt" sort={instSort} onSort={toggleInst} />
                  <SortTh label="Est. Revenue" sortKey="totalRevenue" sort={instSort} onSort={toggleInst} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {sortedInstitutions.slice(0, 50).map((inst, i) => (
                  <tr key={`${inst.orgName}-${i}`} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-purple-400" /><span className="font-medium text-gray-900">{inst.orgName}</span></div></td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{inst.city}, {inst.state}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{fmtN(inst.providerCount)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(inst.totalServices)}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fmt$(inst.avgAllowedAmt)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmt$(inst.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stateInstitutions.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No institution-level billing data for {STATE_NAMES[abbr] ?? abbr} in the current sample. Providers may be billing individually.</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
type TabId = 'map' | 'providers' | 'institutions';

interface CptExplorerProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string) => void;
  initialCode?: string;
  onCodeUsed?: () => void;
}

export default function CptExplorer({ setActiveView, setSelectedNpi, initialCode, onCodeUsed }: CptExplorerProps) {
  const [input, setInput] = useState('');
  const [year, setYear] = useState<'2023' | '2022'>('2023');
  const [tab, setTab] = useState<TabId>('map');
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [provSort, toggleProv] = useSort('totalServices');
  const [instSort, toggleInst] = useSort('totalServices');
  const { summary, rawRows, loading, error, search } = useCptExplorer();

  const handleSearch = (code?: string) => {
    const q = (code ?? input).trim().toUpperCase();
    if (q) { setInput(q); setSelectedState(null); search(q, year); }
  };

  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      const q = initialCode.trim().toUpperCase();
      setInput(q);
      setSelectedState(null);
      search(q, year);
      onCodeUsed?.();
    }
  }, [initialCode]);

  const handleProviderClick = (npi: string) => { setSelectedNpi(npi); setActiveView('profile'); };

  const sortedProviders = applySortNum(summary?.topProviders ?? [], provSort, (r, k) => {
    if (k === 'totalServices') return r.totalServices;
    if (k === 'uniquePatients') return r.uniquePatients;
    if (k === 'avgAllowedAmt') return r.avgAllowedAmt;
    if (k === 'avgPaymentAmt') return r.avgPaymentAmt;
    return r.totalServices;
  });

  const sortedInstitutions = applySortNum(summary?.topInstitutions ?? [], instSort, (r, k) => {
    if (k === 'totalServices') return r.totalServices;
    if (k === 'providerCount') return r.providerCount;
    if (k === 'avgAllowedAmt') return r.avgAllowedAmt;
    if (k === 'totalRevenue') return r.totalRevenue;
    return r.totalServices;
  });

  // State drill-down
  if (selectedState && summary) {
    const agg = summary.stateAggregates.find(s => s.state === selectedState);
    if (agg) return (
      <StatePanel
        abbr={selectedState}
        hcpcs={summary.hcpcs}
        description={summary.description}
        aggregate={agg}
        rawRows={rawRows}
        allInstitutions={summary.topInstitutions}
        onBack={() => setSelectedState(null)}
        onProviderClick={handleProviderClick}
      />
    );
  }

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-100 bg-white space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Enter CPT / HCPCS code (e.g. 27447)"
              value={input} onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          </div>
          <select className="select w-28" value={year} onChange={e => setYear(e.target.value as '2023' | '2022')}>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>
          <button className="btn-primary" onClick={() => handleSearch()} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_CODES.map(c => (
            <button key={c.code} onClick={() => handleSearch(c.code)}
              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md text-gray-600 transition-colors">
              <span className="font-mono font-semibold">{c.code}</span>
              <span className="text-gray-400 ml-1">· {c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm"><AlertCircle className="w-4 h-4" /> {error}</div>}

      {loading && (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Querying Medicare PUF {year}…</p>
        </div>
      )}

      {!loading && !summary && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Activity className="w-12 h-12 mb-4 opacity-20" />
          <div className="text-lg font-medium text-gray-500 mb-1">CPT / HCPCS Code Explorer</div>
          <div className="text-sm max-w-md">Search any CPT or HCPCS code to see geographic concentration, top providers, and Medicare reimbursement. Click any state on the map to drill into top providers and institutions there.</div>
        </div>
      )}

      {!loading && summary && (
        <div className="flex-1 overflow-auto">
          {/* KPI strip */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-blue-700">{summary.hcpcs}</span>
                  {summary.isTruncated && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Showing top 500 of many providers</span>}
                </div>
                <div className="text-gray-700 font-medium mt-0.5">{summary.description}</div>
                <div className="text-xs text-gray-400 mt-0.5">Medicare {summary.year} · Physician & Other Practitioners PUF · CMS.gov</div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1"><DollarSign className="w-3.5 h-3.5" /> Medicare Allowed</div><div className="text-xl font-bold text-blue-900">{fmt$(summary.avgAllowedAmt)}</div><div className="text-xs text-blue-500">avg per service</div></div>
              <div className="bg-green-50 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs text-green-600 mb-1"><DollarSign className="w-3.5 h-3.5" /> Medicare Payment</div><div className="text-xl font-bold text-green-900">{fmt$(summary.avgPaymentAmt)}</div><div className="text-xs text-green-500">avg paid to provider</div></div>
              <div className="bg-purple-50 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs text-purple-600 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Total Services</div><div className="text-xl font-bold text-purple-900">{fmtN(summary.totalServices)}</div><div className="text-xs text-purple-500">{summary.isTruncated ? 'sample of national' : 'national total'}</div></div>
              <div className="bg-orange-50 rounded-xl p-3"><div className="flex items-center gap-1.5 text-xs text-orange-600 mb-1"><Users className="w-3.5 h-3.5" /> Providers</div><div className="text-xl font-bold text-orange-900">{fmtN(summary.totalProviders)}{summary.isTruncated ? '+' : ''}</div><div className="text-xs text-orange-500">billing this code</div></div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white px-4">
            <nav className="flex gap-1">
              {([['map', 'Geographic Map'], ['providers', 'Top Providers'], ['institutions', 'Institutions']] as [TabId, string][]).map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Map tab */}
          {tab === 'map' && (
            <div className="p-4 space-y-4">
              <div className="card">
                <div className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" /> Geographic Concentration — Services by State
                </div>
                <UsMap stateAggregates={summary.stateAggregates} onStateClick={setSelectedState} />
              </div>
              <div className="card">
                <div className="font-semibold text-gray-800 mb-3">Top States by Volume</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={summary.stateAggregates.slice(0, 15)} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n} />
                    <RechartsTooltip formatter={(v: number) => [fmtN(v) + ' services', 'Services']} />
                    <Bar dataKey="totalServices" fill="#3b82f6" radius={[3, 3, 0, 0]}
                      onClick={(d: any) => d?.state && setSelectedState(d.state)}
                      style={{ cursor: 'pointer' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">State</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Services</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Providers</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Est. Revenue</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.stateAggregates.slice(0, 20).map((s, i) => (
                      <tr key={s.state} className="hover:bg-blue-50/40 cursor-pointer group" onClick={() => setSelectedState(s.state)}>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900 group-hover:text-blue-700">{s.state}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{fmtN(s.totalServices)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{fmtN(s.providerCount)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmt$(s.totalRevenue)}</td>
                        <td className="px-4 py-2.5"><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Providers tab */}
          {tab === 'providers' && (
            <div className="p-4">
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Provider</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Specialty</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                      <SortTh label="Services" sortKey="totalServices" sort={provSort} onSort={toggleProv} />
                      <SortTh label="Patients" sortKey="uniquePatients" sort={provSort} onSort={toggleProv} />
                      <SortTh label="Avg Allowed" sortKey="avgAllowedAmt" sort={provSort} onSort={toggleProv} />
                      <SortTh label="Avg Paid" sortKey="avgPaymentAmt" sort={provSort} onSort={toggleProv} />
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {sortedProviders.map((p, i) => (
                      <tr key={`${p.npi}-${i}`} className="hover:bg-blue-50/40 cursor-pointer group" onClick={() => handleProviderClick(p.npi)}>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5"><div className="font-medium text-gray-900 group-hover:text-blue-700">{p.displayName}</div><div className="text-xs text-gray-400 font-mono">NPI {p.npi}</div></td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[160px] truncate">{p.specialty}</td>
                        <td className="px-4 py-2.5"><div className="flex items-center gap-1 text-xs text-gray-600"><MapPin className="w-3 h-3 text-gray-400" />{p.city}, {p.state}</div></td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(p.totalServices)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-600">{fmtN(p.uniquePatients)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-blue-700">{fmt$(p.avgAllowedAmt)}</td>
                        <td className="px-4 py-2.5 text-right text-green-700">{fmt$(p.avgPaymentAmt)}</td>
                        <td className="px-4 py-2.5"><ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Institutions tab */}
          {tab === 'institutions' && (
            <div className="p-4 space-y-4">
              {sortedInstitutions.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">No institution-level data found. Providers may be billing individually.</div>
              ) : (
                <>
                  <div className="card">
                    <div className="font-semibold text-gray-800 mb-3">Top Health Systems by Volume</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={sortedInstitutions.slice(0, 12).map(i => ({ name: i.orgName.length > 20 ? i.orgName.slice(0, 20) + '…' : i.orgName, fullName: i.orgName, services: i.totalServices }))} margin={{ left: 10, bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n} />
                        <RechartsTooltip formatter={(v: number) => [fmtN(v) + ' services']} labelFormatter={(_, p) => p[0]?.payload?.fullName ?? ''} />
                        <Bar dataKey="services" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Institution</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                          <SortTh label="Providers" sortKey="providerCount" sort={instSort} onSort={toggleInst} />
                          <SortTh label="Services" sortKey="totalServices" sort={instSort} onSort={toggleInst} />
                          <SortTh label="Avg Allowed" sortKey="avgAllowedAmt" sort={instSort} onSort={toggleInst} />
                          <SortTh label="Est. Revenue" sortKey="totalRevenue" sort={instSort} onSort={toggleInst} />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {sortedInstitutions.map((inst, i) => (
                          <tr key={`${inst.orgName}-${i}`} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2.5"><div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-purple-400" /><span className="font-medium text-gray-900">{inst.orgName}</span></div></td>
                            <td className="px-4 py-2.5 text-xs text-gray-500">{inst.city}, {inst.state}</td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{fmtN(inst.providerCount)}</td>
                            <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtN(inst.totalServices)}</td>
                            <td className="px-4 py-2.5 text-right text-blue-700">{fmt$(inst.avgAllowedAmt)}</td>
                            <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmt$(inst.totalRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
