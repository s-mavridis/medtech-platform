// NPPES NPI Registry — public API, no auth required
// https://npiregistry.cms.hhs.gov/api-page

const BASE = '/api/nppes';

export interface NppesAddress {
  address_purpose: 'LOCATION' | 'MAILING';
  address_type: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country_code: string;
  telephone_number?: string;
  fax_number?: string;
}

export interface NppesTaxonomy {
  code: string;
  desc: string;
  primary: boolean;
  state: string;
  license: string;
  taxonomy_group?: string;
}

export interface NppesBasic {
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  name?: string; // org
  credential?: string;
  sex?: string;
  enumeration_date?: string;
  last_updated?: string;
  status?: string;
  sole_proprietor?: string;
  organization_name?: string;
  authorized_official_first_name?: string;
  authorized_official_last_name?: string;
}

export interface NppesResult {
  number: string;
  enumeration_type: 'NPI-1' | 'NPI-2';
  basic: NppesBasic;
  addresses: NppesAddress[];
  practiceLocations: NppesAddress[];
  taxonomies: NppesTaxonomy[];
  identifiers: { identifier: string; code: string; desc: string; state: string; issuer: string }[];
  other_names: unknown[];
  endpoints: unknown[];
  created_epoch: string;
  last_updated_epoch: string;
}

export interface NppesResponse {
  result_count: number;
  results: NppesResult[];
  Errors?: { description: string }[];
}

export interface NppesSearchParams {
  number?: string;
  organization_name?: string;  // NPI-2 org search
  first_name?: string;
  last_name?: string;
  taxonomy_description?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  enumeration_type?: 'NPI-1' | 'NPI-2';
  limit?: number;
  skip?: number;
}

export async function searchNppes(params: NppesSearchParams): Promise<NppesResponse> {
  // NPPES supports * wildcard for partial matching (case-insensitive)
  const wc = (s: string) => s.trim().endsWith('*') ? s.trim() : s.trim() + '*';

  const p: Record<string, string> = { version: '2.1' };
  if (params.number) p['number'] = params.number;
  if (params.organization_name) p['organization_name'] = wc(params.organization_name);
  if (params.first_name) p['first_name'] = wc(params.first_name);
  if (params.last_name) p['last_name'] = wc(params.last_name);
  if (params.taxonomy_description) p['taxonomy_description'] = params.taxonomy_description; // exact match for taxonomy
  if (params.city) p['city'] = params.city;
  if (params.state) p['state'] = params.state;
  if (params.postal_code) p['postal_code'] = params.postal_code;
  if (params.enumeration_type) p['enumeration_type'] = params.enumeration_type;
  p['limit'] = String(params.limit ?? 20);
  p['skip'] = String(params.skip ?? 0);

  const url = `${BASE}/?${new URLSearchParams(p).toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`NPPES ${resp.status}: ${resp.statusText}`);
  return resp.json();
}

export async function lookupNpi(npi: string): Promise<NppesResult | null> {
  const data = await searchNppes({ number: npi, enumeration_type: 'NPI-1' });
  return data.results?.[0] ?? null;
}

// Helpers to extract clean values from raw NPPES data

export function getPracticeAddress(r: NppesResult): NppesAddress | undefined {
  return (
    r.practiceLocations?.find(a => a.address_purpose === 'LOCATION') ||
    r.addresses?.find(a => a.address_purpose === 'LOCATION') ||
    r.addresses?.[0]
  );
}

export function getPrimaryTaxonomy(r: NppesResult): NppesTaxonomy | undefined {
  return r.taxonomies?.find(t => t.primary) ?? r.taxonomies?.[0];
}

export function getDisplayName(r: NppesResult): string {
  if (r.enumeration_type === 'NPI-2') {
    return r.basic.organization_name ?? r.basic.name ?? 'Unknown Organization';
  }
  const parts = [
    r.basic.first_name,
    r.basic.middle_name,
    r.basic.last_name,
  ].filter(Boolean);
  const name = parts.join(' ');
  const cred = r.basic.credential?.trim();
  return cred ? `${name}, ${cred}` : name;
}

// Map NPPES taxonomy codes to clean specialty buckets
const SPECIALTY_MAP: Record<string, string> = {
  '207X00000X': 'Orthopedic Surgery',
  '207XS0106X': 'Orthopedic Surgery',
  '207XS0114X': 'Orthopedic Surgery',
  '207XS0117X': 'Orthopedic Surgery',
  '207XP3100X': 'Orthopedic Surgery',
  '207XX0004X': 'Orthopedic Surgery',
  '207XX0005X': 'Orthopedic Surgery',
  '207XX0801X': 'Orthopedic Surgery',
  '208600000X': 'General Surgery',
  '207R00000X': 'Internal Medicine',
  '207Q00000X': 'Family Medicine',
  '207RR0500X': 'Rheumatology',
  '207RI0200X': 'Infectious Disease',
  '207RC0000X': 'Cardiovascular Disease',
  '207RN0300X': 'Nephrology',
  '207RG0100X': 'Gastroenterology',
  '208000000X': 'Pediatrics',
  '2084N0400X': 'Neurology',
  '207T00000X': 'Neurological Surgery',
  '207U00000X': 'Physical Medicine & Rehabilitation',
  '207YX0602X': 'Otolaryngology',
  '341600000X': 'Ambulatory Surgery Center',
  '282N00000X': 'Hospital',
};

export function mapSpecialty(taxonomyCode: string, desc: string): string {
  return SPECIALTY_MAP[taxonomyCode] ?? desc ?? 'Other';
}
