import { useState, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Info, Users, MapPin, ChevronRight, X } from 'lucide-react';
import { searchNppes, lookupNpi, getPracticeAddress, getPrimaryTaxonomy, mapSpecialty, getDisplayName } from '../../api/nppes';
import type { NppesResult } from '../../api/nppes';

const SPECIALTY_COLORS: Record<string, string> = {
  'Orthopedic Surgery': '#3b82f6',
  'Internal Medicine':  '#8b5cf6',
  'Family Medicine':    '#10b981',
  'Cardiology':         '#f59e0b',
  'General Surgery':    '#ef4444',
  'Neurology':          '#06b6d4',
  'Rheumatology':       '#ec4899',
  'Gastroenterology':   '#84cc16',
  'Physical Medicine & Rehabilitation': '#f97316',
};

function nodeColor(specialty: string): string {
  return SPECIALTY_COLORS[specialty] ?? '#6b7280';
}

// Radial layout: center node + surrounding nodes
function radialPositions(count: number, cx: number, cy: number, r: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / count - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / count - Math.PI / 2),
  }));
}

interface NetworkNode {
  npi: string;
  name: string;
  specialty: string;
  city: string;
  state: string;
  zip: string;
  isCenter: boolean;
}

interface ReferralNetworkProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string | null) => void;
}

