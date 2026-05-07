// CMS data.cms.gov — Medicare Physician PUF and provider datasets
// Physician & Other Practitioners by Provider and Service (2022)
// https://data.cms.gov/provider-summary-by-type-of-service/medicare-physician-other-practitioners

const PUF_DATASET_ID = 'fc9b245a-0a61-4536-bde5-6cc37d09d5f4';
const BASE = '/api/cms-data';

export interface PhysicianPufRecord {
  Rndrng_NPI: string;
  Rndrng_Prvdr_Last_Org_Name: string;
  Rndrng_Prvdr_First_Name: string;
  Rndrng_Prvdr_Crdntls: string;
  Rndrng_Prvdr_Gndr: string;
  Rndrng_Prvdr_Ent_Cd: string;
  Rndrng_Prvdr_St1: string;
  Rndrng_Prvdr_City: string;
  Rndrng_Prvdr_State_Abrvtn: string;
  Rndrng_Prvdr_Zip5: string;
  Rndrng_Prvdr_RUCA: string;
  Rndrng_Prvdr_RUCA_Desc: string;
  Rndrng_Prvdr_Cntry: string;
  Rndrng_Prvdr_Type: string;
  Rndrng_Prvdr_Mdcr_Prtcptg_Ind: string;
  HCPCS_Cd: string;
  HCPCS_Desc: string;
  HCPCS_Drug_Ind: string;
  Place_Of_Srvc: string;       // 'F' = facility, 'O' = office
  Tot_Benes: string;           // unique beneficiaries
  Tot_Srvcs: string;           // total services
  Tot_Bene_Day_Srvcs: string;
  Avg_Sbmtd_Chrg: string;
  Avg_Mdcr_Alowd_Amt: string;
  Avg_Mdcr_Pymt_Amt: string;
  Avg_Mdcr_Stdzd_Amt: string;
}

export interface ProcedureVolumeSummary {
  hcpcs: string;
  description: string;
  totalServices: number;
  uniquePatients: number;
  avgAllowedAmt: number;
  avgPaymentAmt: number;
  placeOfService: 'Facility' | 'Office' | 'Mixed';
}

// Try multiple known dataset IDs for the Physician PUF 2022
const CANDIDATE_IDS = [
  'fc9b245a-0a61-4536-bde5-6cc37d09d5f4',
  '9767cb68-8ea9-4f0b-8179-9431abc89f11',
  'a399e5c1-1cd0-4d6d-9d3b-15b15b8dca7b',
];

export async function getProcedureVolumesByNpi(npi: string): Promise<ProcedureVolumeSummary[]> {
  let lastError: Error | null = null;

  for (const id of CANDIDATE_IDS) {
    try {
      const params = new URLSearchParams({
        'filter[Rndrng_NPI]': npi,
        size: '50',
        offset: '0',
      });
      const url = `${BASE}/${id}/data?${params}`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!resp.ok) continue;
      const rows: PhysicianPufRecord[] = await resp.json();

      // Verify it's the right dataset by checking for expected field
      if (!rows.length || !('HCPCS_Cd' in rows[0])) continue;

      return rows.map(r => ({
        hcpcs: r.HCPCS_Cd,
        description: r.HCPCS_Desc,
        totalServices: parseInt(r.Tot_Srvcs) || 0,
        uniquePatients: parseInt(r.Tot_Benes) || 0,
        avgAllowedAmt: parseFloat(r.Avg_Mdcr_Alowd_Amt) || 0,
        avgPaymentAmt: parseFloat(r.Avg_Mdcr_Pymt_Amt) || 0,
        placeOfService: (r.Place_Of_Srvc === 'F' ? 'Facility' : r.Place_Of_Srvc === 'O' ? 'Office' : 'Mixed') as 'Facility' | 'Office' | 'Mixed',
      })).sort((a, b) => b.totalServices - a.totalServices);
    } catch (e) {
      lastError = e as Error;
    }
  }

  // Dataset ID not found or network issue — return empty (caller handles gracefully)
  console.warn('Medicare PUF not available:', lastError?.message);
  return [];
}

// CMS Provider Data — Physicians & Clinicians national file
// https://data.cms.gov/provider-data/dataset/mj5m-pzi6
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
