// CMS Open Payments (Sunshine Act) — public API, no auth required
// Dataset: 2022 General Payments
// UUID confirmed: df01c2f8-dc1f-4e79-96cb-8208beaf143c

const BASE = 'https://openpaymentsdata.cms.gov/api/1/datastore/query';
const DATASET_2022_GENERAL = 'df01c2f8-dc1f-4e79-96cb-8208beaf143c';
const DATASET_2021_GENERAL = '9592313e-7bce-4c9b-b986-b3cd3e1bf969';

export interface OpenPaymentRecord {
  record_id: string;
  covered_recipient_npi: string;
  covered_recipient_first_name: string;
  covered_recipient_last_name: string;
  covered_recipient_type: string;
  applicable_manufacturer_or_applicable_gpo_making_payment_name: string;
  applicable_manufacturer_or_applicable_gpo_making_payment_id: string;
  total_amount_of_payment_usdollars: string;
  nature_of_payment_or_transfer_of_value: string;
  form_of_payment_or_transfer_of_value: string;
  date_of_payment: string;
  program_year: string;
  name_of_drug_or_biological_or_device_or_medical_supply_1?: string;
  name_of_drug_or_biological_or_device_or_medical_supply_2?: string;
  covered_recipient_specialty_1?: string;
  recipient_city?: string;
  recipient_state?: string;
}

interface DkanQueryResponse {
  count: number;
  schema: Record<string, unknown>;
  results: OpenPaymentRecord[];
}

function buildConditionParams(conditions: Array<{ property: string; value: string; operator?: string }>) {
  const params = new URLSearchParams();
  conditions.forEach((c, i) => {
    params.append(`conditions[${i}][property]`, c.property);
    params.append(`conditions[${i}][value]`, c.value);
    params.append(`conditions[${i}][operator]`, c.operator ?? '=');
  });
  return params;
}

export async function getPaymentsByNpi(
  npi: string,
  options: { limit?: number; year?: '2022' | '2021' } = {}
): Promise<OpenPaymentRecord[]> {
  const dataset = options.year === '2021' ? DATASET_2021_GENERAL : DATASET_2022_GENERAL;
  const params = buildConditionParams([
    { property: 'covered_recipient_npi', value: npi },
  ]);
  params.set('limit', String(options.limit ?? 200));
  params.set('offset', '0');

  const url = `${BASE}/${dataset}/0?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open Payments API ${resp.status}`);
  const data: DkanQueryResponse = await resp.json();
  return data.results ?? [];
}

// Aggregate raw records into summary grouped by company + category
export interface PaymentSummary {
  company: string;
  category: string;
  totalAmount: number;
  paymentCount: number;
  year: string;
  products: string[];
}

export function aggregatePayments(records: OpenPaymentRecord[]): PaymentSummary[] {
  const map = new Map<string, PaymentSummary>();

  for (const r of records) {
    const company = r.applicable_manufacturer_or_applicable_gpo_making_payment_name ?? 'Unknown';
    const category = r.nature_of_payment_or_transfer_of_value ?? 'Other';
    const year = r.program_year ?? r.date_of_payment?.slice(0, 4) ?? '';
    const key = `${company}|${category}|${year}`;
    const amount = parseFloat(r.total_amount_of_payment_usdollars ?? '0') || 0;

    const products: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const prod = (r as unknown as Record<string, string>)[`name_of_drug_or_biological_or_device_or_medical_supply_${i}`];
      if (prod) products.push(prod);
    }

    if (map.has(key)) {
      const entry = map.get(key)!;
      entry.totalAmount += amount;
      entry.paymentCount += 1;
      products.forEach(p => { if (!entry.products.includes(p)) entry.products.push(p); });
    } else {
      map.set(key, { company, category, totalAmount: amount, paymentCount: 1, year, products });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
}

// Total paid by manufacturer
export function paymentsByManufacturer(summaries: PaymentSummary[]): Array<{ company: string; total: number }> {
  const map = new Map<string, number>();
  for (const s of summaries) {
    map.set(s.company, (map.get(s.company) ?? 0) + s.totalAmount);
  }
  return Array.from(map.entries())
    .map(([company, total]) => ({ company, total }))
    .sort((a, b) => b.total - a.total);
}
