import {
  LayoutDashboard, Search, Building2, Map, GitBranch,
  Target, Activity, TrendingUp, Users, Settings, Stethoscope
} from 'lucide-react';

interface NavItem { id: string; label: string; icon: React.ElementType; }

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'search', label: 'Provider Search', icon: Search },
  { id: 'cpt', label: 'CPT Explorer', icon: Stethoscope },
  { id: 'facilities', label: 'Facilities', icon: Building2 },
  { id: 'territory', label: 'Territory Analytics', icon: Map },
  { id: 'referrals', label: 'Referral Network', icon: GitBranch },
  { id: 'strategies', label: 'Strategy Engine', icon: Target },
  { id: 'trends', label: 'Market Trends', icon: TrendingUp },
  { id: 'team', label: 'Team Performance', icon: Users },
];

interface SidebarProps {
  activeView: string;
  setActiveView: (v: string) => void;
}

export default function Sidebar({ activeView, setActiveView }: SidebarProps) {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Activity className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-bold text-gray-900 text-sm leading-tight">MedScout</div>
          <div className="text-xs text-gray-400 leading-tight">Commercial Intelligence</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={activeView === item.id ? 'nav-item-active w-full text-left' : 'nav-item-inactive w-full text-left'}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Data sources badge */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 font-medium mb-1.5">Live Data Sources</div>
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />NPPES NPI Registry</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />CMS Open Payments 2022</div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Medicare PUF 2022–2023</div>
        </div>
      </div>

      {/* Settings */}
      <div className="px-3 pb-3">
        <button className="nav-item-inactive w-full text-left">
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>
    </aside>
  );
}
