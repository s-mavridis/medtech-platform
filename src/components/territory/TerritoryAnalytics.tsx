import { TrendingUp, TrendingDown, Users, DollarSign, Map, Target, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { territories } from '../../data/providers';

const quarterlyTrend = [
  { quarter: 'Q1 2023', hip: 42, knee: 56, shoulder: 18 },
  { quarter: 'Q2 2023', hip: 48, knee: 61, shoulder: 22 },
  { quarter: 'Q3 2023', hip: 51, knee: 58, shoulder: 24 },
  { quarter: 'Q4 2023', hip: 55, knee: 66, shoulder: 19 },
  { quarter: 'Q1 2024', hip: 59, knee: 71, shoulder: 27 },
  { quarter: 'Q2 2024', hip: 63, knee: 74, shoulder: 29 },
];

const repComparison = [
  { rep: 'Alex R.', tam: 18.4, revenue: 6.2, quota: 7.5, providers: 142 },
  { rep: 'Morgan C.', tam: 12.8, revenue: 4.1, quota: 5.2, providers: 98 },
  { rep: 'Jordan W.', tam: 9.2, revenue: 2.8, quota: 3.4, providers: 76 },
];

const procedureGrowth = [
  { name: 'Hip Replacement', growth: 8.4, tam: 8.2, share: 34 },
  { name: 'Knee Replacement', growth: 11.2, tam: 6.8, share: 28 },
  { name: 'Shoulder', growth: 14.1, tam: 3.1, share: 12 },
  { name: 'Spine Fusion', growth: 3.2, tam: 4.4, share: 18 },
  { name: 'Foot & Ankle', growth: 6.7, tam: 1.8, share: 7 },
];

const zipData = [
  { zip: '94108 (SF Financial)', providers: 8, tam: 2.4, opp: 94 },
  { zip: '94115 (Pacific Hts)', providers: 12, tam: 3.1, opp: 91 },
  { zip: '94158 (Mission Bay)', providers: 6, tam: 2.8, opp: 97 },
  { zip: '94118 (Inner Richmond)', providers: 10, tam: 1.9, opp: 78 },
  { zip: '94143 (Parnassus)', providers: 15, tam: 2.6, opp: 82 },
];

const radarData = [
  { metric: 'Volume', SF: 85, Peninsula: 70, EastBay: 55 },
  { metric: 'Commercial Mix', SF: 80, Peninsula: 88, EastBay: 62 },
  { metric: 'Competitor Gap', SF: 72, Peninsula: 68, EastBay: 80 },
  { metric: 'Growth Rate', SF: 78, Peninsula: 75, EastBay: 82 },
  { metric: 'Coverage', SF: 90, Peninsula: 72, EastBay: 58 },
];

export default function TerritoryAnalytics() {
  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Territory selector */}
      <div className="flex items-center gap-3">
        <select className="select w-56">
          {territories.map(t => <option key={t.id}>{t.name}</option>)}
          <option>All Territories</option>
        </select>
        <select className="select w-40">
          <option>2024 (YTD)</option>
          <option>2023 Full Year</option>
          <option>Last 6 months</option>
        </select>
        <select className="select w-44">
          <option>All Procedures</option>
          <option>Hip Replacement</option>
          <option>Knee Replacement</option>
        </select>
        <span className="text-xs text-gray-400 ml-auto">Data: CMS Medicare 2023 PUF + Employer Claims Proxy</span>
      </div>

      {/* TAM cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Addressable Market', value: '$40.4M', sub: 'SF Bay Area · All procedures', icon: DollarSign, color: 'bg-blue-500', trend: '+9.2%' },
          { label: 'Current Territory Revenue', value: '$13.1M', sub: 'Across 3 reps', icon: TrendingUp, color: 'bg-green-500', trend: '+14.8%' },
          { label: 'Market Share', value: '32%', sub: 'Est. vs total market', icon: BarChart2, color: 'bg-purple-500', trend: '+3.1pp' },
          { label: 'Providers in Market', value: '316', sub: '142 / 98 / 76 by territory', icon: Users, color: 'bg-amber-500', trend: '+18 this Q' },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`w-9 h-9 ${card.color} rounded-lg flex items-center justify-center`}>
                <card.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-medium text-green-600 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />{card.trend}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-sm text-gray-500">{card.label}</div>
              <div className="text-xs text-gray-400">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Quarterly trend */}
        <div className="card p-5">
          <div className="section-title mb-1">Procedure Volume Trend</div>
          <div className="text-sm text-gray-500 mb-4">SF Bay Area · Quarterly</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={quarterlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="hip" name="Hip" fill="#3b82f6" stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="knee" name="Knee" fill="#8b5cf6" stackId="a" />
              <Bar dataKey="shoulder" name="Shoulder" fill="#06b6d4" stackId="a" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar comparison */}
        <div className="card p-5">
          <div className="section-title mb-1">Territory Comparison</div>
          <div className="text-sm text-gray-500 mb-4">Multi-dimension performance score</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} />
              <Radar name="SF Bay North" dataKey="SF" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Radar name="Peninsula" dataKey="Peninsula" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} />
              <Radar name="East Bay" dataKey="EastBay" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rep comparison */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="section-title">Territory Performance</div>
          <button className="btn-secondary text-xs">Fair Opportunity Simulator</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Rep / Territory</th>
                <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">TAM</th>
                <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Revenue</th>
                <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Quota</th>
                <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Quota Attainment</th>
                <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Providers</th>
              </tr>
            </thead>
            <tbody>
              {repComparison.map((rep, i) => {
                const pct = Math.round((rep.revenue / rep.quota) * 100);
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{rep.rep}</td>
                    <td className="py-3 text-right text-gray-700">${rep.tam}M</td>
                    <td className="py-3 text-right font-semibold text-gray-900">${rep.revenue}M</td>
                    <td className="py-3 text-right text-gray-500">${rep.quota}M</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 ml-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 90 ? 'bg-green-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className={`text-xs font-semibold w-8 ${pct >= 90 ? 'text-green-600' : pct >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-700">{rep.providers}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Procedure growth */}
        <div className="card p-5">
          <div className="section-title mb-4">Market Growth by Procedure</div>
          <div className="space-y-3">
            {procedureGrowth.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <div className="w-36 text-sm text-gray-700 flex-shrink-0">{p.name}</div>
                <div className="flex-1">
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, p.growth * 5)}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-600 w-12 text-right">+{p.growth}%</span>
                <span className="text-xs text-gray-400 w-12 text-right">${p.tam}M TAM</span>
              </div>
            ))}
          </div>
        </div>

        {/* Zip code heat */}
        <div className="card p-5">
          <div className="section-title mb-4">Opportunity by Zip Code</div>
          <div className="space-y-2">
            {zipData.map(z => (
              <div key={z.zip} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-gray-900">{z.zip}</div>
                  <div className="text-xs text-gray-500">{z.providers} providers</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-700">${z.tam}M TAM</span>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    z.opp >= 90 ? 'bg-red-500' : z.opp >= 80 ? 'bg-amber-500' : 'bg-blue-400'
                  }`}>
                    {z.opp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
