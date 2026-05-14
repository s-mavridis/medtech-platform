// CMS data.cms.gov — Medicare Physician PUF and provider datasets
// Medicare Physician & Other Practitioners by Provider and Service
// 2023: 92396110-2aed-4d63-a6a2-5d6207d46a29 (confirmed via data.cms.gov DCAT catalog)
// 2022: e650987d-01b7-4f09-b75e-b0b075afbf98 (confirmed)

const BASE = '/api/cms-data';
export const PUF_2023_ID = '92396110-2aed-4d63-a6a2-5d6207d46a29';
export const PUF_2022_ID = 'e650987d-01b7-4f09-b75e-b0b075afbf98';

// State abbreviation → FIPS code (for map matching)
export const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09',
  DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17',
  IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24',
  MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31',
  NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38',
  OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46',
  TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54',
  WI: '55', WY: '56',
};

export interface PhysicianPufRecord {
  Rndrng_NPI: string;
  Rndrng_Prvdr_Last_Org_Name: string;
  Rndrng_Prvdr_First_Name?: string;
  Rndrng_Prvdr_MI?: string;
  Rndrng_Prvdr_Crdntls?: string;
  Rndrng_Prvdr_Ent_Cd: string;     // 'I' = Individual, 'O' = Organization
  Rndrng_Prvdr_St1?: string;
  Rndrng_Prvdr_St2?: string;
  Rndrng_Prvdr_City?: string;
  Rndrng_Prvdr_State_Abrvtn?: string;
  Rndrng_Prvdr_State_FIPS?: string;
  Rndrng_Prvdr_Zip5?: string;
  Rndrng_Prvdr_RUCA?: string;
  Rndrng_Prvdr_RUCA_Desc?: string;
  Rndrng_Prvdr_Cntry?: string;
  Rndrng_Prvdr_Type?: string;
  Rndrng_Prvdr_Mdcr_Prtcptg_Ind?: string;
  HCPCS_Cd: string;
  HCPCS_Desc: string;
  HCPCS_Drug_Ind?: string;
  Place_Of_Srvc: string;            // 'F' = Facility, 'O' = Office
  Tot_Benes: string;                // unique beneficiaries
  Tot_Srvcs: string;                // total services
  Tot_Bene_Day_Srvcs?: string;
  Avg_Sbmtd_Chrg: string;
  Avg_Mdcr_Alowd_Amt: string;
  Avg_Mdcr_Pymt_Amt: string;
  Avg_Mdcr_Stdzd_Amt?: string;
}

export interface ProcedureVolumeSummary {
  hcpcs: string;
  description: string;
  totalServices: number;
  uniquePatients: number;
  avgAllowedAmt: number;
  avgPaymentAmt: number;
  avgSubmittedCharge: number;
  placeOfService: 'Facility' | 'Office' | 'Mixed';
  year?: string;
}

export interface CptProviderRow {
  npi: string;
  displayName: string;
  lastName: string;
  firstName: string;
  credential: string;
  orgName: string;
  entityType: string;
  specialty: string;
  city: string;
  state: string;
  stateFips: string;
  zip: string;
  hcpcs: string;
  description: string;
  totalServices: number;
  uniquePatients: number;
  avgAllowedAmt: number;
  avgPaymentAmt: number;
  avgSubmittedCharge: number;
  placeOfService: 'Facility' | 'Office' | 'Mixed';
}

function parseRow(r: PhysicianPufRecord): CptProviderRow {
  const isOrg = r.Rndrng_Prvdr_Ent_Cd === 'O';
  const lastName = r.Rndrng_Prvdr_Last_Org_Name ?? '';
  const firstName = r.Rndrng_Prvdr_First_Name ?? '';
  const cred = r.Rndrng_Prvdr_Crdntls?.trim() ?? '';
  const displayName = isOrg
    ? lastName
    : [firstName, lastName].filter(Boolean).join(' ') + (cred ? `, ${cred}` : '');
  const state = r.Rndrng_Prvdr_State_Abrvtn ?? '';
  return {
    npi: r.Rndrng_NPI,
    displayName,
    lastName,
    firstName,
    credential: cred,
    orgName: isOrg ? lastName : '',
    entityType: r.Rndrng_Prvdr_Ent_Cd,
    specialty: r.Rndrng_Prvdr_Type ?? '',
    city: r.Rndrng_Prvdr_City ?? '',
    state,
    stateFips: r.Rndrng_Prvdr_State_FIPS ?? STATE_FIPS[state] ?? '',
    zip: r.Rndrng_Prvdr_Zip5 ?? '',
    hcpcs: r.HCPCS_Cd,
    description: r.HCPCS_Desc,
    totalServices: parseInt(r.Tot_Srvcs) || 0,
    uniquePatients: parseInt(r.Tot_Benes) || 0,
    avgAllowedAmt: parseFloat(r.Avg_Mdcr_Alowd_Amt) || 0,
    avgPaymentAmt: parseFloat(r.Avg_Mdcr_Pymt_Amt) || 0,
    avgSubmittedCharge: parseFloat(r.Avg_Sbmtd_Chrg) || 0,
    placeOfService: (r.Place_Of_Srvc === 'F' ? 'Facility' : r.Place_Of_Srvc === 'O' ? 'Office' : 'Mixed') as 'Facility' | 'Office' | 'Mixed',
  };
}

