import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import ProviderSearch from './components/providers/ProviderSearch';
import ProviderProfile from './components/providers/ProviderProfile';
import CptExplorer from './components/cpt/CptExplorer';
import FacilitiesView from './components/facilities/FacilityProfile';
import TerritoryAnalytics from './components/territory/TerritoryAnalytics';
import ReferralNetwork from './components/referrals/ReferralNetwork';
import StrategyEngine from './components/strategies/StrategyEngine';

function PlaceholderView({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-center h-full text-gray-400 flex-col gap-3 fade-in">
      <div className="text-4xl">📊</div>
      <div className="text-lg font-medium text-gray-600">{title}</div>
      {subtitle && <div className="text-sm text-center max-w-sm">{subtitle}</div>}
    </div>
  );
}

export default function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState('search');

  const navigateTo = (view: string) => {
    setPreviousView(activeView);
    setActiveView(view);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'search':
        return <ProviderSearch setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'profile':
        return selectedNpi
          ? <ProviderProfile npi={selectedNpi} setActiveView={navigateTo} previousView={previousView} />
          : <ProviderSearch setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'cpt':
        return <CptExplorer setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'facilities':
        return <FacilitiesView setActiveView={navigateTo} />;
      case 'territory':
        return <TerritoryAnalytics />;
      case 'referrals':
        return <ReferralNetwork setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'strategies':
        return <StrategyEngine setActiveView={navigateTo} />;
      case 'trends':
        return <PlaceholderView title="Market Trends" subtitle="Procedure volume trends and market dynamics — pipeline" />;
      case 'team':
        return <PlaceholderView title="Team Performance" subtitle="Rep activity, pipeline coverage, and territory comparison — pipeline" />;
      default:
        return <Dashboard setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeView={activeView} />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
