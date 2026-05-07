import { useState } from 'react';
import { Plus, Target, Users, CheckCircle, Clock, Archive, Play, ChevronRight, Zap, Filter } from 'lucide-react';
import { strategies, opportunities } from '../../data/providers';
import type { Strategy } from '../../types';

function StrategyCard({ strategy, onRun }: { strategy: Strategy; onRun: () => void }) {
  const statusColors = {
    active: 'badge-green',
    draft: 'badge-amber',
    archived: 'bg-gray-100 text-gray-500 badge',
  };
  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{strategy.name}</div>
            <div className="text-sm text-gray-500 mt-0.5">{strategy.description}</div>
          </div>
        </div>
        <span className={statusColors[strategy.status]}>{strategy.status}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-xs text-gray-500">Targets Ranked</div>
          <div className="text-lg font-bold text-gray-900 mt-0.5">{strategy.targetCount}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-xs text-gray-500">Min Vol/yr</div>
          <div className="text-lg font-bold text-gray-900 mt-0.5">{strategy.filters.minProcedureVolume || 'Any'}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-2.5">
          <div className="text-xs text-gray-500">Min Commercial</div>
          <div className="text-lg font-bold text-gray-900 mt-0.5">{strategy.filters.minCommercialPct}%</div>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5 flex-wrap">
        {strategy.filters.specialties.map(s => <span key={s} className="badge-blue">{s}</span>)}
        {strategy.filters.procedures.map(c => <span key={c} className="badge bg-gray-100 text-gray-600">{c}</span>)}
        {strategy.filters.maxRoboticPct < 50 && <span className="badge bg-purple-100 text-purple-700">No Robotic</span>}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          Created by {strategy.createdBy} · {strategy.createdAt}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs">Edit</button>
          <button onClick={onRun} className="btn-primary text-xs">
            <Play className="w-3 h-3" /> Run Strategy
          </button>
        </div>
      </div>
    </div>
  );
}

function NewStrategyModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Create Strategy</h2>
          <p className="text-sm text-gray-500 mt-0.5">Define a commercial priority to rank and push targets to your reps</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="label mb-1.5 block">Strategy Name</label>
            <input className="input" placeholder="e.g. Hip Replacement — No Robotics, Commercial >50%" defaultValue="" />
          </div>
          <div>
            <label className="label mb-1.5 block">Description</label>
            <textarea className="input h-20 resize-none" placeholder="Describe the commercial rationale for this strategy..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block">Target Territory</label>
              <select className="select">
                <option>SF Bay Area North</option>
                <option>Peninsula & South Bay</option>
                <option>East Bay & Oakland</option>
                <option>All Territories</option>
              </select>
            </div>
            <div>
              <label className="label mb-1.5 block">Target Specialties</label>
              <select className="select" multiple>
                <option selected>Orthopedic Surgery</option>
                <option>Internal Medicine</option>
                <option>Rheumatology</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block">Procedure Codes (HCPCS)</label>
              <input className="input" placeholder="27130, 27125, 27447..." defaultValue="27130, 27125" />
            </div>
            <div>
              <label className="label mb-1.5 block">Min Procedure Volume / yr</label>
              <input className="input" type="number" defaultValue={50} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label mb-1.5 block">Min Commercial Payer %</label>
              <input className="input" type="number" defaultValue={50} />
            </div>
            <div>
              <label className="label mb-1.5 block">Max Robotic Use %</label>
              <input className="input" type="number" defaultValue={20} />
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-1">
              <Zap className="w-4 h-4" /> AI Scoring Preview
            </div>
            <div className="text-xs text-blue-600">
              Based on your filters, this strategy will score providers on: procedure volume (40%), commercial payer mix (35%),
              absence of competitor relationships (25%). Estimated <strong>23 qualifying providers</strong> in selected territory.
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={onClose} className="btn-secondary">Save as Draft</button>
          <button onClick={onClose} className="btn-primary">
            <Play className="w-3.5 h-3.5" /> Launch Strategy
          </button>
        </div>
      </div>
    </div>
  );
}

interface StrategyEngineProps {
  setActiveView: (v: string) => void;
}

export default function StrategyEngine({ setActiveView }: StrategyEngineProps) {
  const [showNew, setShowNew] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const handleRun = (strategyId: string) => {
    setRunResult(strategyId);
    setTimeout(() => setRunResult(null), 3000);
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {showNew && <NewStrategyModal onClose={() => setShowNew(false)} />}

      {runResult && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-lg fade-in">
          <CheckCircle className="w-4 h-4" />
          Strategy running — ranked targets pushed to reps
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">
            {strategies.filter(s => s.status === 'active').length} active strategies · {strategies.reduce((s, st) => s + st.targetCount, 0)} total targets ranked
          </div>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Strategy
        </button>
      </div>

      {/* Active strategies */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-semibold text-gray-700">Active Strategies</span>
        </div>
        <div className="space-y-4">
          {strategies.filter(s => s.status === 'active').map(s => (
            <StrategyCard key={s.id} strategy={s} onRun={() => handleRun(s.id)} />
          ))}
        </div>
      </div>

      {/* Ranked output preview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-title">Current Ranked Output</div>
            <div className="text-sm text-gray-500">Strategy: Hip Replacement — No Robotics, Commercial &gt;50%</div>
          </div>
          <button onClick={() => setActiveView('targets')} className="btn-secondary text-xs">
            <Filter className="w-3.5 h-3.5" /> View in Rep View
          </button>
        </div>
        <div className="space-y-2">
          {opportunities.map((opp, i) => (
            <div key={opp.provider.npi} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
              <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0 ${
                opp.priority === 'hot' ? 'bg-red-500' : opp.priority === 'warm' ? 'bg-amber-500' : 'bg-blue-400'
              }`}>
                {opp.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900">{opp.provider.name}</div>
                <div className="text-xs text-gray-500 truncate">{opp.reasons[0]}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-semibold">${(opp.estimatedValue / 1000).toFixed(0)}k</div>
                <span className={`badge text-xs ${opp.priority === 'hot' ? 'badge-red' : opp.priority === 'warm' ? 'badge-amber' : 'badge-blue'}`}>
                  {opp.priority}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          ))}
        </div>
      </div>

      {/* Explain scoring */}
      <div className="card p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">How the AI Scoring Engine Works</div>
            <div className="text-sm text-gray-600 mt-1 space-y-1">
              <p>Each provider receives a <strong>Fit Score</strong> (0–100) computed from:</p>
              <ul className="list-disc ml-4 space-y-0.5 text-xs text-gray-500">
                <li><strong>Procedure Volume (40%)</strong> — annual claim volume for target HCPCS codes from Medicare PUF</li>
                <li><strong>Commercial Payer Mix (35%)</strong> — estimated % of commercial patients vs Medicare/Medicaid</li>
                <li><strong>Competitor Gap (25%)</strong> — absence or weakness of competitor relationships from Open Payments</li>
                <li><strong>Bonus modifiers</strong>: no robotic signal (+5), IDN strategic account (+3), referral network centrality (+2)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
