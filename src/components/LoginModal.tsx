import React, { useState } from 'react';
import { useBakery } from '../context/BakeryContext';
import { ShieldCheck, AlertCircle, KeyRound, CheckCircle2, UserCheck, ArrowRight } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const {
    currentUser,
    isAuthorized,
    isAuthenticating,
    loginWithGoogle,
    logoutUser,
    continueAsGuest,
    unlockWithBakeryPin
  } = useBakery();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPinEntry, setShowPinEntry] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao autenticar com a conta Google');
    }
  };

  const handlePinUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!pinInput.trim()) {
      setErrorMessage('Por favor, digite o PIN da padaria.');
      return;
    }

    const result = unlockWithBakeryPin(pinInput);
    if (result.success) {
      setSuccessMessage(result.message);
    } else {
      setErrorMessage(result.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-xl border border-slate-200 text-center space-y-5">
        
        {/* Brand Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500 flex items-center justify-center text-3xl shadow-sm border border-amber-300">
          🥖
        </div>

        {/* Title & Copy */}
        <div>
          <h2 className="font-serif-bakery font-bold text-xl sm:text-2xl text-slate-900">
            Padaria Artesanal da Tati
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto">
            Acesse o sistema para registrar encomendas, gerenciar a produção do dia e controlar o estoque.
          </p>
        </div>

        {/* Case 1: Signed into Google, but email not yet automatically authorized */}
        {currentUser && !isAuthorized ? (
          <div className="space-y-4 text-left">
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <UserCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Conta Google Conectada!</span>
              </div>
              <p className="text-xs text-slate-700">
                Olá, <b>{currentUser.displayName || 'Tati'}</b> ({currentUser.email}).
              </p>
              <p className="text-[11px] text-slate-600">
                Para autorizar este aparelho com segurança e liberar seus acessos, digite o PIN da padaria:
              </p>
            </div>

            <form onSubmit={handlePinUnlock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  PIN de Acesso da Padaria
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    placeholder="Digite o PIN (ex: 2026)"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dica: O PIN padrão da padaria é <b>2026</b>.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Liberar Acesso & Autorizar Meu E-mail</span>
              </button>
            </form>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={logoutUser}
                className="text-slate-500 hover:text-slate-800 underline text-[11px]"
              >
                Trocar conta Google
              </button>
              <button
                type="button"
                onClick={continueAsGuest}
                className="text-amber-800 hover:text-amber-950 font-bold text-[11px]"
              >
                Entrar em Modo Local
              </button>
            </div>
          </div>
        ) : showPinEntry ? (
          /* Case 2: User chose to enter directly via PIN */
          <div className="space-y-4 text-left">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <KeyRound className="w-4 h-4 text-amber-700" />
                <span>Acesso Rápido por Código / PIN</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Ideal para uso ágil no celular da Tati ou na bancada de produção sem depender do login Google.
              </p>
            </div>

            <form onSubmit={handlePinUnlock} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Digite o PIN da Padaria
                </label>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    placeholder="ex: 2026"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  PIN inicial configurado: <b>2026</b>
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Entrar no Sistema</span>
              </button>
            </form>

            <button
              type="button"
              onClick={() => setShowPinEntry(false)}
              className="w-full py-1 text-center text-xs text-slate-500 hover:text-slate-800 font-medium"
            >
              ← Voltar para opções de login
            </button>
          </div>
        ) : (
          /* Case 3: Initial Screen - Choose Google Login or Bakery PIN */
          <div className="space-y-3">
            <button
              onClick={handleGoogleLogin}
              disabled={isAuthenticating}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm rounded-2xl border border-slate-300 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              </svg>
              <span>{isAuthenticating ? 'Conectando ao Google...' : 'Entrar com Conta Google'}</span>
            </button>

            <button
              onClick={() => setShowPinEntry(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-2xl border border-amber-200 transition-colors cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-700" />
              <span>Entrar com Código / PIN da Padaria</span>
            </button>

            <button
              onClick={continueAsGuest}
              className="w-full py-1.5 text-xs text-slate-500 hover:text-amber-900 font-medium transition-colors"
            >
              Continuar em Modo Demonstração / Offline
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 text-left flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-800 text-left flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Security footnote */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Acesso seguro com proteção por PIN e lista de usuários</span>
        </div>
      </div>
    </div>
  );
};
