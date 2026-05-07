import { useState, useRef, useEffect } from 'react';
import { GitBranch, Info, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { providers, referralEdges } from '../../data/providers';
import type { Provider } from '../../types';

interface NodePos { x: number; y: number; }

const nodePositions: Record<string, NodePos> = {
  '1234567890': { x: 420, y: 200 },
  '2345678901': { x: 580, y: 100 },
  '3456789012': { x: 660, y: 280 },
  '4567890123': { x: 500, y: 340 },
  '5678901234': { x: 140, y: 160 },
  '6789012345': { x: 720, y: 180 },
  '7890123456': { x: 180, y: 320 },
  '8901234567': { x: 110, y: 260 },
};

const specialtyColors: Record<string, string> = {
  'Orthopedic Surgery': '#3b82f6',
  'Internal Medicine': '#10b981',
  'Family Medicine': '#10b981',
  'Rheumatology': '#8b5cf6',
};

function getColor(specialty: string) {
  return specialtyColors[specialty] || '#6b7280';
}

function Arrow({ x1, y1, x2, y2, weight, active }: { x1: number; y1: number; x2: number; y2: number; weight: number; active: boolean }) {
  const opacity = active ? 0.9 : 0.3;
  const strokeWidth = Math.max(1, Math.min(5, weight / 60));
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const r = 26;
  const ax = x1 + ux * r;
  const ay = y1 + uy * r;
  const bx = x2 - ux * r;
  const by = y2 - uy * r;

  const curve = 30;
  const mx = (ax + bx) / 2 - uy * curve;
  const my = (ay + by) / 2 + ux * curve;

  return (
    <g opacity={opacity}>
      <defs>
        <marker id={`arr-${x1}-${y1}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill={active ? '#3b82f6' : '#94a3b8'} />
        </marker>
      </defs>
      <path
        d={`M${ax},${ay} Q${mx},${my} ${bx},${by}`}
        stroke={active ? '#3b82f6' : '#cbd5e1'}
        strokeWidth={strokeWidth}
        fill="none"
        markerEnd={`url(#arr-${x1}-${y1})`}
      />
      <text x={mx} y={my - 6} textAnchor="middle" fontSize={9} fill="#64748b">{weight}</text>
    </g>
  );
}

interface ReferralNetworkProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string | null) => void;
}

export default function ReferralNetwork({ setActiveView, setSelectedNpi }: ReferralNetworkProps) {
  const [selectedNpi, setSelected] = useState<string | null>(null);
  const [hoveredNpi, setHovered] = useState<string | null>(null);

  const selected = selectedNpi ? providers.find(p => p.npi === selectedNpi) : null;

  const activeEdges = selectedNpi
    ? referralEdges.filter(e => e.sourceNpi === selectedNpi || e.targetNpi === selectedNpi)
    : referralEdges;

  const connectedNpis = new Set<string>();
  if (selectedNpi) {
    activeEdges.forEach(e => { connectedNpis.add(e.sourceNpi); connectedNpis.add(e.targetNpi); });
  }

  const handleNodeClick = (npi: string) => {
    setSelected(npi === selectedNpi ? null : npi);
  };

  const handleViewProfile = (npi: string) => {
    setSelectedNpi(npi);
    setActiveView('profile');
  };

  return (
    <div className="flex h-full fade-in">
      {/* Graph */}
      <div className="flex-1 relative bg-gray-50">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button className="btn-secondary text-xs p-2"><ZoomIn className="w-3.5 h-3.5" /></button>
          <button className="btn-secondary text-xs p-2"><ZoomOut className="w-3.5 h-3.5" /></button>
          <button className="btn-secondary text-xs p-2" onClick={() => setSelected(null)}><RotateCcw className="w-3.5 h-3.5" /></button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 card p-3 text-xs space-y-1.5">
          <div className="font-semibold text-gray-700 mb-1">Legend</div>
          {Object.entries(specialtyColors).filter(([k]) => k !== 'Rheumatology' || true).slice(0,3).map(([spec, color]) => (
            <div key={spec} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-gray-600">{spec}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-600">Rheumatology</span>
          </div>
          <div className="pt-1 border-t border-gray-100 text-gray-500">Arrow thickness = volume</div>
        </div>

        <svg width="100%" height="100%" viewBox="0 0 860 480" preserveAspectRatio="xMidYMid meet">
          {/* Edges */}
          {referralEdges.map((edge, i) => {
            const src = nodePositions[edge.sourceNpi];
            const dst = nodePositions[edge.targetNpi];
            if (!src || !dst) return null;
            const isActive = !selectedNpi || activeEdges.includes(edge);
            return (
              <Arrow key={i} x1={src.x} y1={src.y} x2={dst.x} y2={dst.y}
                weight={edge.patientCount} active={isActive} />
            );
          })}

          {/* Nodes */}
          {providers.map(provider => {
            const pos = nodePositions[provider.npi];
            if (!pos) return null;
            const isSelected = provider.npi === selectedNpi;
            const isConnected = connectedNpis.has(provider.npi);
            const dimmed = selectedNpi && !isSelected && !isConnected;
            const color = getColor(provider.specialty);
            const isOrtho = provider.specialty === 'Orthopedic Surgery';
            const r = isOrtho ? 28 : 22;

            return (
              <g key={provider.npi} opacity={dimmed ? 0.25 : 1}
                onClick={() => handleNodeClick(provider.npi)}
                onMouseEnter={() => setHovered(provider.npi)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {isSelected && (
                  <circle cx={pos.x} cy={pos.y} r={r + 8} fill={color} opacity={0.15} />
                )}
                <circle cx={pos.x} cy={pos.y} r={r}
                  fill={color} stroke={isSelected ? '#1d4ed8' : 'white'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize={10} fontWeight="600" fill="white">
                  {provider.lastName.substring(0, 6)}
                </text>
                <text x={pos.x} y={pos.y + r + 14} textAnchor="middle" fontSize={9} fill="#374151">
                  {provider.address.city}
                </text>
                {provider.opportunityScore >= 88 && (
                  <circle cx={pos.x + r - 4} cy={pos.y - r + 4} r={6} fill="#ef4444" stroke="white" strokeWidth={1.5} />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Detail panel */}
      <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
        {selected ? (
          <div className="p-4 space-y-4 fade-in">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">{selected.name}</div>
                <div className="text-sm text-gray-500">{selected.specialty}</div>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white ${
                selected.opportunityScore >= 90 ? 'bg-red-500' : 'bg-amber-500'
              }`}>
                {selected.opportunityScore}
              </div>
            </div>

            <div className="space-y-2">
              <div className="label">Referrals In / Year</div>
              <div className="text-2xl font-bold text-blue-600">{selected.referralSummary.totalReferralsIn}</div>
              <div className="label mt-2">Referrals Out / Year</div>
              <div className="text-2xl font-bold text-purple-600">{selected.referralSummary.totalReferralsOut}</div>
            </div>

            {selected.referralSummary.topReferralSources.length > 0 && (
              <div>
                <div className="label mb-2">Top Feeder Sources</div>
                {selected.referralSummary.topReferralSources.map(s => (
                  <div key={s} className="flex items-center gap-2 py-1 text-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    {s}
                  </div>
                ))}
              </div>
            )}

            <div>
              <div className="label mb-2">Sends Patients To</div>
              {selected.referralSummary.topReferralDestinations.map(d => (
                <div key={d} className="flex items-center gap-2 py-1 text-sm">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  {d}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <button onClick={() => handleViewProfile(selected.npi)} className="btn-primary w-full justify-center text-xs">
                View Full Profile
              </button>
              <button className="btn-secondary w-full justify-center text-xs">Add to CRM</button>
            </div>

            {/* Connected edges */}
            <div>
              <div className="label mb-2">Patient Flow Connections</div>
              {activeEdges.map((edge, i) => {
                const other = edge.sourceNpi === selected.npi ? edge.targetNpi : edge.sourceNpi;
                const otherProv = providers.find(p => p.npi === other);
                if (!otherProv) return null;
                const isIncoming = edge.targetNpi === selected.npi;
                return (
                  <div key={i} className="flex items-center gap-2 py-1.5 text-xs border-b border-gray-50">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isIncoming ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {isIncoming ? '← In' : '→ Out'}
                    </span>
                    <span className="text-gray-700 flex-1">{otherProv.lastName}</span>
                    <span className="font-semibold text-gray-900">{edge.patientCount} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <GitBranch className="w-4 h-4" /> Patient Referral Network
            </div>
            <div className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3">
              <Info className="w-3.5 h-3.5 inline mr-1.5 text-blue-500" />
              Click any provider node to explore their referral relationships. Arrow thickness indicates patient volume.
            </div>

            <div>
              <div className="label mb-2">Top Feeder Physicians</div>
              {providers.filter(p => p.specialty !== 'Orthopedic Surgery').map(p => (
                <div key={p.npi}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
                  onClick={() => setSelected(p.npi)}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getColor(p.specialty) }} />
                  <span className="text-sm text-gray-700 flex-1">{p.name}</span>
                  <span className="text-xs text-gray-500">{p.referralSummary.totalReferralsOut} out</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <div className="label mb-2">Target Surgeons</div>
              {providers.filter(p => p.specialty === 'Orthopedic Surgery').map(p => (
                <div key={p.npi}
                  className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
                  onClick={() => setSelected(p.npi)}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1">{p.lastName}</span>
                  <span className="text-xs font-bold text-gray-900">{p.opportunityScore}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
