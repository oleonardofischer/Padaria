import React from 'react';
import { useBakery } from '../context/BakeryContext';
import { PlusCircle, CalendarCheck2, PackageCheck, Users, Settings, Flame } from 'lucide-react';
import { ActiveTab } from '../types';

export const BottomNavigation: React.FC = () => {
  const { activeTab, setActiveTab, orders, lowStockItemsCount } = useBakery();

  const todayIso = new Date().toISOString().split('T')[0];
  const pendingDeliveriesToday = orders.filter(
    o => o.dataEntrega === todayIso && o.status !== 'entregue' && o.status !== 'cancelado'
  ).length;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number; badgeColor?: string }[] = [
    {
      id: 'novo-pedido',
      label: 'Anotar Pedido',
      icon: <PlusCircle className="w-5 h-5" />
    },
    {
      id: 'entregas',
      label: 'Entregas Hoje',
      icon: <CalendarCheck2 className="w-5 h-5" />,
      badge: pendingDeliveriesToday > 0 ? pendingDeliveriesToday : undefined,
      badgeColor: 'bg-amber-600'
    },
    {
      id: 'estoque',
      label: 'Estoque',
      icon: <PackageCheck className="w-5 h-5" />,
      badge: lowStockItemsCount > 0 ? lowStockItemsCount : undefined,
      badgeColor: 'bg-red-500 animate-pulse'
    },
    {
      id: 'clientes',
      label: 'Clientes',
      icon: <Users className="w-5 h-5" />
    },
    {
      id: 'configuracoes',
      label: 'Planilha & 22h',
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-amber-100 shadow-[0_-2px_10px_rgba(0,0,0,0.04)] pb-safe">
      <div className="max-w-md sm:max-w-2xl mx-auto px-2 sm:px-3 py-1.5 flex items-center justify-around">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-colors min-w-[58px] ${
                isActive
                  ? 'text-amber-900 font-bold bg-amber-100/70'
                  : 'text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-50'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white rounded-full flex items-center justify-center ${
                      item.badgeColor || 'bg-amber-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 whitespace-nowrap tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