/** Query Medicare PUF by NPI — returns all procedures billed by that provider */
export async function getProcedureVolumesByNpi(npi: string): Promise<ProcedureVolumeSummary[]> {
  async function fetchYear(id: string, year: string): Promise<ProcedureVolumeSummary[]> {
    try {
      const params = new URLSearchParams({ 'filter[Rndrng_NPI]': npi, size: '100' });
      const resp = await fetch(`${BASE}/${id}/data?${params}`, { signal: AbortSignal.timeout(10000) });
      if (!resp.ok) return [];
      const rows: PhysicianPufRecord[] = await resp.json();
      if (!rows.length || !('HCPCS_Cd' in rows[0])) return [];
      return rows.map(r => ({
        hcpcs: r.HCPCS_Cd,
        description: r.HCPCS_Desc,
        totalServices: parseInt(r.Tot_Srvcs) || 0,
        uniquePatients: parseInt(r.Tot_Benes) || 0,
        avgAllowedAmt: parseFloat(r.Avg_Mdcr_Alowd_Amt) || 0,
        avgPaymentAmt: parseFloat(r.Avg_Mdcr_Pymt_Amt) || 0,
        avgSubmittedCharge: parseFloat(r.Avg_Sbmtd_Chrg) || 0,
        placeOfService: (r.Place_Of_Srvc === 'F' ? 'Facility' : r.Place_Of_Srvc === 'O' ? 'Office' : 'Mixed') as 'Facility' | 'Office' | 'Mixed',
        year,
      }));
    } catch { return []; }
  }
  const [rows2023, rows2022] = await Promise.all([
    fetchYear(PUF_2023_ID, '2023'),
    fetchYear(PUF_2022_ID, '2022'),
  ]);
  return [...rows2023, ...rows2022].sort((a, b) => b.totalServices - a.totalServices);
}

/** Query Medicare PUF by HCPCS/CPT code — returns all providers billing that code */
export async function getCptProviders(
  hcpcsCode: string,
  options: { limit?: number; year?: '2023' | '2022' } = {}
): Promise<CptProviderRow[]> {
  const id = options.year === '2022' ? PUF_2022_ID : PUF_2023_ID;
  const params = new URLSearchParams({
    'filter[HCPCS_Cd]': hcpcsCode.trim().toUpperCase(),
    size: String(options.limit ?? 500),
  });
  const resp = await fetch(`${BASE}/${id}/data?${params}`, { signal: AbortSignal.timeout(20000) });
  if (!resp.ok) throw new Error(`CMS PUF API error ${resp.status}`);
  const rows: PhysicianPufRecord[] = await resp.json();
  return rows.map(parseRow).sort((a, b) => b.totalServices - a.totalServices);
}

/** Query Medicare PUF by NPI — works for both NPI-1 (individuals) and NPI-2 (org billers) */
export async function getInstitutionCptByNpi(
  npi: string,
  options: { limit?: number } = {}
): Promise<CptProviderRow[]> {
  for (const id of [PUF_2023_ID, PUF_2022_ID]) {
    try {
      const params = new URLSearchParams({ 'filter[Rndrng_NPI]': npi, size: String(options.limit ?? 500) });
      const resp = await fetch(`${BASE}/${id}/data?${params}`, { signal: AbortSignal.timeout(20000) });
      if (!resp.ok) continue;
      const rows: PhysicianPufRecord[] = await resp.json();
      if (rows.length > 0 && 'HCPCS_Cd' in rows[0]) {
        return rows.map(parseRow).sort((a, b) => b.totalServices - a.totalServices);
      }
    } catch { continue; }
  }
  return [];
}

