import { Building2, MapPin, Star, Users, TrendingUp, ChevronRight, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { facilities } from '../../data/providers';

interface FacilityCardProps {
  facilityId: string;
  onSelect: (id: string) => void;
}

function FacilityCard({ facility, onSelect }: { facility: typeof facilities[0]; onSelect: () => void }) {
  const totalProcs = facility.procedureVolumes.reduce((s, p) => s + p.totalClaims, 0);
  return (
    <div
      className="card p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
      onClick={onSelect}
    >
      <div className="flex gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          facility.type === 'Hospital' ? 'bg-blue-100' : facility.type === 'ASC' ? 'bg-green-100' : 'bg-purple-100'
        }`}>
          <Building2 className={`w-6 h-6 ${
            facility.type === 'Hospital' ? 'text-blue-600' : facility.type === 'ASC' ? 'text-green-600' : 'text-purple-600'
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{facility.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`badge text-xs ${facility.type === 'Hospital' ? 'badge-blue' : facility.type === 'ASC' ? 'badge-green' : 'badge-purple'}`}>
                  {facility.type}
                </span>
                {facility.cmsRating && (
                  <div className="flex items-center gap-0.5 text-xs text-amber-500">
                    {Array.from({ length: facility.cmsRating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                  </div>
                )}
                {facility.idn && <span className="text-xs text-gray-500">{facility.idn}</span>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="w-3.5 h-3.5" />
            {facility.address.city}, {facility.address.state} · {facility.address.zip}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-gray-400">Affiliated Providers</div>
              <div className="font-semibold text-gray-900">{facility.affiliatedProviders}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Annual Procedures</div>
              <div className="font-semibold text-gray-900">{totalProcs.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Commercial Mix</div>
              <div className="font-semibold text-gray-900">{facility.payerMix.commercial}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FacilityDetailView({ facility, onBack }: { facility: typeof facilities[0]; onBack: () => void }) {
  return (
    <div className="fade-in">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back to Facilities
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">{facility.name}</span>
      </div>

      <div className="p-6 space-y-6">
        <div className="card p-6">
          <div className="flex gap-5">
            <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${facility.type === 'Hospital' ? 'bg-blue-100' : 'bg-green-100'}`}>
              <Building2 className={`w-8 h-8 ${facility.type === 'Hospital' ? 'text-blue-600' : 'text-green-600'}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{facility.name}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="badge-blue">{facility.type}</span>
                {facility.cmsRating && (
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {Array.from({ length: facility.cmsRating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                    <span className="text-sm text-gray-600 ml-1">CMS Rating</span>
                  </div>
                )}
                {facility.idn && <span className="badge bg-indigo-100 text-indigo-700">{facility.idn}</span>}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-2">
                <MapPin className="w-4 h-4" /> {facility.address.street}, {facility.address.city}, {facility.address.state}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4 pt-5 border-t border-gray-100">
            {facility.beds && (
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{facility.beds}</div>
                <div className="text-xs text-gray-500">Licensed Beds</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{facility.affiliatedProviders}</div>
              <div className="text-xs text-gray-500">Affiliated Providers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{facility.payerMix.commercial}%</div>
              <div className="text-xs text-gray-500">Commercial Mix</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{facility.specialties.length}</div>
              <div className="text-xs text-gray-500">Specialties</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="card p-5">
            <div className="section-title mb-4">Procedure Volume Trend</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={facility.monthlyVolumes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="procedures" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Procedures" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <div className="section-title mb-4">Top Procedures</div>
            <div className="space-y-3">
              {facility.procedureVolumes.map((pv, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-blue-600 w-14 flex-shrink-0">{pv.hcpcs}</span>
                  <div className="flex-1">
                    <div className="text-xs text-gray-700 mb-1 truncate">{pv.description}</div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(100, (pv.totalClaims / 1500) * 100)}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-16 text-right">{pv.totalClaims.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="section-title mb-3">Payer Mix</div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Commercial', value: facility.payerMix.commercial, color: 'bg-blue-500' },
              { label: 'Medicare', value: facility.payerMix.medicare, color: 'bg-purple-500' },
              { label: 'Medicaid', value: facility.payerMix.medicaid, color: 'bg-cyan-500' },
              { label: 'Self-Pay', value: facility.payerMix.selfPay, color: 'bg-gray-400' },
            ].map(p => (
              <div key={p.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">{p.label}</span>
                  <span className="font-semibold text-gray-900">{p.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${p.color} rounded-full`} style={{ width: `${p.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface FacilitiesViewProps {
  setActiveView: (v: string) => void;
}

export default function FacilitiesView({ setActiveView }: FacilitiesViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    const fac = facilities.find(f => f.id === selectedId);
    if (fac) return <FacilityDetailView facility={fac} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="p-6 fade-in">
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <input className="input flex-1" placeholder="Search facilities by name, city, IDN..." />
          <select className="select w-40">
            <option>All Types</option>
            <option>Hospital</option>
            <option>ASC</option>
            <option>Clinic</option>
          </select>
          <select className="select w-40">
            <option>All IDNs</option>
            <option>UCSF Health</option>
            <option>Sutter Health</option>
            <option>Stanford Health Care</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {facilities.map(fac => (
          <FacilityCard key={fac.id} facility={fac} onSelect={() => setSelectedId(fac.id)} />
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
