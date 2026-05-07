import { useState, useEffect, useRef } from 'react';
import { Search, SlidersHorizontal, ChevronRight, MapPin, Loader2, AlertCircle, X, Database, Info } from 'lucide-react';
import { useProviderSearch } from '../../hooks/useProviderSearch';
import type { ProviderRow } from '../../hooks/useProviderSearch';

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM',
  'NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA',
  'WV','WI','WY','DC',
];

const SPECIALTIES = [
  '',
  'Orthopaedic Surgery',
  'Internal Medicine',
  'Family Medicine',
  'Rheumatology',
  'Physical Medicine & Rehabilitation',
  'Neurological Surgery',
  'General Surgery',
  'Cardiology',
  'Oncology',
  'Gastroenterology',
];

function ProviderRow({ row, rank, onSelect }: { row: ProviderRow; rank: number; onSelect: () => void }) {
  return (
    <tr
      className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors group"
      onClick={onSelect}
    >
      <td className="px-4 py-3">
        <span className="text-xs text-gray-400 w-6 inline-block">{rank}</span>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors">{row.displayName}</div>
        <div className="text-xs text-gray-400 font-mono">NPI {row.npi}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-gray-700">{row.specialty}</div>
        <div className="text-xs text-gray-400">{row.taxonomyCode}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          {row.city}, {row.state}
        </div>
        <div className="text-xs text-gray-400">{row.zip}</div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{row.phone || '—'}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{row.lastUpdated || '—'}</td>
      <td className="px-4 py-3">
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
      </td>
    </tr>
  );
}

interface ProviderSearchProps {
  setActiveView: (v: string) => void;
  setSelectedNpi: (npi: string) => void;
}

export default function ProviderSearch({ setActiveView, setSelectedNpi }: ProviderSearchProps) {
  const [query, setQuery] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const { results, loading, error, totalCount, usingDemo, search } = useProviderSearch();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      search({ query, specialty, state, city, limit: 50 });
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, specialty, state, city, search]);

  const handleSelect = (npi: string) => {
    setSelectedNpi(npi);
    setActiveView('profile');
  };

  const hasSearch = query || specialty || state || city;

  return (
    <div className="flex flex-col h-full fade-in">
      {/* Search bar */}
      <div className="p-4 border-b border-gray-100 bg-white space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 pr-9"
              placeholder="Search by name, NPI, or keyword..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <select className="select w-52" value={specialty} onChange={e => setSpecialty(e.target.value)}>
            <option value="">All Specialties</option>
            {SPECIALTIES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="select w-24" value={state} onChange={e => setState(e.target.value)}>
            <option value="">All States</option>
            {US_STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600">City</label>
              <input className="input w-36 py-1 text-xs" placeholder="e.g. San Francisco"
                value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <button
              onClick={() => { setQuery(''); setSpecialty(''); setState(''); setCity(''); }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Results meta */}
      <div className="px-4 py-2 border-b border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
          {!loading && hasSearch && (
            <>
              <span className="font-semibold text-gray-900">{results.length.toLocaleString()}</span>
              {totalCount > results.length && (
                <span>of <span className="font-semibold">{totalCount.toLocaleString()}</span></span>
              )}
              <span>providers found</span>
            </>
          )}
          {!loading && !hasSearch && <span className="text-gray-400">Enter a name, NPI, specialty, or location to search 7M+ NPI records</span>}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Database className="w-3.5 h-3.5" /> NPPES NPI Registry · CMS.gov
        </div>
      </div>

      {/* Demo data notice */}
      {usingDemo && (
        <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            <strong>Demo data</strong> — NPPES API is live but not reachable from this preview environment.
            In a deployed browser, all results come from the real CMS NPPES registry.
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!hasSearch && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 text-gray-400">
          <Search className="w-12 h-12 mb-4 opacity-20" />
          <div className="text-lg font-medium text-gray-500 mb-1">Search 7M+ real providers</div>
          <div className="text-sm max-w-md">
            Live data from the CMS NPPES National Provider Identifier registry.<br />
            Search by name, NPI, specialty, or location.
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 text-xs">
            {[
              ['Orthopaedic Surgery', 'CA'],
              ['Rheumatology', 'NY'],
              ['Internal Medicine', 'TX'],
              ['Family Medicine', 'FL'],
            ].map(([spec, st]) => (
              <button
                key={spec}
                onClick={() => { setSpecialty(spec); setState(st); }}
                className="px-3 py-2 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-gray-600 transition-colors text-left"
              >
                {spec} · {st}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && results.length === 0 && (
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Provider</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Specialty</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {results.map((row, i) => (
                <ProviderRow
                  key={row.npi}
                  row={row}
                  rank={i + 1}
                  onSelect={() => handleSelect(row.npi)}
                />
              ))}
            </tbody>
          </table>

          {totalCount > results.length && (
            <div className="p-4 text-center text-sm text-gray-400">
              Showing {results.length} of {totalCount.toLocaleString()} results — refine your search to narrow results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