/** Aggregate PUF data across multiple NPIs (health system view — max 8 parallel queries) */
export async function getSystemCptProfile(
  npis: string[],
  options: { limit?: number } = {}
): Promise<CptProviderRow[]> {
  const results = await Promise.allSettled(
    npis.slice(0, 8).map(npi => getInstitutionCptByNpi(npi, { limit: options.limit ?? 200 }))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<CptProviderRow[]> => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => b.totalServices - a.totalServices);
}

/** Query by institution/org name — exact match as it appears in CMS data */
export async function getInstitutionCptProfile(
  orgName: string,
  options: { limit?: number } = {}
): Promise<CptProviderRow[]> {
  // Try the name as-is (uppercased), then common variants
  const variants = generateNameVariants(orgName);
  for (const variant of variants) {
    try {
      const params = new URLSearchParams({
        'filter[Rndrng_Prvdr_Last_Org_Name]': variant,
        size: String(options.limit ?? 500),
      });
      const resp = await fetch(`${BASE}/${PUF_2023_ID}/data?${params}`, { signal: AbortSignal.timeout(20000) });
      if (!resp.ok) continue;
      const rows: PhysicianPufRecord[] = await resp.json();
      if (rows.length > 0 && 'HCPCS_Cd' in rows[0]) {
        return rows.map(parseRow).sort((a, b) => b.totalServices - a.totalServices);
      }
    } catch { continue; }
  }
  return [];
}

function generateNameVariants(name: string): string[] {
  const up = name.trim().toUpperCase();
  const set = new Set<string>([up]);
  // HEALTH CARE <-> HEALTHCARE
  set.add(up.replace(/\bHEALTHCARE\b/g, 'HEALTH CARE'));
  set.add(up.replace(/\bHEALTH CARE\b/g, 'HEALTHCARE'));
  // MEDICAL CENTER variants
  set.add(up.replace(/\bMEDICAL CENTER\b/g, 'MED CTR'));
  set.add(up.replace(/\bMED CTR\b/g, 'MEDICAL CENTER'));
  // HOSPITAL variants
  set.add(up.replace(/\bHOSPITAL\b/g, 'HOSP'));
  set.add(up.replace(/\bHOSP\b/g, 'HOSPITAL'));
  // Strip common suffixes
  const stripped = up.replace(/\b(INC|LLC|CORP|LTD|DBA)\b\.?/g, '').replace(/\s+/g, ' ').trim();
  if (stripped) set.add(stripped);
  set.delete('');
  return [...set];
}

// Words too generic to be useful org identifiers
const ORG_SKIP_WORDS = new Set([
  'THE','OF','AND','FOR','AT','IN','OR','AN','A',
  'INC','LLC','LP','CORP','LTD','DBA',
  'HEALTH','CARE','HEALTHCARE','MEDICAL','CENTER','CLINIC',
  'HOSPITAL','SYSTEM','GROUP','NETWORK','PARTNERS','ASSOCIATES',
  'SERVICES','INSTITUTE','FOUNDATION','TRUST','ALLIANCE',
]);

