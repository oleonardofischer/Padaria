import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { AuthorizedUser, EmailSettings, Product } from '../types';
import { testSpreadsheetHealth } from '../services/googleSheets';
import {
  Settings,
  Table,
  ExternalLink,
  RefreshCw,
  Mail,
  ShieldCheck,
  UserPlus,
  Send,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock,
  Plus,
  ShoppingBag,
  Sparkles,
  Search,
  Tag,
  Check,
  Trash2,
  Power,
  AlertTriangle,
  UploadCloud,
  DownloadCloud,
  LogIn,
  KeyRound,
  FileSpreadsheet,
  Activity,
  Copy,
  Share2
} from 'lucide-react';
import { SheetsDiagnostics } from './SheetsDiagnostics';

export const SettingsAndSheet: React.FC = () => {
  const {
    spreadsheetId,
    setSpreadsheetId,
    syncWithGoogleSheets,
    pushAllToGoogleSheets,
    isSyncing,
    syncStatus,
    lastSyncTime,
    syncError,
    authorizedUsers,
    addAuthorizedUser,
    emailSettings,
    updateEmailSettings,
    sendDailyReportEmailNow,
    currentUser,
    authToken,
    loginWithGoogle,
    products,
    customers,
    orders,
    addProduct,
    updateProduct,
    deleteProduct,
    bakeryPin,
    updateBakeryPin,
    pendingUserEmail,
    approvePendingUser
  } = useBakery();

  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);
  const [activeSubTab, setActiveSubTab] = useState<'diagnostico' | 'planilha' | 'produtos' | 'email' | 'usuarios'>('diagnostico');
  const [isEditingSheetId, setIsEditingSheetId] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Bakery PIN state
  const [pinEditing, setPinEditing] = useState(bakeryPin);
  const [pinSuccessMsg, setPinSuccessMsg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync action feedback
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isPushing, setIsPushing] = useState(false);

  // Diagnostics test
  const [isTestingHealth, setIsTestingHealth] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    success: boolean;
    title?: string;
    sheets: string[];
    message: string;
    actionRequired?: 'auth' | 'permission' | 'not_found' | 'none';
  } | null>(null);

  // New authorized user form
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<AuthorizedUser['cargo']>('Padeiro(a)');
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  // New Product Modal state
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Pães Rústicos');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdWeight, setNewProdWeight] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductCategory, setSelectedProductCategory] = useState('Todos');

  // Email form local state
  const [recipientEmail, setRecipientEmail] = useState(emailSettings.emailDestinatario);
  const [sendTime, setSendTime] = useState(emailSettings.horarioEnvio);
  const [autoSend, setAutoSend] = useState(emailSettings.ativarEnvioAutomatico);
  const [savedSuccessBanner, setSavedSuccessBanner] = useState(false);

  const handleSaveSheetId = () => {
    if (inputSheetId.trim()) {
      setSpreadsheetId(inputSheetId.trim());
      setIsEditingSheetId(false);
      syncWithGoogleSheets();
    }
  };

  const handleRunHealthCheck = async () => {
    if (!authToken) {
      setHealthResult({
        success: false,
        sheets: [],
        message: 'Você precisa conectar sua Conta Google para testar a comunicação com a planilha.',
        actionRequired: 'auth'
      });
      return;
    }

    setIsTestingHealth(true);
    setHealthResult(null);
    try {
      const res = await testSpreadsheetHealth(authToken, spreadsheetId);
      setHealthResult(res);
    } catch (err: any) {
      setHealthResult({
        success: false,
        sheets: [],
        message: err.message || 'Erro ao testar planilha',
        actionRequired: 'none'
      });
    } finally {
      setIsTestingHealth(false);
    }
  };

  const handlePullFromSheet = async () => {
    setSyncFeedback(null);
    const res = await syncWithGoogleSheets();
    if (res.success) {
      setSyncFeedback({ type: 'success', message: res.message });
    } else {
      setSyncFeedback({ type: 'error', message: res.message });
    }
  };

  const handlePushToSheet = async () => {
    setIsPushing(true);
    setSyncFeedback(null);
    try {
      const res = await pushAllToGoogleSheets();
      if (res.success) {
        setSyncFeedback({ type: 'success', message: res.message });
      } else {
        setSyncFeedback({ type: 'error', message: res.message });
      }
    } finally {
      setIsPushing(false);
    }
  };

  const handleSaveEmailSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateEmailSettings({
      ...emailSettings,
      emailDestinatario: recipientEmail.trim(),
      horarioEnvio: sendTime,
      ativarEnvioAutomatico: autoSend
    });
    setSavedSuccessBanner(true);
    setTimeout(() => setSavedSuccessBanner(false), 3000);
  };

  const handleTestEmail = async () => {
    setIsSendingTestEmail(true);
    setEmailStatus(null);
    try {
      const res = await sendDailyReportEmailNow();
      if (res.success) {
        setEmailStatus('✅ E-mail de teste enviado com sucesso!');
      } else {
        setEmailStatus('❌ ' + (res.error || 'Erro no envio do e-mail.'));
      }
    } catch (err: any) {
      setEmailStatus('❌ Erro: ' + err.message);
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim()) return;

    await addAuthorizedUser({
      email: newUserEmail.trim().toLowerCase(),
      nome: newUserName.trim() || 'Usuário',
      cargo: newUserRole,
      ativo: true
    });

    setNewUserEmail('');
    setNewUserName('');
    setIsAddUserOpen(false);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinEditing.trim().length >= 4) {
      updateBakeryPin(pinEditing.trim());
      setPinSuccessMsg(true);
      setTimeout(() => setPinSuccessMsg(false), 3500);
    }
  };

  const handleCopyLink = () => {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard?.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 3000);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const priceNum = parseFloat(newProdPrice.replace(',', '.')) || 0;
    addProduct({
      nome: newProdName.trim(),
      categoria: newProdCategory.trim() || 'Pães Rústicos',
      preco: priceNum,
      pesoOuTamanho: newProdWeight.trim() || '500g',
      descricao: newProdDesc.trim(),
      ativo: true
    });

    setNewProdName('');
    setNewProdCategory('Pães Rústicos');
    setNewProdPrice('');
    setNewProdWeight('');
    setNewProdDesc('');
    setIsAddProductOpen(false);
  };

  const categories = useMemo(() => {
    return ['Todos', ...Array.from(new Set(products.map(p => p.categoria)))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedProductCategory === 'Todos' || p.categoria === selectedProductCategory;
      const matchQuery = !productSearch.trim() || 
        p.nome.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.categoria.toLowerCase().includes(productSearch.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [products, selectedProductCategory, productSearch]);

  const googleSpreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 pb-28 space-y-4">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100">
        <h2 className="font-serif-bakery font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
            <Settings className="w-4 h-4" />
          </div>
          <span>Planilha Google Drive, Produtos & Acesso</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Gerencie a comunicação com a API Google Sheets, diagnóstico de leitura/escrita, catálogo de pães e relatórios.
        </p>
      </div>

      {/* Sub-tabs switcher */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveSubTab('diagnostico')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'diagnostico'
              ? 'bg-amber-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Diagnóstico & Logs da API</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('planilha')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'planilha'
              ? 'bg-amber-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Planilha & Sincronização</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('produtos')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'produtos'
              ? 'bg-amber-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Catálogo de Pães ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('email')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'email'
              ? 'bg-amber-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>E-mail às 22h</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('usuarios')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'usuarios'
              ? 'bg-amber-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Usuários ({authorizedUsers.length})</span>
        </button>
      </div>

      {/* DIAGNOSTICS TAB */}
      {activeSubTab === 'diagnostico' && <SheetsDiagnostics />}

      {/* 1. GOOGLE SHEETS DATABASE INTEGRATION */}
      {activeSubTab === 'planilha' && (
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="font-serif-bakery font-bold text-base text-slate-900">
              Conexão com a Planilha Google Drive
            </h3>
          </div>
          <a
            href={googleSpreadsheetUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
          >
            <Table className="w-3.5 h-3.5" />
            <span>Abrir Planilha no Drive</span>
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>

        {/* Google Account Status Banner */}
        {!authToken ? (
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <KeyRound className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">Conexão com Google Drive Não Autorizada</p>
                <p className="text-[11px] text-amber-700">Faça login com sua Conta Google para permitir leitura e gravação automática na planilha.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loginWithGoogle}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Conectar Conta Google</span>
            </button>
          </div>
        ) : (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Conta Google Conectada: <b>{currentUser?.email || 'Autenticado'}</b></span>
            </div>
            <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              OAuth Ativo
            </span>
          </div>
        )}

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">ID da Planilha no Google Drive:</span>
              {!isEditingSheetId && (
                <button
                  type="button"
                  onClick={() => setIsEditingSheetId(true)}
                  className="text-amber-800 hover:text-amber-950 font-bold text-[11px] underline"
                >
                  Alterar ID
                </button>
              )}
            </div>

            {isEditingSheetId ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputSheetId}
                  onChange={e => setInputSheetId(e.target.value)}
                  placeholder="Cole o ID da planilha do Google Drive..."
                  className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-xl font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  onClick={handleSaveSheetId}
                  className="px-3 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl text-xs"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputSheetId(spreadsheetId);
                    setIsEditingSheetId(false);
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-white rounded-xl font-mono text-[11px] text-slate-800 break-all border border-slate-200 flex items-center justify-between">
                <span>{spreadsheetId}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200">
            <span className="font-semibold text-slate-700">Status da Sincronização:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] ${
                syncStatus === 'synced'
                  ? 'bg-emerald-100 text-emerald-800'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-100 text-amber-800 animate-pulse'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {syncStatus === 'synced'
                ? 'Conectado e Atualizado'
                : syncStatus === 'syncing'
                ? 'Processando com Google Drive...'
                : 'Salvo Localmente no App'}
            </span>
          </div>

          {lastSyncTime && (
            <p className="text-[11px] text-slate-500">
              Última sincronização: {lastSyncTime.toLocaleDateString('pt-BR')} às {lastSyncTime.toLocaleTimeString('pt-BR')}
            </p>
          )}

          {syncFeedback && (
            <div
              className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : syncFeedback.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>{syncFeedback.message}</div>
            </div>
          )}

          {syncError && !syncFeedback && (
            <p className="text-[11px] text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {syncError}
            </p>
          )}

          {/* TWO-WAY SYNC ACTIONS */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handlePullFromSheet}
              disabled={isSyncing || isPushing}
              className="px-3.5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <DownloadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>{isSyncing ? 'Puxando do Drive...' : '📥 Puxar da Planilha'}</span>
            </button>

            <button
              onClick={handlePushToSheet}
              disabled={isSyncing || isPushing}
              className="px-3.5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
              <span>{isPushing ? 'Gravando no Drive...' : '📤 Salvar na Planilha'}</span>
            </button>

            <button
              onClick={handleRunHealthCheck}
              disabled={isTestingHealth}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingHealth ? 'animate-spin' : ''}`} />
              <span>{isTestingHealth ? 'Testando...' : '🔍 Testar Conexão'}</span>
            </button>
          </div>

          {/* Health Check Diagnostics Result */}
          {healthResult && (
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                healthResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {healthResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span>{healthResult.message}</span>
              </div>

              {healthResult.sheets && healthResult.sheets.length > 0 && (
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-slate-700 mb-1">Abas encontradas na sua planilha:</p>
                  <div className="flex flex-wrap gap-1">
                    {healthResult.sheets.map((sh, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white rounded-md border border-slate-200 text-[10px] font-mono">
                        {sh}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {healthResult.actionRequired === 'permission' && (
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-[11px] space-y-1">
                  <p className="font-bold text-amber-900">📌 Como resolver no Google Drive:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                    <li>Abra a planilha no Google Drive.</li>
                    <li>Clique no botão <b>Compartilhar</b> (canto superior direito).</li>
                    <li>Adicione seu e-mail <b>{currentUser?.email || 'logado'}</b> com a permissão <b>Editor</b>.</li>
                    <li>Clique em Concluir e tente novamente.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info on Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center text-[11px] font-bold text-slate-600">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            🥖 Aba <b>Produtos</b> ({products.length})
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            📄 Aba <b>Pedidos</b> ({orders.length})
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            👥 Aba <b>Clientes</b> ({customers.length})
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            🌾 Aba <b>Estoque</b>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
            🔒 Aba <b>Usuarios</b> ({authorizedUsers.length})
          </div>
        </div>
      </div>
      )}

      {/* 2. PRODUCT CATALOG FROM GOOGLE SHEETS */}
      {activeSubTab === 'produtos' && (
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-bakery font-bold text-base text-slate-900">
                Catálogo de Produtos & Pães
              </h3>
              <p className="text-[11px] text-slate-500">
                {products.length} produto(s) disponíveis para anotação de pedidos
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-3.5 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Novo Pão</span>
          </button>
        </div>

        {/* Search & Category filter */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={productSearch}
              onChange={e => setProductSearch(e.target.value)}
              placeholder="Buscar pão ou produto no catálogo..."
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedProductCategory(cat)}
                className={`px-3 py-1 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors ${
                  selectedProductCategory === cat
                    ? 'bg-amber-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 max-h-[380px] overflow-y-auto pr-1">
          {filteredProducts.map(prod => (
            <div
              key={prod.id}
              className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-bold text-sm text-slate-900 leading-tight">
                    {prod.nome}
                  </span>
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-lg shrink-0">
                    R$ {prod.preco.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                  <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-md">
                    {prod.categoria}
                  </span>
                  {prod.pesoOuTamanho && (
                    <span>• {prod.pesoOuTamanho}</span>
                  )}
                </div>
                {prod.descricao && (
                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2 italic">
                    "{prod.descricao}"
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 text-[10px]">
                <button
                  type="button"
                  onClick={() => updateProduct({ ...prod, ativo: !prod.ativo })}
                  className={`font-semibold px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 ${
                    prod.ativo
                      ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title={prod.ativo ? 'Clique para pausar vendas deste pão' : 'Clique para ativar vendas deste pão'}
                >
                  <Power className="w-3 h-3" />
                  <span>{prod.ativo ? 'Disponível' : 'Pausado'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">
                    {prod.id}
                  </span>
                  <button
                    type="button"
                    onClick={() => setProductToDelete(prod)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir este pão do catálogo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* 3. AUTOMATIC 22:00 EMAIL SETTINGS */}
      {activeSubTab === 'email' && (
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Mail className="w-4 h-4" />
          </div>
          <h3 className="font-serif-bakery font-bold text-base text-slate-900">
            Disparo Automático de E-mail às 22:00 (Gmail)
          </h3>
        </div>

        <form onSubmit={handleSaveEmailSettings} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              E-mail de Destino do Relatório Diário *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="ex: oleonardofischer@gmail.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Horário de Envio</label>
              <input
                type="time"
                value={sendTime}
                onChange={e => setSendTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200 w-full cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSend}
                  onChange={e => setAutoSend(e.target.checked)}
                  className="rounded text-amber-700 w-4 h-4"
                />
                <span className="font-bold text-slate-800 text-[11px]">
                  Ativar Envio Automático
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isSendingTestEmail}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50 border border-slate-200"
            >
              <Send className="w-3.5 h-3.5 text-amber-700" />
              <span>{isSendingTestEmail ? 'Disparando...' : 'Enviar E-mail de Teste Agora'}</span>
            </button>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold rounded-xl shadow-sm transition-colors"
            >
              Salvar Configuração
            </button>
          </div>

          {emailStatus && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-slate-800 font-medium">
              {emailStatus}
            </div>
          )}

          {savedSuccessBanner && (
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-center">
              Configurações salvas com sucesso!
            </div>
          )}
        </form>
      </div>
      )}

      {/* 4. ACCESS CONTROL / AUTHORIZED USERS */}
      {activeSubTab === 'usuarios' && (
      <div className="space-y-4">
        {/* Pending User Approval Banner */}
        {pendingUserEmail && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-3xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
              <span>Tentativa de Acesso Recente Detectada</span>
            </div>
            <p className="text-xs text-slate-700">
              O e-mail <b>{pendingUserEmail}</b> conectou via Google e solicitou acesso. Deseja aprovar este usuário agora?
            </p>
            <div className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => approvePendingUser(pendingUserEmail)}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar Acesso para {pendingUserEmail}</span>
              </button>
            </div>
          </div>
        )}

        {/* Bakery PIN Settings Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-bakery font-bold text-base text-slate-900">
                PIN de Acesso Rápido da Padaria
              </h3>
              <p className="text-xs text-slate-500">
                Código mestre para a Tati e a equipe liberarem o sistema no celular sem fricção.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePin} className="flex flex-wrap items-center gap-2 pt-1">
            <div className="relative w-36">
              <input
                type="text"
                maxLength={8}
                value={pinEditing}
                onChange={e => setPinEditing(e.target.value)}
                placeholder="ex: 2026"
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-mono tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Salvar Novo PIN
            </button>

            {pinSuccessMsg && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-4 h-4" />
                PIN atualizado com sucesso!
              </span>
            )}
          </form>

          <p className="text-[11px] text-slate-500">
            PIN atual: <b className="font-mono text-slate-800">{bakeryPin}</b>. A Tati pode digitar este código na tela inicial para desbloquear o sistema imediatamente.
          </p>
        </div>

        {/* Google Drive Sharing Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-bakery font-bold text-base text-slate-900">
                Compartilhamento no Google Drive
              </h3>
              <p className="text-xs text-slate-500">
                Para que a Tati consiga salvar pedidos na planilha pelo celular dela.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2">
            <p>
              O Google Sheets exige que a conta Google da Tati tenha permissão de <b>Editor</b> na planilha.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir Planilha no Drive</span>
              </a>

              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link da Planilha'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Whitelist Stack */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="font-serif-bakery font-bold text-base text-slate-900">
                Usuários Autorizados
              </h3>
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-amber-300 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Liberar E-mail</span>
            </button>
          </div>

          <p className="text-xs text-slate-500">
            E-mails autorizados acessam o sistema automaticamente ao fazer login com o Google.
          </p>

          <div className="space-y-2">
            {authorizedUsers.map((u, i) => (
              <div
                key={i}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{u.nome}</span>
                  <span className="text-slate-500 ml-2 font-mono text-[11px]">({u.email})</span>
                </div>
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full text-[10px] border border-amber-300">
                  {u.cargo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-bakery font-bold text-lg text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-700" />
                <span>Autorizar Novo E-mail</span>
              </h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">E-mail da Conta Google *</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  placeholder="ex: tati.paoartesanal@gmail.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  placeholder="ex: Tati"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Função / Cargo</label>
                <select
                  value={newUserRole}
                  onChange={e => setNewUserRole(e.target.value as any)}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Padeiro(a)">Padeiro(a)</option>
                  <option value="Atendente">Atendente</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold shadow-sm"
                >
                  Autorizar & Salvar na Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-bakery font-bold text-lg text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-700" />
                <span>Cadastrar Novo Pão / Produto</span>
              </h3>
              <button
                onClick={() => setIsAddProductOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Pão / Produto *</label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  placeholder="ex: Pão Italiano Rústico Levain"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria *</label>
                  <input
                    type="text"
                    value={newProdCategory}
                    onChange={e => setNewProdCategory(e.target.value)}
                    placeholder="ex: Pães Rústicos"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço de Venda (R$) *</label>
                  <input
                    type="text"
                    value={newProdPrice}
                    onChange={e => setNewProdPrice(e.target.value)}
                    placeholder="ex: 28,00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peso / Tamanho</label>
                <input
                  type="text"
                  value={newProdWeight}
                  onChange={e => setNewProdWeight(e.target.value)}
                  placeholder="ex: 600g (Pão Grande)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição / Ingredientes Especiais</label>
                <textarea
                  value={newProdDesc}
                  onChange={e => setNewProdDesc(e.target.value)}
                  rows={2}
                  placeholder="ex: Fermentação natural lenta de 36 horas, crosta dourada e miolo aerado."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold shadow-sm"
                >
                  Salvar na Planilha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif-bakery font-bold text-base text-slate-900">
                  Excluir Produto?
                </h3>
                <p className="text-xs text-slate-500">
                  Tem certeza que deseja remover este pão do catálogo?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{productToDelete.nome}</p>
              <p className="text-slate-500 text-[11px] mt-0.5">{productToDelete.categoria} • R$ {productToDelete.preco.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm transition-colors"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
