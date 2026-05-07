import { Phone, MapPin, Star, ChevronRight, Zap, Clock, CheckCircle, Filter, Navigation } from 'lucide-react';
import { opportunities } from '../../data/providers';
import type { Opportunity } from '../../types';

function ScoreBadge({ score, priority }: { score: number; priority: string }) {
  const bg = priority === 'hot' ? 'bg-red-500' : priority === 'warm' ? 'bg-amber-500' : 'bg-blue-400';
  return (
    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center font-bold text-white text-lg flex-shrink-0 shadow-sm`}>
      {score}
    </div>
  );
}

function OpportunityCard({ opp, onSelect }: { opp: Opportunity; onSelect: () => void }) {
  const topReason = opp.reasons[0];
  const hipVol = opp.provider.procedureVolumes.find(p => p.category === 'Hip Replacement');
  const kneeVol = opp.provider.procedureVolumes.find(p => p.category === 'Knee Replacement');

  return (
    <div
      onClick={onSelect}
      className="card p-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className="flex gap-4">
        <ScoreBadge score={opp.score} priority={opp.priority} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {opp.provider.name}
              </div>
              <div className="text-sm text-gray-500">
                {opp.provider.specialty} · {opp.provider.address.city}, {opp.provider.address.state}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-sm font-semibold text-gray-900">${(opp.estimatedValue / 1000).toFixed(0)}k est.</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>

          {/* Why this provider */}
          <div className="mt-2 bg-blue-50 rounded-lg px-3 py-2">
            <div className="flex items-start gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
              <span className="text-xs text-blue-700 font-medium">{topReason}</span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-4 flex-wrap">
            {hipVol && (
              <span className="text-xs text-gray-600">
                <span className="font-semibold">{hipVol.totalClaims}</span> hip/yr
              </span>
            )}
            {kneeVol && (
              <span className="text-xs text-gray-600">
                <span className="font-semibold">{kneeVol.totalClaims}</span> knee/yr
              </span>
            )}
            <span className="text-xs text-gray-600">
              <span className="font-semibold">{opp.provider.payerMix.commercial}%</span> commercial
            </span>
            {opp.provider.idn && (
              <span className="badge-blue text-xs">{opp.provider.idn}</span>
            )}
            {opp.provider.competitorSignals.length === 0 && (
              <span className="badge-green text-xs">No competitor signal</span>
            )}
          </div>

          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {opp.lastContact ? (
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="w-3 h-3" /> Last contact: {opp.lastContact}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                  <Clock className="w-3 h-3" /> Not yet contacted
                </span>
              )}
            </div>
            {opp.nextAction && (
              <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                <CheckCircle className="w-3 h-3" /> {opp.nextAction}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TodaysTargetsProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string) => void;
}

export default function TodaysTargets({ setActiveView, setSelectedNpi }: TodaysTargetsProps) {
  const hot = opportunities.filter(o => o.priority === 'hot');
  const warm = opportunities.filter(o => o.priority === 'warm');

  const handleSelect = (npi: string) => {
    setSelectedNpi(npi);
    setActiveView('profile');
  };

  return (
    <div className="p-6 fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-sm text-gray-500">Strategy: <span className="font-medium text-gray-700">Hip Replacement — No Robotics, Commercial &gt;50%</span></div>
          <div className="text-xs text-gray-400 mt-0.5">Updated with 2023 Medicare PUF · 23 targets ranked for SF Bay Area North</div>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs">
            <Navigation className="w-3.5 h-3.5" /> Plan Route
          </button>
          <button className="btn-secondary text-xs">
            <Filter className="w-3.5 h-3.5" /> Filter
          </button>
        </div>
      </div>

      {/* Hot */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-sm font-semibold text-gray-700">Hot — Act Now</span>
          <span className="badge-red">{hot.length}</span>
        </div>
        <div className="space-y-3">
          {hot.map(opp => (
            <OpportunityCard key={opp.provider.npi} opp={opp} onSelect={() => handleSelect(opp.provider.npi)} />
          ))}
        </div>
      </div>

      {/* Warm */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-sm font-semibold text-gray-700">Warm — Follow Up</span>
          <span className="badge-amber">{warm.length}</span>
        </div>
        <div className="space-y-3">
          {warm.map(opp => (
            <OpportunityCard key={opp.provider.npi} opp={opp} onSelect={() => handleSelect(opp.provider.npi)} />
          ))}
        </div>
      </div>

      {/* Nearby card (mobile UX preview) */}
      <div className="mt-6 card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-medium text-gray-900 text-sm">Nearby Opportunities</div>
            <div className="text-xs text-gray-500">3 high-fit providers within 5 miles of current location</div>
          </div>
          <button className="ml-auto btn-primary text-xs">View Map</button>
        </div>
      </div>
    </div>
  );
}