function normalizeOrgName(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function significantWords(orgName: string): string[] {
  return normalizeOrgName(orgName).split(' ').filter(w => w.length > 2 && !ORG_SKIP_WORDS.has(w));
}

/** Search Physician Compare by organization name (LIKE contains match) — finds affiliated providers */
export async function searchProvidersByOrg(
  orgName: string,
  limit = 100
): Promise<PhysicianCompareRecord[]> {
  const words = significantWords(orgName);
  if (!words.length) return [];

  // Sort by length descending — longer words are more distinctive (BRIGHAM > MASS, PERMANENTE > KAISER)
  const sortedWords = [...words].sort((a, b) => b.length - a.length || a.localeCompare(b));

  // Try each keyword (most distinctive first) until we get a refined match
  for (const keyword of sortedWords.slice(0, 3)) {
    const params = new URLSearchParams();
    params.set('conditions[0][property]', 'org_nm');
    // Use %keyword% (contains) so "BRIGHAM" matches "BRIGHAM AND WOMEN'S HOSPITAL"
    // and "GENERAL" matches "MASSACHUSETTS GENERAL HOSPITAL"
    params.set('conditions[0][value]', '%' + keyword + '%');
    params.set('conditions[0][operator]', 'LIKE');
    params.set('limit', String(limit));
    try {
      const url = `${PROVIDER_DATA_BASE}/${PHYSICIAN_COMPARE_ID}/0?${params}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!resp.ok) continue;
      const data = await resp.json();
      const results: PhysicianCompareRecord[] = data.results ?? [];
      if (!results.length) continue;

      // Single distinctive word — return as-is
      const otherWords = words.filter(w => w !== keyword);
      if (!otherWords.length) return results;

      // Require org_nm to contain at least one other significant word from the search org name
      // e.g. for MGB: %BRIGHAM% results refined to those also containing "MASS" or "GENERAL"
      //   → "BRIGHAM AND WOMEN'S..." filtered out; "MASS GENERAL BRIGHAM" kept
      //   → "MASSACHUSETTS GENERAL HOSPITAL" also kept (MASS substring matches "MASS")
      const refined = results.filter(r => {
        const norm = normalizeOrgName(r.org_nm ?? '');
        return otherWords.some(w => norm.includes(w));
      });

      if (refined.length > 0) return refined;
      // Refined was empty for this keyword (results exist but don't match our org)
      // → try next most distinctive word
    } catch { continue; }
  }
  return [];
}

/** Look up a provider in Physician Compare by last name + state (fallback when NPI lookup returns nothing) */
export async function getPhysicianCompareByName(
  lastName: string,
  firstName: string,
  state?: string
): Promise<PhysicianCompareRecord | null> {
  if (!lastName) return null;
  try {
    const params = new URLSearchParams();
    params.set('conditions[0][property]', 'lst_nm');
    params.set('conditions[0][value]', lastName.toUpperCase());
    params.set('conditions[0][operator]', '=');
    if (state) {
      params.set('conditions[1][property]', 'st');
      params.set('conditions[1][value]', state.toUpperCase());
      params.set('conditions[1][operator]', '=');
    }
    params.set('limit', '20');
    const url = `${PROVIDER_DATA_BASE}/${PHYSICIAN_COMPARE_ID}/0?${params}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    const results: PhysicianCompareRecord[] = data.results ?? [];
    if (!results.length) return null;
    // Find best match by first name prefix (handle middle name in first name slot)
    const firstUp = firstName.toUpperCase().slice(0, 3);
    const match = results.find(r => r.frst_nm?.toUpperCase().startsWith(firstUp));
    return match ?? results[0];
  } catch { return null; }
}

// CMS Provider Data — Physicians & Clinicians national file
const PHYSICIAN_COMPARE_ID = 'mj5m-pzi6';
const PROVIDER_DATA_BASE = '/api/cms-provider';

export interface PhysicianCompareRecord {
  NPI: string;
  Ind_PAC_ID: string;
  Ind_enrl_ID: string;
  lst_nm: string;
  frst_nm: string;
  mid_nm: string;
  suff: string;
  gndr: string;
  Cred: string;
  Med_sch: string;
  Grd_yr: string;
  pri_spec: string;
  sec_spec_1: string;
  sec_spec_2: string;
  sec_spec_3: string;
  sec_spec_4: string;
  sec_spec_all: string;
  org_nm: string;
  org_pac_id: string;
  num_org_mem: string;
  adr_ln_1: string;
  adr_ln_2: string;
  ln_2_sprs: string;
  cty: string;
  st: string;
  zip: string;
  phn_numbr: string;
  hosp_afl_1: string;
  hosp_afl_lbn_1: string;
  hosp_afl_2: string;
  hosp_afl_lbn_2: string;
  hosp_afl_3: string;
  hosp_afl_lbn_3: string;
  hosp_afl_4: string;
  hosp_afl_lbn_4: string;
  hosp_afl_5: string;
  hosp_afl_lbn_5: string;
  ind_assgn: string;
  grp_assgn: string;
  adrs_id: string;
}

export async function getPhysicianCompare(npi: string): Promise<PhysicianCompareRecord | null> {
  try {
    const params = new URLSearchParams();
    params.set('conditions[0][property]', 'NPI');
    params.set('conditions[0][value]', npi);
    params.set('conditions[0][operator]', '=');
    params.set('limit', '1');
    const url = `${PROVIDER_DATA_BASE}/${PHYSICIAN_COMPARE_ID}/0?${params}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}
