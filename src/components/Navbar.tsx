import React from 'react';
import { useBakery } from '../context/BakeryContext';
import { RefreshCw, CheckCircle2, AlertTriangle, LogOut, User as UserIcon, Sparkles, Send } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    isAuthorized,
    logoutUser,
    syncWithGoogleSheets,
    isSyncing,
    syncStatus,
    sendDailyReportEmailNow,
    lowStockItemsCount,
    spreadsheetId
  } = useBakery();

  const [isSendingEmail, setIsSendingEmail] = React.useState(false);
  const [emailNotification, setEmailNotification] = React.useState<string | null>(null);

  const handleSendReport = async () => {
    setIsSendingEmail(true);
    setEmailNotification(null);
    try {
      const res = await sendDailyReportEmailNow();
      if (res.success) {
        setEmailNotification('E-mail enviado com sucesso! ✉️');
      } else {
        setEmailNotification(res.error || 'Erro ao enviar e-mail');
      }
    } catch (e: any) {
      setEmailNotification('Falha ao enviar e-mail: ' + e.message);
    } finally {
      setIsSendingEmail(false);
      setTimeout(() => setEmailNotification(null), 4000);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 text-slate-800 border-b border-amber-100 shadow-sm">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-800 flex items-center justify-center text-lg text-white font-bold shadow-sm">
            🥖
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-serif-bakery font-bold text-base sm:text-lg leading-tight tracking-wide text-slate-900">
                Pão da Tati
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.2 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                Artesanal
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-none mt-0.5">
              Gestão de Encomendas & Fornada
            </p>
          </div>
        </div>

        {/* Action buttons & status */}
        <div className="flex items-center gap-2">
          
          {/* Quick email dispatch trigger */}
          <button
            onClick={handleSendReport}
            disabled={isSendingEmail}
            title="Enviar resumo de amanhã por e-mail (Gmail)"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors shadow-sm disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 text-amber-700 ${isSendingEmail ? 'animate-pulse' : ''}`} />
            <span>{isSendingEmail ? 'Enviando...' : 'E-mail 22h'}</span>
          </button>

          {/* Sync status button */}
          <button
            onClick={() => syncWithGoogleSheets()}
            disabled={isSyncing}
            title="Sincronizar com Google Sheets"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : 'text-amber-700'}`} />
            <span className="hidden xs:inline">
              {syncStatus === 'synced' ? 'Planilha OK' : syncStatus === 'syncing' ? 'Sincronizando' : 'Sincronizar'}
            </span>
          </button>

          {/* User profile / Logout */}
          {currentUser ? (
            <div className="flex items-center gap-1.5 pl-1">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Usuário'}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl border border-slate-200 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-800 text-white flex items-center justify-center text-xs shadow-sm font-bold">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={logoutUser}
                title="Sair da conta Google"
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : isAuthorized ? (
            <div className="flex items-center gap-1 pl-1">
              <span className="text-[10px] sm:text-xs font-bold text-amber-900 bg-amber-100 border border-amber-200 px-2 py-1 rounded-xl whitespace-nowrap">
                Tati (Padeiro)
              </span>
              <button
                onClick={logoutUser}
                title="Sair do sistema"
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Email Toast Banner if triggered */}
      {emailNotification && (
        <div className="bg-emerald-700 text-white px-4 py-2 text-xs text-center border-t border-emerald-600 font-medium">
          {emailNotification}
        </div>
      )}
    </header>
  );
};
