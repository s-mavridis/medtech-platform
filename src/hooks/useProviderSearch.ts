import { useState, useCallback, useRef } from 'react';
import { searchNppes, getDisplayName, getPracticeAddress, getPrimaryTaxonomy, mapSpecialty } from '../api/nppes';
import type { NppesResult } from '../api/nppes';
import { providers as mockProviders } from '../data/providers';

export interface SearchFilters {
  query: string;
  specialty: string;
  state: string;
  city: string;
  limit: number;
}

export interface ProviderRow {
  npi: string;
  displayName: string;
  firstName: string;
  lastName: string;
  credential: string;
  specialty: string;
  taxonomyCode: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  address: string;
  gender: string;
  lastUpdated: string;
  isLive: boolean;       // true = real NPPES data, false = demo data
  raw?: NppesResult;
}

function mapNppesResult(r: NppesResult): ProviderRow {
  const addr = getPracticeAddress(r);
  const tax = getPrimaryTaxonomy(r);
  return {
    npi: r.number,
    displayName: getDisplayName(r),
    firstName: r.basic.first_name ?? '',
    lastName: r.basic.last_name ?? '',
    credential: r.basic.credential?.trim() ?? '',
    specialty: mapSpecialty(tax?.code ?? '', tax?.desc ?? ''),
    taxonomyCode: tax?.code ?? '',
    city: addr?.city ?? '',
    state: addr?.state ?? '',
    zip: addr?.postal_code?.slice(0, 5) ?? '',
    phone: addr?.telephone_number ?? '',
    address: addr ? `${addr.address_1}${addr.address_2 ? `, ${addr.address_2}` : ''}` : '',
    gender: r.basic.sex ?? '',
    lastUpdated: r.basic.last_updated ?? '',
    isLive: true,
    raw: r,
  };
}

// Mock fallback — filtered from local demo data
function filterMock(filters: SearchFilters): ProviderRow[] {
  const q = filters.query.toLowerCase();
  return mockProviders
    .filter(p => {
      if (q && !p.name.toLowerCase().includes(q) && !p.npi.includes(q) && !p.specialty.toLowerCase().includes(q)) return false;
      // Normalise British 'ae' → 'e' so "Orthopaedic" matches "Orthopedic"
      const normSpec = (s: string) => s.toLowerCase().replace('ae', 'e');
      if (filters.specialty && !normSpec(p.specialty).includes(normSpec(filters.specialty))) return false;
      if (filters.state && p.address.state !== filters.state) return false;
      if (filters.city && !p.address.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      return true;
    })
    .map(p => ({
      npi: p.npi,
      displayName: p.name,
      firstName: p.firstName,
      lastName: p.lastName,
      credential: p.credentials,
      specialty: p.specialty,
      taxonomyCode: '',
      city: p.address.city,
      state: p.address.state,
      zip: p.address.zip,
      phone: p.phone,
      address: p.address.street,
      gender: p.gender,
      lastUpdated: '2024-01-01',
      isLive: false,
    }));
}

export function useProviderSearch() {
  const [results, setResults] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [usingDemo, setUsingDemo] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (filters: SearchFilters) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    if (!filters.query && !filters.specialty && !filters.state && !filters.city) {
      setResults([]);
      setTotalCount(0);
      setUsingDemo(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUsingDemo(false);

    try {
      const parts = filters.query.trim().split(/\s+/);
      const isNpi = /^\d{10}$/.test(filters.query.trim());

      const params = isNpi
        ? { number: filters.query.trim(), limit: 1 }
        : {
            first_name: parts.length > 1 ? parts[0] : undefined,
            last_name: parts.length > 1 ? parts[parts.length - 1] : parts[0] || undefined,
            taxonomy_description: filters.specialty || undefined,
            state: filters.state || undefined,
            city: filters.city || undefined,
            enumeration_type: 'NPI-1' as const,
            limit: filters.limit || 50,
          };

      const data = await searchNppes(params);

      if ((data as { Errors?: { description: string }[] }).Errors?.length) {
        throw new Error((data as { Errors: { description: string }[] }).Errors[0].description);
      }

      setTotalCount(data.result_count ?? 0);
      setResults((data.results ?? []).map(mapNppesResult));
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;

      // Network blocked (sandbox/CORS) — silently fall back to demo data
      const isFetchError = (e as Error).message?.toLowerCase().includes('fetch') ||
                           (e as Error).message?.toLowerCase().includes('network') ||
                           (e as Error).message?.toLowerCase().includes('cors');

      if (isFetchError) {
        const fallback = filterMock(filters);
        setResults(fallback);
        setTotalCount(fallback.length);
        setUsingDemo(true);
        setError(null);
      } else {
        setError((e as Error).message ?? 'Search failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, totalCount, usingDemo, search };
}
