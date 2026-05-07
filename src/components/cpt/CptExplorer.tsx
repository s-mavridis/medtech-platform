import { useState } from 'react';
import { Search, Loader2, AlertCircle, TrendingUp, Users, Activity, DollarSign, Building2, MapPin, ChevronRight } from 'lucide-react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useCptExplorer } from '../../hooks/useCptExplorer';
import type { StateAggregate } from '../../hooks/useCptExplorer';

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

function getColor(value: number, max: number): string {
  if (max === 0) return '#e5e7eb';
  const t = Math.min(value / max, 1);
  // Blue gradient: light (#dbeafe) → dark (#1d4ed8)
  const r = Math.round(219 - t * (219 - 29));
  const g = Math.round(190 - t * (190 - 78));
  const b = Math.round(254 - t * (254 - 216));
  return `rgb(${r},${g},${b})`;
}

function UsMap({ stateAggregates }: { stateAggregates: StateAggregate[] }) {
  const [tooltipContent, setTooltipContent] = useState('');
  const byFips = new Map(stateAggregates.map(s => [s.stateFips.padStart(2, '0'), s]));
  const maxServices = Math.max(...stateAggregates.map(s => s.totalServices), 1);

  return (
    <div className="relative">
      <ComposableMap
        projection="geoAlbersUsa"
        style={{ width: '100%', height: 'auto' }}
        data-tooltip-id="map-tooltip"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }: { geographies: any[] }) =>
            geographies.map((geo: any) => {
              const fips = geo.id as string;
              const stateData = byFips.get(fips);
              const fill = stateData ? getColor(stateData.totalServices, maxServices) : '#f3f4f6';
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  onMouseEnter={() => {
                    if (stateData) {
                      setTooltipContent(`${geo.properties.name}: ${fmtN(stateData.totalServices)} services · ${stateData.providerCount} providers · ${fmt$(stateData.totalRevenue)} revenue`);
                    } else {
                      setTooltipContent(`${geo.properties.name}: No data`);
                    }
                  }}
                  onMouseLeave={() => setTooltipContent('')}
                  style={{
                    default: { outline: 'none' },
                    hover: { fill: '#f59e0b', outline: 'none', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      <Tooltip id="map-tooltip" content={tooltipContent} />

      {/* Legend */}
      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
        <span>Low</span>
        <div className="flex-1 h-2 rounded" style={{ background: 'linear-gradient(to right, #dbeafe, #1d4ed8)' }} />
        <span>High volume</span>
      </div>
    </div>
  );
}

type TabId = 'map' | 'providers' | 'institutions';

interface CptExplorerProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string) => void;
}

export default function CptExplorer({ setActiveView, setSelectedNpi }: CptExplorerProps) {
  const [input, setInput] = useState('');
  const [year, setYear] = useState<'2023' | '2022'>('2023');
  const [tab, setTab] = useState<TabId>('map');
  const { summary, loading, error, search } = useCptExplorer();

  const handleSearch = (code?: string) => {
    const q = (code ?? input).trim().toUpperCase();
    if (q) { setInput(q); search(q, year); }
  };

  const handleProviderClick = (npi: string) => {
    setSelectedNpi(npi);
    setActiveView('profile');
  };

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-100 bg-white space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Enter CPT / HCPCS code (e.g. 27447)"
              value={input}
              onChange={e => setInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <select className="select w-28" value={year} onChange={e => setYear(e.target.value as '2023' | '2022')}>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
          </select>
          <button className="btn-primary" onClick={() => handleSearch()} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>

        {/* Quick code buttons */}
        <div className="flex flex-wrap gap-1.5">
          {COMMON_CODES.map(c => (
            <button
              key={c.code}
              onClick={() => handleSearch(c.code)}
              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md text-gray-600 transition-colors"
            >
              <span className="font-mono font-semibold">{c.code}</span>
              <span className="text-gray-400 ml-1">· {c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Querying Medicare PUF {year}…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !summary && !error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Activity className="w-12 h-12 mb-4 opacity-20" />
          <div className="text-lg font-medium text-gray-500 mb-1">CPT / HCPCS Code Explorer</div>
          <div className="text-sm max-w-md text-gray-400">
            Search any CPT or HCPCS code to see geographic concentration, top providers,
            and Medicare reimbursement rates from the {year} Physician PUF.
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && summary && (
        <div className="flex-1 overflow-auto">
          {/* Header summary */}
          <div className="p-4 border-b border-gray-100 bg-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-lg font-bold text-blue-700">{summary.hcpcs}</span>
                  {summary.isTruncated && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Showing top 500 of many providers</span>
                  )}
                </div>
                <div className="text-gray-700 font-medium mt-0.5">{summary.description}</div>
                <div className="text-xs text-gray-400 mt-0.5">Medicare {summary.year} · Physician & Other Practitioners PUF · CMS.gov</div>
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-1"><DollarSign className="w-3.5 h-3.5" /> Medicare Allowed</div>
                <div className="text-xl font-bold text-blue-900">{fmt$(summary.avgAllowedAmt)}</div>
                <div className="text-xs text-blue-500">avg per service</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-green-600 mb-1"><DollarSign className="w-3.5 h-3.5" /> Medicare Payment</div>
                <div className="text-xl font-bold text-green-900">{fmt$(summary.avgPaymentAmt)}</div>
                <div className="text-xs text-green-500">avg paid to provider</div>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-purple-600 mb-1"><TrendingUp className="w-3.5 h-3.5" /> Total Services</div>
                <div className="text-xl font-bold text-purple-900">{fmtN(summary.totalServices)}</div>
                <div className="text-xs text-purple-500">{summary.isTruncated ? 'sample of national' : 'national total'}</div>
              </div>
              <div className="bg-orange-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-xs text-orange-600 mb-1"><Users className="w-3.5 h-3.5" /> Providers</div>
                <div className="text-xl font-bold text-orange-900">{fmtN(summary.totalProviders)}{summary.isTruncated ? '+' : ''}</div>
                <div className="text-xs text-orange-500">billing this code</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white px-4">
            <nav className="flex gap-1">
              {([['map', 'Geographic Map'], ['providers', 'Top Providers'], ['institutions', 'Institutions']] as [TabId, string][]).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
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
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Geographic Concentration — Services by State
                </div>
                <UsMap stateAggregates={summary.stateAggregates} />
              </div>

              {/* State bar chart */}
              <div className="card">
                <div className="font-semibold text-gray-800 mb-3">Top States by Volume</div>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={summary.stateAggregates.slice(0, 15)} margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [
                        name === 'totalServices' ? fmtN(v) + ' services' : fmt$(v),
                        name === 'totalServices' ? 'Services' : 'Revenue',
                      ]}
                    />
                    <Bar dataKey="totalServices" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* State table */}
              <div className="card overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">State</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Services</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Providers</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Est. Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {summary.stateAggregates.slice(0, 20).map((s, i) => (
                      <tr key={s.state} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900">{s.state}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{fmtN(s.totalServices)}</td>
                        <td className="px-4 py-2.5 text-right text-gray-500">{fmtN(s.providerCount)}</td>
                        <td className="px-4 py-2.5 text-right font-medium text-green-700">{fmt$(s.totalRevenue)}</td>
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
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Services</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Patients</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Avg Allowed</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Avg Paid</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {summary.topProviders.map((p, i) => (
                      <tr
                        key={`${p.npi}-${i}`}
                        className="hover:bg-blue-50/40 cursor-pointer group"
                        onClick={() => handleProviderClick(p.npi)}
                      >
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-gray-900 group-hover:text-blue-700">{p.displayName}</div>
                          <div className="text-xs text-gray-400 font-mono">NPI {p.npi}</div>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[160px] truncate">{p.specialty}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MapPin className="w-3 h-3 text-gray-400" />{p.city}, {p.state}
                          </div>
                        </td>
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
              {summary.topInstitutions.length === 0 ? (
                <div className="text-center text-gray-400 py-12 text-sm">
                  No institution-level data found for this code. Providers may be billing individually.
                </div>
              ) : (
                <>
                  {/* Bar chart */}
                  <div className="card">
                    <div className="font-semibold text-gray-800 mb-3">Top Health Systems by Volume</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={summary.topInstitutions.slice(0, 12).map(i => ({
                          name: i.orgName.length > 20 ? i.orgName.slice(0, 20) + '…' : i.orgName,
                          fullName: i.orgName,
                          services: i.totalServices,
                          revenue: i.totalRevenue,
                        }))}
                        margin={{ left: 10, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-40} textAnchor="end" interval={0} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={n => n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n} />
                        <RechartsTooltip
                          formatter={(v: number) => [fmtN(v) + ' services']}
                          labelFormatter={(_, p) => p[0]?.payload?.fullName ?? ''}
                        />
                        <Bar dataKey="services" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Institution table */}
                  <div className="card overflow-hidden p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-8">#</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Institution</th>
                          <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Location</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Providers</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Services</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Avg Allowed</th>
                          <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">Est. Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {summary.topInstitutions.map((inst, i) => (
                          <tr key={`${inst.orgName}-${i}`} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                                <span className="font-medium text-gray-900">{inst.orgName}</span>
                              </div>
                            </td>
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