export default function ReferralNetwork({ setActiveView, setSelectedNpi }: ReferralNetworkProps) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NppesResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [center, setCenter] = useState<NetworkNode | null>(null);
  const [peers, setPeers] = useState<NetworkNode[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const parts = q.trim().split(/\s+/);
      const data = await searchNppes({
        first_name: parts.length > 1 ? parts[0] : undefined,
        last_name: parts.length > 1 ? parts[parts.length - 1] : parts[0],
        enumeration_type: 'NPI-1',
        limit: 10,
      });
      setSearchResults(data.results ?? []);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const selectProvider = useCallback(async (result: NppesResult) => {
    setSearchResults([]);
    setError(null);
    setLoadingPeers(true);

    const addr = getPracticeAddress(result);
    const tax = getPrimaryTaxonomy(result);
    const specialty = mapSpecialty(tax?.code ?? '', tax?.desc ?? '');

    setCenter({
      npi: result.number,
      name: getDisplayName(result),
      specialty,
      city: addr?.city ?? '',
      state: addr?.state ?? '',
      zip: addr?.postal_code?.slice(0, 5) ?? '',
      isCenter: true,
    });
    setPeers([]);

    try {
      // Find co-practitioners: same specialty in same ZIP code
      const zip = addr?.postal_code?.slice(0, 5);
      const data = await searchNppes({
        taxonomy_description: tax?.desc ?? specialty,
        postal_code: zip || undefined,
        state: addr?.state || undefined,
        enumeration_type: 'NPI-1',
        limit: 20,
      });

      const colleagues = (data.results ?? [])
        .filter(r => r.number !== result.number)
        .slice(0, 12)
        .map(r => {
          const a = getPracticeAddress(r);
          const t = getPrimaryTaxonomy(r);
          return {
            npi: r.number,
            name: getDisplayName(r),
            specialty: mapSpecialty(t?.code ?? '', t?.desc ?? ''),
            city: a?.city ?? '',
            state: a?.state ?? '',
            zip: a?.postal_code?.slice(0, 5) ?? '',
            isCenter: false,
          };
        });

      setPeers(colleagues);
      if (colleagues.length === 0) setError(`No co-practitioners found in ZIP ${zip} for ${specialty}. The network shows providers sharing the same specialty and practice area.`);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load network');
    } finally {
      setLoadingPeers(false);
    }
  }, []);

  const allNodes = center ? [center, ...peers] : [];
  const cx = 340, cy = 240, radius = 170;
  const positions = center
    ? [{ x: cx, y: cy }, ...radialPositions(peers.length, cx, cy, radius)]
    : [];

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 pr-9"
              placeholder="Search a provider to build their practice network…"
              value={query}
              onChange={e => { setQuery(e.target.value); handleSearch(e.target.value); }}
            />
            {query && (
              <button onClick={() => { setQuery(''); setSearchResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          {searching && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </div>

        {/* Search dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-10 mt-1 w-96 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-auto">
            {searchResults.map(r => {
              const addr = getPracticeAddress(r);
              const tax = getPrimaryTaxonomy(r);
              return (
                <button key={r.number} onClick={() => { setQuery(getDisplayName(r)); selectProvider(r); }}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0">
                  <div className="font-medium text-sm text-gray-900">{getDisplayName(r)}</div>
                  <div className="text-xs text-gray-500">{mapSpecialty(tax?.code ?? '', tax?.desc ?? '')} · {addr?.city}, {addr?.state}</div>
                  <div className="text-xs text-gray-400 font-mono">NPI {r.number}</div>
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5" />
          Shows providers sharing the same specialty and practice area (ZIP) from NPPES — a proxy for co-practitioner networks. True referral patterns require CMS shared-patient data.
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Empty state */}
      {!center && !loadingPeers && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Users className="w-12 h-12 mb-4 opacity-20" />
          <div className="text-lg font-medium text-gray-500 mb-1">Practice Network Explorer</div>
          <div className="text-sm max-w-sm">Search for a provider to see their co-practitioners — physicians sharing the same specialty and practice ZIP code, sourced live from NPPES.</div>
        </div>
      )}

      {loadingPeers && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Building practice network from NPPES…</p>
        </div>
      )}

      {/* Network graph + sidebar */}
      {center && !loadingPeers && (
        <div className="flex-1 flex overflow-hidden">
          {/* SVG graph */}
          <div className="flex-1 overflow-hidden relative">
            <svg width="100%" height="100%" viewBox="0 0 680 480" className="w-full h-full">
              {/* Edges */}
              {positions.slice(1).map((pos, i) => (
                <line key={i} x1={cx} y1={cy} x2={pos.x} y2={pos.y}
                  stroke={highlighted === peers[i]?.npi ? '#3b82f6' : '#e5e7eb'}
                  strokeWidth={highlighted === peers[i]?.npi ? 2 : 1.5}
                  strokeDasharray={highlighted === peers[i]?.npi ? undefined : '4 3'}
                />
              ))}

              {/* Peer nodes */}
              {peers.map((node, i) => {
                const pos = positions[i + 1];
                if (!pos) return null;
                const isHL = highlighted === node.npi;
                const color = nodeColor(node.specialty);
                return (
                  <g key={node.npi} className="cursor-pointer"
                    onClick={() => setHighlighted(isHL ? null : node.npi)}
                    onDoubleClick={() => { setSelectedNpi(node.npi); setActiveView('profile'); }}>
                    <circle cx={pos.x} cy={pos.y} r={isHL ? 26 : 22} fill={color} opacity={isHL ? 1 : 0.75}
                      stroke={isHL ? '#1d4ed8' : 'white'} strokeWidth={isHL ? 2.5 : 1.5} />
                    <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                      fill="white" fontSize={9} fontWeight="600">
                      {node.name.split(',')[0].split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
                    </text>
                    <text x={pos.x} y={pos.y + (isHL ? 33 : 29)} textAnchor="middle"
                      fill="#374151" fontSize={8.5} fontWeight={isHL ? '600' : '400'}>
                      {node.name.split(',')[0].split(' ').slice(-1)[0]}
                    </text>
                  </g>
                );
              })}

              {/* Center node */}
              {center && (
                <g onDoubleClick={() => { setSelectedNpi(center.npi); setActiveView('profile'); }} className="cursor-pointer">
                  <circle cx={cx} cy={cy} r={36} fill={nodeColor(center.specialty)} stroke="#1d4ed8" strokeWidth={3} />
                  <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize={10} fontWeight="700">
                    {center.name.split(',')[0].split(' ').map((w: string) => w[0]).join('').slice(0, 3)}
                  </text>
                  <text x={cx} y={cy + 9} textAnchor="middle" fill="white" fontSize={8}>CENTER</text>
                  <text x={cx} y={cy + 46} textAnchor="middle" fill="#374151" fontSize={9} fontWeight="600">
                    {center.name.split(',')[0].split(' ').slice(-1)[0]}
                  </text>
                </g>
              )}

              {/* Legend */}
              <text x={12} y={468} fill="#9ca3af" fontSize={9}>Click node to highlight · Double-click to view profile</text>
            </svg>
          </div>

          {/* Sidebar */}
          <div className="w-72 border-l border-gray-100 overflow-auto bg-white flex flex-col">
            {/* Center provider */}
            <div className="p-4 border-b border-gray-100">
              <div className="text-xs font-semibold text-gray-400 uppercase mb-2">Center Provider</div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ background: nodeColor(center.specialty) }}>
                  {center.name.split(',')[0].split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{center.name}</div>
                  <div className="text-xs text-gray-500">{center.specialty}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{center.city}, {center.state} {center.zip}</div>
                </div>
              </div>
              <button onClick={() => { setSelectedNpi(center.npi); setActiveView('profile'); }}
                className="mt-2 w-full text-xs text-blue-600 hover:text-blue-800 text-left">View full profile →</button>
            </div>

            {/* Network stats */}
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>{peers.length} co-practitioners found</span>
              <span className="text-gray-400">same ZIP · same specialty</span>
            </div>

            {/* Peer list */}
            <div className="flex-1 overflow-auto divide-y divide-gray-50">
              {allNodes.slice(1).map(node => (
                <div key={node.npi}
                  className={`px-4 py-3 cursor-pointer transition-colors ${highlighted === node.npi ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setHighlighted(highlighted === node.npi ? null : node.npi)}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: nodeColor(node.specialty) }}>
                      {node.name.split(',')[0].split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{node.name}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{node.city}, {node.state}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setSelectedNpi(node.npi); setActiveView('profile'); }}
                      className="text-gray-300 hover:text-blue-500">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
