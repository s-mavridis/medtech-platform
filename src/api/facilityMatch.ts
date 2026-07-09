// Facility/health-system matching for individual Medicare billers.
// Medicare PUF has no organization field for individual (NPI-1) providers, so we
// infer their facility through a waterfall of progressively looser signals:
//   1. NPI-2 org billers use their own PUF org name directly (free, exact).
//   2. CMS Physician Compare, looked up by the provider's own NPI — the most
//      authoritative source of group-practice/hospital affiliation CMS publishes.
//   3. Reverse address match — is an NPI-2 organization registered at the exact
//      same practice address in NPPES?
//   4. Loose ties — providers who share a practice address with each other (but
//      matched no named org) are grouped as a "shared practice"; a truly unique,
//      unmatched address is labeled independent/solo.
// Tier 4 guarantees every individual provider gets *some* facility label, even
// when CMS has no authoritative link — but only tiers 1–3 are real facility names.
import { searchNppes, getDisplayName } from './nppes';
import type { NppesResult } from './nppes';
import { getPhysicianCompare } from './cms';
import type { CptProviderRow } from './cms';

export interface FacilityMatch {
  name: string;
  // 'org'/'compare'/'address' are real, named facility matches.
  // 'shared'/'solo' are loose, inferred ties used only when nothing else resolved.
  source: 'org' | 'compare' | 'address' | 'shared' | 'solo';
}

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

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// Module-level caches so repeated searches/state drill-downs don't re-query the same NPI/address
const addressFacilityCache = new Map<string, string | null>();
const compareCache = new Map<string, string | null>();

async function runBatched<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map(task));
  }
}

// No-network fallback: cluster providers sharing a practice address as a "shared
// practice", and label truly unique addresses independent/solo. Runs synchronously
// and instantly, so it's applied FIRST as a baseline — real matches from tiers 2–3
// (which hit slow live government APIs) then progressively overwrite these labels
// as they resolve, rather than leaving the whole table blocked on "matching…".
function applyLooseTies(individualRows: CptProviderRow[], result: Map<string, FacilityMatch>): void {
  const groups = new Map<string, CptProviderRow[]>();
  for (const r of individualRows) {
    const key = addrKey(r) ?? `__noaddr__${r.npi}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  for (const group of groups.values()) {
    if (group.length >= 2) {
      const sample = group[0];
      const label = `Shared practice — ${titleCase(sample.street)}, ${titleCase(sample.city)}`;
      group.forEach(r => result.set(r.npi, { name: label, source: 'shared' }));
    } else {
      group.forEach(r => result.set(r.npi, { name: 'Independent / Solo Practice', source: 'solo' }));
    }
  }
}

function hasRealMatch(result: Map<string, FacilityMatch>, npi: string): boolean {
  const m = result.get(npi);
  return !!m && m.source !== 'shared' && m.source !== 'solo';
}

/**
 * Resolve a facility/health-system name for each provider row.
 * Every individual provider gets an immediate loose-tie/solo label (no network,
 * instant) as a baseline, which progressively upgrades to a real facility name
 * from CMS Physician Compare or NPPES address matching as those resolve.
 * Call `onUpdate` to render each upgrade as it lands instead of waiting for the
 * full resolution (which can take a while against live government APIs).
 */
export async function resolveProviderFacilities(
  rows: CptProviderRow[],
  options: {
    maxCompareLookups?: number;
    maxAddressLookups?: number;
    onUpdate?: (partial: Map<string, FacilityMatch>) => void;
  } = {}
): Promise<Map<string, FacilityMatch>> {
  const result = new Map<string, FacilityMatch>();
  const individualRows: CptProviderRow[] = [];
  const emit = () => options.onUpdate?.(new Map(result));

  // Tier 1 — org-type PUF billers already carry their own name for free.
  for (const r of rows) {
    if (r.entityType === 'O' && r.orgName) result.set(r.npi, { name: r.orgName, source: 'org' });
    else individualRows.push(r);
  }

  // Tier 4 baseline, applied first — guarantees every row has a label immediately.
  applyLooseTies(individualRows, result);
  emit();

  // Tier 2 — CMS Physician Compare, looked up directly by NPI. Prioritize by
  // billing volume so the highest-impact providers get resolved first under budget.
  const compareBudget = options.maxCompareLookups ?? 60;
  const compareCandidates = [...individualRows]
    .sort((a, b) => b.totalServices - a.totalServices)
    .slice(0, compareBudget);

  await runBatched(compareCandidates, 10, async r => {
    if (compareCache.has(r.npi)) {
      const cached = compareCache.get(r.npi);
      if (cached) result.set(r.npi, { name: cached, source: 'compare' });
      return;
    }
    try {
      const rec = await getPhysicianCompare(r.npi);
      const name = rec?.facility_name || null;
      compareCache.set(r.npi, name);
      if (name) result.set(r.npi, { name, source: 'compare' });
    } catch {
      compareCache.set(r.npi, null);
    }
  });
  emit();

  // Tier 3 — reverse address match against NPPES organizations, for anyone still
  // without a real match (i.e. still sitting on their tier-4 placeholder).
  const stillLoose = individualRows.filter(r => !hasRealMatch(result, r.npi));
  const addrGroups = new Map<string, CptProviderRow[]>();
  for (const r of stillLoose) {
    const key = addrKey(r);
    if (!key) continue;
    if (addressFacilityCache.has(key)) {
      const cached = addressFacilityCache.get(key);
      if (cached) result.set(r.npi, { name: cached, source: 'address' });
      continue;
    }
    if (!addrGroups.has(key)) addrGroups.set(key, []);
    addrGroups.get(key)!.push(r);
  }

  const addressBudget = options.maxAddressLookups ?? 40;
  const addrKeys = [...addrGroups.entries()]
    .sort((a, b) => b[1].reduce((s, r) => s + r.totalServices, 0) - a[1].reduce((s, r) => s + r.totalServices, 0))
    .map(([k]) => k)
    .slice(0, addressBudget);

  await runBatched(addrKeys, 6, async key => {
    const group = addrGroups.get(key)!;
    const sample = group[0];
    try {
      const resp = await searchNppes({
        address_1: sample.street,
        postal_code: sample.zip,
        enumeration_type: 'NPI-2',
        limit: 10,
      });
      const name = resp.results?.length ? findMatchingOrgName(sample.street, resp.results) : null;
      addressFacilityCache.set(key, name);
      if (name) group.forEach(r => result.set(r.npi, { name, source: 'address' }));
    } catch {
      addressFacilityCache.set(key, null);
    }
  });
  emit();

  return result;
}
