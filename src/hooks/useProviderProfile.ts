import { useState, useEffect } from 'react';
import { lookupNpi, getDisplayName, getPracticeAddress, getPrimaryTaxonomy, mapSpecialty } from '../api/nppes';
import { getPaymentsByNpi, aggregatePayments } from '../api/openPayments';
import { getProcedureVolumesByNpi, getPhysicianCompare } from '../api/cms';
import type { NppesResult } from '../api/nppes';
import type { PaymentSummary } from '../api/openPayments';
import type { ProcedureVolumeSummary, PhysicianCompareRecord } from '../api/cms';
import { providers as mockProviders } from '../data/providers';

export interface ProfileData {
  npi: string;
  displayName: string;
  firstName: string;
  lastName: string;
  credential: string;
  specialty: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  lastUpdated: string;
  medSchool: string | null;
  gradYear: string | null;
  organization: string | null;
  groupPracticeSize: string | null;
  hospitalAffiliations: string[];
  payments: PaymentSummary[];
  totalPayments: number;
  topPayers: Array<{ company: string; total: number }>;
  procedureVolumes: ProcedureVolumeSummary[];
  isLive: boolean;
  raw?: NppesResult;
}

export interface ProfileState {
  data: ProfileData | null;
  loading: boolean;
  loadingPayments: boolean;
  loadingProcedures: boolean;
  error: string | null;
  usingDemo: boolean;
}

function isFetchError(e: unknown): boolean {
  const msg = (e as Error)?.message?.toLowerCase() ?? '';
  return msg.includes('fetch') || msg.includes('network') || msg.includes('cors') || msg.includes('failed');
}

function buildHospitalList(c: PhysicianCompareRecord | null): string[] {
  if (!c) return [];
  return [c.hosp_afl_lbn_1, c.hosp_afl_lbn_2, c.hosp_afl_lbn_3, c.hosp_afl_lbn_4, c.hosp_afl_lbn_5].filter(Boolean);
}

function mockProfile(npi: string): ProfileData | null {
  const p = mockProviders.find(x => x.npi === npi) ?? mockProviders[0];
  if (!p) return null;
  return {
    npi: p.npi,
    displayName: p.name,
    firstName: p.firstName,
    lastName: p.lastName,
    credential: p.credentials,
    specialty: p.specialty,
    gender: p.gender,
    address: p.address.street,
    city: p.address.city,
    state: p.address.state,
    zip: p.address.zip,
    phone: p.phone,
    lastUpdated: '2024-01-01',
    medSchool: p.medSchool,
    gradYear: String(p.gradYear),
    organization: p.organization,
    groupPracticeSize: null,
    hospitalAffiliations: [],
    payments: p.openPayments.map(op => ({
      company: op.company,
      category: op.category,
      totalAmount: op.amount,
      paymentCount: 1,
      year: String(op.year),
      products: [],
    })),
    totalPayments: p.openPayments.reduce((s, op) => s + op.amount, 0),
    topPayers: p.openPayments.map(op => ({ company: op.company, total: op.amount })),
    procedureVolumes: p.procedureVolumes.map(pv => ({
      hcpcs: pv.hcpcs,
      description: pv.description,
      totalServices: pv.totalClaims,
      uniquePatients: pv.uniquePatients,
      avgAllowedAmt: pv.avgAllowedAmt,
      avgPaymentAmt: Math.round(pv.avgAllowedAmt * 0.78),
      placeOfService: (pv.facilityType === 'Hospital' ? 'Facility' : pv.facilityType === 'Office' ? 'Office' : 'Mixed') as 'Facility' | 'Office' | 'Mixed',
    })),
    isLive: false,
  };
}

export function useProviderProfile(npi: string | null) {
  const [state, setState] = useState<ProfileState>({
    data: null,
    loading: false,
    loadingPayments: false,
    loadingProcedures: false,
    error: null,
    usingDemo: false,
  });

  useEffect(() => {
    if (!npi) return;
    let cancelled = false;

    async function load() {
      setState(s => ({ ...s, loading: true, loadingPayments: true, loadingProcedures: true, error: null, data: null, usingDemo: false }));

      try {
        // Phase 1: NPPES + Physician Compare
        const [nppesResult, compareResult] = await Promise.all([
          lookupNpi(npi!),
          getPhysicianCompare(npi!).catch(() => null),
        ]);

        if (cancelled) return;

        if (!nppesResult) throw new Error('NOT_FOUND');

        const addr = getPracticeAddress(nppesResult);
        const tax = getPrimaryTaxonomy(nppesResult);
        const base: ProfileData = {
          npi: nppesResult.number,
          displayName: getDisplayName(nppesResult),
          firstName: nppesResult.basic.first_name ?? '',
          lastName: nppesResult.basic.last_name ?? '',
          credential: nppesResult.basic.credential?.trim() ?? '',
          specialty: mapSpecialty(tax?.code ?? '', tax?.desc ?? ''),
          gender: nppesResult.basic.sex ?? '',
          address: addr ? `${addr.address_1}${addr.address_2 ? `, ${addr.address_2}` : ''}` : '',
          city: addr?.city ?? '',
          state: addr?.state ?? '',
          zip: addr?.postal_code?.slice(0, 5) ?? '',
          phone: addr?.telephone_number ?? '',
          lastUpdated: nppesResult.basic.last_updated ?? '',
          medSchool: compareResult?.Med_sch ?? null,
          gradYear: compareResult?.Grd_yr ?? null,
          organization: compareResult?.org_nm ?? null,
          groupPracticeSize: compareResult?.num_org_mem ?? null,
          hospitalAffiliations: buildHospitalList(compareResult),
          payments: [],
          totalPayments: 0,
          topPayers: [],
          procedureVolumes: [],
          isLive: true,
          raw: nppesResult,
        };

        setState(s => ({ ...s, data: base, loading: false }));

        // Phase 2: payments + procedures (best-effort)
        const [rawPayments, procedures] = await Promise.allSettled([
          getPaymentsByNpi(npi!),
          getProcedureVolumesByNpi(npi!),
        ]);

        if (cancelled) return;

        const payments = rawPayments.status === 'fulfilled' ? aggregatePayments(rawPayments.value) : [];
        const totalPayments = payments.reduce((s, p) => s + p.totalAmount, 0);
        const payerMap = new Map<string, number>();
        payments.forEach(p => payerMap.set(p.company, (payerMap.get(p.company) ?? 0) + p.totalAmount));
        const topPayers = Array.from(payerMap.entries()).map(([company, total]) => ({ company, total })).sort((a, b) => b.total - a.total);

        setState(s => s.data ? {
          ...s,
          loadingPayments: false,
          loadingProcedures: false,
          data: {
            ...s.data,
            payments,
            totalPayments,
            topPayers,
            procedureVolumes: procedures.status === 'fulfilled' ? procedures.value : [],
          },
        } : s);
      } catch (e) {
        if (cancelled) return;

        if ((e as Error).message === 'NOT_FOUND') {
          setState(s => ({ ...s, loading: false, loadingPayments: false, loadingProcedures: false, error: 'Provider not found in NPPES registry.' }));
          return;
        }

        if (isFetchError(e)) {
          // Fall back to mock data
          const demo = mockProfile(npi!);
          setState({
            data: demo,
            loading: false,
            loadingPayments: false,
            loadingProcedures: false,
            error: null,
            usingDemo: true,
          });
        } else {
          setState(s => ({ ...s, loading: false, loadingPayments: false, loadingProcedures: false, error: (e as Error).message }));
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [npi]);

  return state;
}
