import { TrendingUp, Users, DollarSign, Target, ArrowRight, Database, Search, Activity } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { opportunities, territories } from '../../data/providers';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const revenueData = months.map((m, i) => ({
  month: m,
  revenue: Math.round((380000 + i * 28000) * (0.85 + Math.random() * 0.3)),
  target: 500000 + i * 20000,
}));

const procedureMix = [
  { name: 'Hip Replacement',  value: 42, color: '#3b82f6' },
  { name: 'Knee Replacement', value: 35, color: '#8b5cf6' },
  { name: 'Shoulder',         value: 14, color: '#06b6d4' },
  { name: 'Other',            value: 9,  color: '#d1d5db' },
];

const dataSources = [
  { name: 'NPPES NPI Registry',         status: 'live',    records: '7.4M providers',   url: 'https://npiregistry.cms.hhs.gov' },
  { name: 'CMS Open Payments 2022',     status: 'live',    records: '13.3M payments',   url: 'https://openpaymentsdata.cms.gov' },
  { name: 'Medicare Physician PUF 2022',status: 'partial', records: 'By NPI lookup',     url: 'https://data.cms.gov' },
  { name: 'CMS Physician Compare',      status: 'live',    records: 'Hospital affil.',   url: 'https://data.cms.gov/provider-data' },
];

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.ElementType; color: string;
}) {
  return (
    <div className="stat-card">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

interface DashboardProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string | null) => void;
}

export default function Dashboard({ setActiveView, setSelectedNpi }: DashboardProps) {
  const terr = territories[0];
  const quotaPct = Math.round((terr.currentRevenue / terr.quota) * 100);

  const handleNpiLookup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const npi = (e.currentTarget.elements.namedItem('npi') as HTMLInputElement).value.trim();
    if (/^\d{10}$/.test(npi)) {
      setSelectedNpi(npi);
      setActiveView('profile');
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in">

      {/* Quick search bar */}
      <div className="card p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1">
            <button onClick={() => setActiveView('search')}
              className="flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all text-gray-400 text-sm">
              <Search className="w-4 h-4 text-gray-400" />
              Search 7M+ providers by name, NPI, specialty, location…
            </button>
          </div>
          <form onSubmit={handleNpiLookup} className="flex gap-2">
            <input
              name="npi"
              className="input w-44 font-mono text-sm"
              placeholder="NPI lookup (10 digits)"
              maxLength={10}
              pattern="\d{10}"
            />
            <button type="submit" className="btn-primary text-xs">Look Up</button>
          </form>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Ranked Targets" value="23" sub="Active strategy · SF Bay Area" icon={Target} color="bg-blue-500" />
        <StatCard label="Est. Pipeline Value" value="$4.5M" sub="Across all territories" icon={DollarSign} color="bg-green-500" />
        <StatCard label="Quota Attainment" value={`${quotaPct}%`} sub={`$${(terr.currentRevenue/1e6).toFixed(1)}M of $${(terr.quota/1e6).toFixed(1)}M`} icon={TrendingUp} color="bg-purple-500" />
        <StatCard label="Providers in Territory" value={String(terr.providerCount)} sub="NPI-verified, NPPES enriched" icon={Users} color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue trend */}
        <div className="col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-title">Revenue vs Target</div>
              <div className="text-sm text-gray-500">SF Bay Area North · 2025 YTD</div>
            </div>
            <span className="badge-green">On Track</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${(v/1000).toFixed(0)}k`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#revGrad)" name="Revenue" />
              <Area type="monotone" dataKey="target"  stroke="#e2e8f0" strokeWidth={1.5} fill="none" strokeDasharray="4 3" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Procedure mix */}
        <div className="card p-5">
          <div className="section-title mb-1">Procedure Mix</div>
          <div className="text-sm text-gray-500 mb-4">By revenue contribution</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={procedureMix} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                {procedureMix.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`]} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {procedureMix.map(p => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-gray-600">{p.name}</span>
                </div>
                <span className="font-medium text-gray-900">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Top opportunities */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="section-title">Top Ranked Providers</div>
            <button onClick={() => setActiveView('strategies')} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
              View strategy <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {opportunities.slice(0, 5).map(opp => (
              <div key={opp.provider.npi}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                onClick={() => { setSelectedNpi(opp.provider.npi); setActiveView('profile'); }}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                  opp.priority === 'hot' ? 'bg-red-500' : opp.priority === 'warm' ? 'bg-amber-500' : 'bg-blue-400'
                }`}>
                  {opp.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">{opp.provider.name}</div>
                  <div className="text-xs text-gray-500 truncate">{opp.provider.specialty} · {opp.provider.address.city}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900">${(opp.estimatedValue/1000).toFixed(0)}k</div>
                  <span className={`badge text-xs ${opp.priority === 'hot' ? 'badge-red' : opp.priority === 'warm' ? 'badge-amber' : 'badge-blue'}`}>
                    {opp.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live data sources */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-blue-500" />
            <div className="section-title">Connected Data Sources</div>
          </div>
          <div className="space-y-3">
            {dataSources.map(ds => (
              <div key={ds.name} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-xl">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ds.status === 'live' ? 'bg-green-400' : 'bg-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{ds.name}</div>
                  <div className="text-xs text-gray-500">{ds.records}</div>
                </div>
                <a href={ds.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  CMS.gov ↗
                </a>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
            <Database className="w-3.5 h-3.5 inline mr-1" />
            All data sourced from public CMS APIs — no auth required.
          </div>
        </div>
      </div>
    </div>
  );
}
