import { Bell, RefreshCw, ExternalLink } from 'lucide-react';

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard:  { title: 'Dashboard',          subtitle: 'Commercial intelligence overview' },
  search:     { title: 'Provider Search',    subtitle: 'Live NPPES NPI Registry · 7M+ providers' },
  profile:    { title: 'Provider Profile',   subtitle: 'NPPES · Open Payments · Medicare PUF' },
  facilities: { title: 'Facilities',         subtitle: 'Hospitals, ASCs, and outpatient sites of care' },
  territory:  { title: 'Territory Analytics',subtitle: 'Total addressable market and opportunity distribution' },
  referrals:  { title: 'Referral Network',   subtitle: 'Patient flow and referral relationships' },
  strategies: { title: 'Strategy Engine',    subtitle: 'Define commercial priorities and rank target providers' },
  trends:     { title: 'Market Trends',      subtitle: 'Procedure volume trends and market dynamics' },
  team:       { title: 'Team Performance',   subtitle: 'Rep activity and territory comparison' },
};

export default function Header({ activeView }: { activeView: string }) {
  const info = viewTitles[activeView] ?? { title: 'MedScout', subtitle: '' };
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold text-gray-900">{info.title}</h1>
        {info.subtitle && <p className="text-xs text-gray-400">{info.subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <a
          href="https://data.cms.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-full transition-colors"
        >
          CMS Public Data <ExternalLink className="w-3 h-3" />
        </a>
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors relative">
          <Bell className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </header>
  );
}
