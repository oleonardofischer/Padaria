import React, { useEffect } from 'react';
import { BakeryProvider, useBakery } from './context/BakeryContext';
import { Navbar } from './components/Navbar';
import { BottomNavigation } from './components/BottomNavigation';
import { NewOrderForm } from './components/NewOrderForm';
import { DailySummaryDashboard } from './components/DailySummaryDashboard';
import { InventoryManagement } from './components/InventoryManagement';
import { CustomerManagement } from './components/CustomerManagement';
import { SettingsAndSheet } from './components/SettingsAndSheet';
import { LoginModal } from './components/LoginModal';

const MainContent: React.FC = () => {
  const { activeTab, isAuthorized, emailSettings, sendDailyReportEmailNow } = useBakery();

  // Background 22:00 Daily email scheduler check
  useEffect(() => {
    if (!emailSettings.ativarEnvioAutomatico) return;

    const interval = setInterval(() => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hours}:${minutes}`;

      if (currentTime === emailSettings.horarioEnvio) {
        const todayStr = now.toISOString().split('T')[0];
        // Check if already sent today
        if (!emailSettings.ultimoEnvio?.includes(todayStr)) {
          sendDailyReportEmailNow();
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [emailSettings, sendDailyReportEmailNow]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf9f6] text-slate-800 relative selection:bg-amber-200">
      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-2 sm:px-4 py-2">
        {activeTab === 'novo-pedido' && <NewOrderForm />}
        {activeTab === 'entregas' && <DailySummaryDashboard />}
        {activeTab === 'estoque' && <InventoryManagement />}
        {activeTab === 'clientes' && <CustomerManagement />}
        {activeTab === 'configuracoes' && <SettingsAndSheet />}
      </main>

      {!isAuthorized && <LoginModal />}

      <BottomNavigation />
    </div>
  );
};

export default function App() {
  return (
    <BakeryProvider>
      <MainContent />
    </BakeryProvider>
  );
}
