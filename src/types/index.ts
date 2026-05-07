export type UserRole = 'rep' | 'manager' | 'marketing';

export interface Provider {
  npi: string;
  name: string;
  firstName: string;
  lastName: string;
  specialty: string;
  subspecialty?: string;
  credentials: string;
  organization: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  };
  phone: string;
  gender: 'M' | 'F';
  medSchool: string;
  gradYear: number;
  idn?: string;
  groupPractice?: string;
  procedureVolumes: ProcedureVolume[];
  diagnosisVolumes: DiagnosisVolume[];
  payerMix: PayerMix;
  openPayments: OpenPayment[];
  affiliates: string[]; // NPIs
  opportunityScore: number;
  fitScore?: number;
  competitorSignals: CompetitorSignal[];
  referralSummary: {
    totalReferralsOut: number;
    totalReferralsIn: number;
    topReferralSources: string[];
    topReferralDestinations: string[];
  };
  monthlyVolumes: MonthlyVolume[];
}

export interface ProcedureVolume {
  hcpcs: string;
  description: string;
  category: string;
  totalClaims: number;
  uniquePatients: number;
  avgAllowedAmt: number;
  year: number;
  roboticFlag?: boolean;
  facilityType: 'ASC' | 'Hospital' | 'Office' | 'Mixed';
}

export interface DiagnosisVolume {
  icd10: string;
  description: string;
  count: number;
  year: number;
}

export interface PayerMix {
  medicare: number;
  medicaid: number;
  commercial: number;
  selfPay: number;
}

export interface OpenPayment {
  company: string;
  amount: number;
  category: string;
  year: number;
}

export interface CompetitorSignal {
  competitor: string;
  product: string;
  strength: 'high' | 'medium' | 'low';
  inferredFrom: string;
}

export interface MonthlyVolume {
  month: string;
  procedures: number;
  revenue: number;
}

export interface Facility {
  id: string;
  name: string;
  type: 'Hospital' | 'ASC' | 'Clinic' | 'Office';
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lng: number;
  };
  idn?: string;
  beds?: number;
  affiliatedProviders: number;
  procedureVolumes: ProcedureVolume[];
  payerMix: PayerMix;
  cmsRating?: number;
  specialties: string[];
  monthlyVolumes: MonthlyVolume[];
}

export interface Territory {
  id: string;
  name: string;
  repName: string;
  repId: string;
  states: string[];
  zips?: string[];
  providerCount: number;
  tam: number;
  currentRevenue: number;
  quota: number;
  topProcedures: string[];
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  territory: string;
  filters: {
    specialties: string[];
    procedures: string[];
    minProcedureVolume: number;
    minCommercialPct: number;
    maxRoboticPct: number;
    states: string[];
  };
  createdBy: string;
  createdAt: string;
  status: 'active' | 'draft' | 'archived';
  targetCount: number;
}

export interface ReferralEdge {
  sourceNpi: string;
  targetNpi: string;
  patientCount: number;
  shareOfVoice: number;
}

export interface Opportunity {
  provider: Provider;
  score: number;
  reasons: string[];
  priority: 'hot' | 'warm' | 'cool';
  estimatedValue: number;
  lastContact?: string;
  nextAction?: string;
}
