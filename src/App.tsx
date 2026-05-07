import { useState } from 'react';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import ProviderSearch from './components/providers/ProviderSearch';
import ProviderProfile from './components/providers/ProviderProfile';
import CptExplorer from './components/cpt/CptExplorer';
import FacilitiesView from './components/facilities/FacilityProfile';
import TerritoryAnalytics from './components/territory/TerritoryAnalytics';
import ReferralNetwork from './components/referrals/ReferralNetwork';

export default function App() {
  const [activeView, setActiveView] = useState('search');
  const [selectedNpi, setSelectedNpi] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState('search');

  const navigateTo = (view: string) => {
    setPreviousView(activeView);
    setActiveView(view);
  };

  const renderView = () => {
    switch (activeView) {
      case 'search':
        return <ProviderSearch setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'profile':
        return selectedNpi
          ? <ProviderProfile npi={selectedNpi} setActiveView={navigateTo} previousView={previousView} />
          : <ProviderSearch setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'cpt':
        return <CptExplorer setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'facilities':
        return <FacilitiesView setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      case 'territory':
        return <TerritoryAnalytics />;
      case 'referrals':
        return <ReferralNetwork setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
      default:
        return <ProviderSearch setActiveView={navigateTo} setSelectedNpi={setSelectedNpi} />;
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
