// Facility/health-system matching for individual Medicare billers.
// Medicare PUF has no organization field for individual (NPI-1) providers, so we
// infer their facility by looking up what NPI-2 organization is registered at the
// same practice address in NPPES. Best-effort — CMS.gov has no authoritative
// provider→facility mapping for this.
import { searchNppes, getDisplayName } from './nppes';
import type { NppesResult } from './nppes';
import type { CptProviderRow } from './cms';

function addrKey(r: CptProviderRow): string | null {
  const street = r.street?.trim().toUpperCase();
  const zip = r.zip?.slice(0, 5);
  if (!street || !zip) return null;
  return `${street}|${zip}`;
}

function normalizeStreet(s: string): string {
  return s.toUpperCase()
    .replace(/[.,#]/g, '')
    .replace(/\bSTREET\b/g, 'ST').replace(/\bAVENUE\b/g, 'AVE').replace(/\bDRIVE\b/g, 'DR')
    .replace(/\bBOULEVARD\b/g, 'BLVD').replace(/\bROAD\b/g, 'RD').replace(/\bPARKWAY\b/g, 'PKWY')
    .replace(/\bHIGHWAY\b/g, 'HWY').replace(/\bCIRCLE\b/g, 'CIR').replace(/\bPLACE\b/g, 'PL')
    .replace(/\b(STE|SUITE|UNIT|FLOOR|FL|BLDG|BUILDING)\b\.?\s*\S*/g, '')
    .replace(/\s+/g, ' ').trim();
}

// NPPES's address_1+postal_code search is a loose zip-code match, not a strict
// street match — it happily returns unrelated organizations in the same zip.
// Require the candidate org's own address to share the provider's street number
// and at least one significant street-name word before accepting it as a match.
function addressesMatch(providerStreet: string, candidateStreet: string): boolean {
  const a = normalizeStreet(providerStreet);
  const b = normalizeStreet(candidateStreet);
  if (!a || !b) return false;
  const numA = a.match(/^\d+/)?.[0];
  const numB = b.match(/^\d+/)?.[0];
  if (!numA || numA !== numB) return false;
  const wordsA = a.split(' ').slice(1).filter(w => w.length > 2);
  const wordsB = b.split(' ').slice(1).filter(w => w.length > 2);
  return wordsA.some(w => wordsB.includes(w));
}

function findMatchingOrgName(providerStreet: string, results: NppesResult[]): string | null {
  for (const org of results) {
    const candidates = [...(org.addresses ?? []), ...(org.practiceLocations ?? [])];
    if (candidates.some(addr => addr.address_1 && addressesMatch(providerStreet, addr.address_1))) {
      return getDisplayName(org);
    }
  }
  return null;
}

// Module-level cache so repeated searches/state drill-downs don't re-query the same address
const facilityCache = new Map<string, string | null>();

/**
 * Resolve a facility/health-system name for each provider row.
 * - Rows that are themselves NPI-2 org billers use their own orgName directly (free).
 * - Individual (NPI-1) rows are grouped by practice address; one NPPES lookup per
 *   unique address checks whether an organization (NPI-2) is registered there.
 * Returns a map of npi -> facility name (only for rows where a match was found).
 */
export async function resolveProviderFacilities(
  rows: CptProviderRow[],
  options: { maxLookups?: number } = {}
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const groups = new Map<string, CptProviderRow[]>();

  for (const r of rows) {
    if (r.entityType === 'O' && r.orgName) { result.set(r.npi, r.orgName); continue; }
    const key = addrKey(r);
    if (!key) continue;
    if (facilityCache.has(key)) {
      const cached = facilityCache.get(key);
      if (cached) result.set(r.npi, cached);
      continue;
    }
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  if (!groups.size) return result;

  // Prioritize addresses with the most billing volume — likely larger facilities,
  // and keeps the lookup count bounded for very large provider lists.
  const keys = [...groups.entries()]
    .sort((a, b) => b[1].reduce((s, r) => s + r.totalServices, 0) - a[1].reduce((s, r) => s + r.totalServices, 0))
    .map(([k]) => k)
    .slice(0, options.maxLookups ?? 60);

  const CONCURRENCY = 6;
  for (let i = 0; i < keys.length; i += CONCURRENCY) {
    const batch = keys.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async key => {
      const group = groups.get(key)!;
      const sample = group[0];
      try {
        const resp = await searchNppes({
          address_1: sample.street,
          postal_code: sample.zip,
          enumeration_type: 'NPI-2',
          limit: 10,
        });
        const name = resp.results?.length ? findMatchingOrgName(sample.street, resp.results) : null;
        facilityCache.set(key, name);
        if (name) group.forEach(r => result.set(r.npi, name));
      } catch {
        facilityCache.set(key, null);
      }
    }));
  }

  return result;
}
