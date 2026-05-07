import { ArrowLeft, Phone, MapPin, GraduationCap, Building2, ExternalLink, CheckCircle, AlertCircle, Loader2, Database, DollarSign, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useProviderProfile } from '../../hooks/useProviderProfile';
import type { ProcedureVolumeSummary } from '../../api/cms';
import type { PaymentSummary } from '../../api/openPayments';

// ── Small helpers ──────────────────────────────────────────────────────────────

function Section({ title, subtitle, children, loading }: {
  title: string; subtitle?: string; children: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-title">{title}</div>
          {subtitle && <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
      </div>
      {children}
    </div>
  );
}

function DataBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
      <Database className="w-3 h-3" /> {source}
    </span>
  );
}

function EmptyData({ message }: { message: string }) {
  return (
    <div className="text-sm text-gray-400 italic py-2">{message}</div>
  );
}

// ── Procedure volumes table ────────────────────────────────────────────────────

function ProcedureTable({ volumes }: { volumes: ProcedureVolumeSummary[] }) {
  if (!volumes.length) return <EmptyData message="No Medicare procedure volume data found for this NPI. This provider may not have sufficient Medicare claims in the 2022 PUF, or data is not yet indexed." />;
  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">HCPCS</th>
            <th className="pb-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Patients</th>
            <th className="pb-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Avg Allowed</th>
            <th className="pb-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Site</th>
          </tr>
        </thead>
        <tbody>
          {volumes.slice(0, 20).map((v, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="py-2 font-mono text-blue-600 text-xs">{v.hcpcs}</td>
              <td className="py-2 text-gray-900 pr-4">{v.description}</td>
              <td className="py-2 text-right font-semibold text-gray-900">{v.totalServices.toLocaleString()}</td>
              <td className="py-2 text-right text-gray-600">{v.uniquePatients.toLocaleString()}</td>
              <td className="py-2 text-right text-gray-600">${v.avgAllowedAmt.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
              <td className="py-2 text-center"><span className="badge-blue">{v.placeOfService}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {volumes.length > 20 && <div className="text-xs text-gray-400 mt-2">Showing top 20 of {volumes.length} procedure codes</div>}
    </>
  );
}

// ── Open Payments panel ────────────────────────────────────────────────────────

function PaymentsPanel({ payments, totalPayments, topPayers }: {
  payments: PaymentSummary[];
  totalPayments: number;
  topPayers: Array<{ company: string; total: number }>;
}) {
  if (!payments.length) {
    return (
      <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        No manufacturer payments found in 2022 Open Payments — no competitor relationships to displace.
      </div>
    );
  }

  const chartData = topPayers.slice(0, 8).map(p => ({
    company: p.company.length > 22 ? p.company.slice(0, 22) + '…' : p.company,
    amount: Math.round(p.total),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="bg-amber-50 rounded-lg p-3 text-center flex-1">
          <div className="text-xl font-bold text-amber-700">${totalPayments.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-amber-600">Total 2022 Payments</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center flex-1">
          <div className="text-xl font-bold text-blue-700">{topPayers.length}</div>
          <div className="text-xs text-blue-600">Manufacturers</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center flex-1">
          <div className="text-xl font-bold text-purple-700">{payments.length}</div>
          <div className="text-xs text-purple-600">Payment Records</div>
        </div>
      </div>

      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="company" tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} width={140} />
            <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, 'Amount']} contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
            <Bar dataKey="amount" fill="#f59e0b" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      <div className="space-y-1">
        {payments.slice(0, 10).map((p, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-sm">
            <div>
              <span className="font-medium text-gray-900">{p.company}</span>
              <span className="text-gray-400 mx-1.5">·</span>
              <span className="text-gray-600 text-xs">{p.category}</span>
              {p.products[0] && <span className="text-xs text-gray-400 ml-1">({p.products[0]})</span>}
            </div>
            <span className={`font-semibold ${p.totalAmount > 10000 ? 'text-red-600' : p.totalAmount > 2000 ? 'text-amber-600' : 'text-gray-600'}`}>
              ${p.totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        ))}
        {payments.length > 10 && <div className="text-xs text-gray-400 pt-1">+ {payments.length - 10} more payment records</div>}
      </div>
    </div>
  );
}

// ── Main profile component ─────────────────────────────────────────────────────

interface ProviderProfileProps {
  npi: string;
  setActiveView: (v: string) => void;
  previousView: string;
  onFacilitySearch?: (orgName: string) => void;
}

export default function ProviderProfile({ npi, setActiveView, previousView, onFacilitySearch }: ProviderProfileProps) {
  const { data, loading, loadingPayments, loadingProcedures, error, usingDemo } = useProviderProfile(npi);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <div className="text-sm">Loading provider from NPPES registry…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <button onClick={() => setActiveView(previousView)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="fade-in">
      {/* Sticky breadcrumb */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button onClick={() => setActiveView(previousView)}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900 truncate">{data.displayName}</span>
        <div className="ml-auto flex items-center gap-2">
          <DataBadge source="NPPES" />
          {!loadingPayments && <DataBadge source="Open Payments 2022" />}
          {!loadingProcedures && <DataBadge source="Medicare PUF 2022" />}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Demo data notice */}
        {usingDemo && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Demo data</strong> — CMS APIs (NPPES, Open Payments, Medicare PUF) are live but unreachable from this sandboxed preview.
              In a real browser, this profile is populated entirely from public CMS data.
            </span>
          </div>
        )}

        {/* Header */}
        <div className="card p-6">
          <div className="flex gap-5">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {(data.firstName[0] ?? '') + (data.lastName[0] ?? '') || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{data.displayName}</h2>
                  <div className="text-sm text-gray-500 mt-0.5">{data.specialty}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a href={`https://npiregistry.cms.hhs.gov/provider-view/${data.npi}`} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs">
                    <ExternalLink className="w-3.5 h-3.5" /> NPPES Profile
                  </a>
                  <a href={`https://openpaymentsdata.cms.gov/physician/${data.npi}`} target="_blank" rel="noopener noreferrer"
                    className="btn-secondary text-xs">
                    <DollarSign className="w-3.5 h-3.5" /> Open Payments
                  </a>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2">
                <InfoRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label={`${data.address}${data.city ? `, ${data.city}, ${data.state} ${data.zip}` : ''}`} />
                {data.phone && <InfoRow icon={<Phone className="w-4 h-4 text-gray-400" />} label={data.phone} />}
                {data.organization && (
                  <div className="flex items-start gap-2">
                    <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <button
                      onClick={() => onFacilitySearch?.(data.organization!)}
                      className={`text-sm text-left ${onFacilitySearch ? 'text-blue-600 hover:text-blue-800 hover:underline cursor-pointer' : 'text-gray-700'}`}
                      title={onFacilitySearch ? 'View in Facilities' : undefined}
                    >
                      {data.organization}{data.groupPracticeSize ? ` (${data.groupPracticeSize} members)` : ''}
                    </button>
                  </div>
                )}
                {data.medSchool && <InfoRow icon={<GraduationCap className="w-4 h-4 text-gray-400" />} label={`${data.medSchool}${data.gradYear ? ` · ${data.gradYear}` : ''}`} />}
              </div>

              {data.hospitalAffiliations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="label mb-1">Hospital Affiliations <span className="text-gray-400 font-normal">(click to search in Facilities)</span></div>
                  <div className="flex flex-wrap gap-2">
                    {data.hospitalAffiliations.map(h => (
                      <button
                        key={h}
                        onClick={() => onFacilitySearch?.(h)}
                        className="badge-blue hover:bg-blue-200 cursor-pointer transition-colors"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
            <span>NPI: <span className="font-mono text-gray-600">{data.npi}</span></span>
            <span>Gender: <span className="text-gray-600">{data.gender === 'M' ? 'Male' : data.gender === 'F' ? 'Female' : '—'}</span></span>
            <span>NPPES Last Updated: <span className="text-gray-600">{data.lastUpdated || '—'}</span></span>
          </div>
        </div>

        {/* Procedure Volumes */}
        <Section
          title="Procedure Volumes"
          subtitle="Medicare Physician & Other Practitioners PUF 2022 — CMS.gov"
          loading={loadingProcedures}
        >
          <ProcedureTable volumes={data.procedureVolumes} />
        </Section>

        {/* Open Payments */}
        <Section
          title="Open Payments — Manufacturer Relationships"
          subtitle="CMS Sunshine Act 2022 General Payments · Competitor signal analysis"
          loading={loadingPayments}
        >
          {loadingPayments ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching from openpaymentsdata.cms.gov…
            </div>
          ) : (
            <PaymentsPanel payments={data.payments} totalPayments={data.totalPayments} topPayers={data.topPayers} />
          )}
        </Section>

        {/* Taxonomy / NPPES detail */}
        <Section title="NPPES Registry Detail" subtitle="National Plan & Provider Enumeration System">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="label mb-2">All Taxonomies</div>
              <div className="space-y-1">
                {data.raw?.taxonomies?.map((t, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {t.primary && <span className="badge-green mt-0.5">Primary</span>}
                    <div>
                      <div className="text-gray-900">{t.desc}</div>
                      <div className="text-xs text-gray-400 font-mono">{t.code} · {t.state || 'N/A'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-2">All Addresses</div>
              <div className="space-y-2">
                {data.raw?.addresses?.map((a, i) => (
                  <div key={i} className="text-gray-700 text-xs leading-relaxed">
                    <span className="badge bg-gray-100 text-gray-500 mr-1">{a.address_purpose}</span>
                    {a.address_1}{a.address_2 ? `, ${a.address_2}` : ''}<br />
                    {a.city}, {a.state} {a.postal_code}
                    {a.telephone_number && <div>{a.telephone_number}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-600 min-w-0">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
