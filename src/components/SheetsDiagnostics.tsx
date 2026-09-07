import React, { useState, useEffect } from 'react';
import { useBakery } from '../context/BakeryContext';
import { apiLogger, ApiLogEntry } from '../services/apiLogger';
import { runDetailedApiDiagnostics, ComprehensiveDiagnosticReport } from '../services/googleSheets';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Copy,
  Trash2,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  DownloadCloud,
  UploadCloud,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Clock,
  Terminal,
  Info,
  LogIn
} from 'lucide-react';

export const SheetsDiagnostics: React.FC = () => {
  const {
    spreadsheetId,
    currentUser,
    authToken,
    loginWithGoogle,
    syncWithGoogleSheets,
    pushAllToGoogleSheets,
    isSyncing,
    syncStatus,
    lastSyncTime,
    products,
    customers,
    orders
  } = useBakery();

  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'error' | 'read' | 'write'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Diagnostics test runner
  const [isRunningDiag, setIsRunningDiag] = useState(false);
  const [diagReport, setDiagReport] = useState<ComprehensiveDiagnosticReport | null>(null);

  // Subscribe to apiLogger
  useEffect(() => {
    const unsub = apiLogger.subscribe(updatedLogs => {
      setLogs(updatedLogs);
    });
    return unsub;
  }, []);

  const handleRunFullDiagnostics = async () => {
    setIsRunningDiag(true);
    try {
      const report = await runDetailedApiDiagnostics(authToken || '', spreadsheetId);
      setDiagReport(report);
    } catch (err: any) {
      console.error('Erro ao executar diagnóstico:', err);
    } finally {
      setIsRunningDiag(false);
    }
  };

  const handleCopyReport = () => {
    const markdown = apiLogger.exportAsMarkdown(spreadsheetId, currentUser?.email || 'Guest');
    navigator.clipboard.writeText(markdown);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
  };

  const handleCopySpreadsheetId = () => {
    navigator.clipboard.writeText(spreadsheetId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'error' && log.status !== 'error') return false;
    if (logFilter === 'read' && log.type !== 'READ' && log.type !== 'METADATA') return false;
    if (logFilter === 'write' && log.type !== 'WRITE' && log.type !== 'APPEND' && log.type !== 'UPDATE' && log.type !== 'CLEAR') return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = log.title?.toLowerCase().includes(term);
      const matchTarget = log.target?.toLowerCase().includes(term);
      const matchErr = log.error?.toLowerCase().includes(term);
      const matchType = log.type?.toLowerCase().includes(term);
      return matchTitle || matchTarget || matchErr || matchType;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    error: logs.filter(l => l.status === 'error').length,
    warning: logs.filter(l => l.status === 'warning').length,
    avgDuration:
      logs.filter(l => typeof l.durationMs === 'number').length > 0
        ? Math.round(
            logs.reduce((acc, l) => acc + (l.durationMs || 0), 0) /
              logs.filter(l => typeof l.durationMs === 'number').length
          )
        : 0
  };

  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-800 text-amber-50 flex items-center justify-center shadow-sm shrink-0">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">Diagnóstico da API Google Sheets</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  Tempo Real
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Monitore a comunicação bidirecional, inspecione erros da API do Google e valide permissões de leitura/escrita.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleRunFullDiagnostics}
              disabled={isRunningDiag}
              className="px-4 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRunningDiag ? 'animate-spin' : ''}`} />
              <span>{isRunningDiag ? 'Executando Testes...' : 'Executar Diagnóstico Completo'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs flex items-center gap-1.5 border border-slate-200 transition-colors"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
              <span>{copiedReport ? 'Relatório Copiado!' : 'Copiar Relatório'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Card 1: Auth & Token Status */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-amber-700" />
                Autenticação Google
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  authToken ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {authToken ? 'OAuth Ativo' : 'Não Conectado'}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {currentUser?.email || 'Nenhum usuário conectado'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {authToken
                ? 'Token OAuth válido para leitura e gravação no Drive.'
                : 'Conecte sua conta para autorizar acesso à planilha.'}
            </p>
          </div>
          {!authToken && (
            <button
              onClick={loginWithGoogle}
              className="mt-3 w-full py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Conectar Conta Google</span>
            </button>
          )}
        </div>

        {/* Card 2: Planilha no Google Drive */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                Planilha no Drive
              </span>
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-bold text-amber-800 hover:underline flex items-center gap-0.5"
              >
                Abrir Planilha <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700 truncate flex items-center justify-between">
              <span className="truncate">{spreadsheetId}</span>
              <button
                onClick={handleCopySpreadsheetId}
                title="Copiar ID"
                className="ml-1 text-slate-400 hover:text-slate-700 p-0.5"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Status da sincronização: <b className="text-slate-700">{syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : 'Local'}</b>
            </p>
          </div>
          {lastSyncTime && (
            <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Última: {lastSyncTime.toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>

        {/* Card 3: Estatísticas de Requisições */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-blue-700" />
                Tráfego da API
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {stats.total} chamadas
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center mt-2">
              <div className="p-1.5 bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-semibold block">Sucesso</span>
                <span className="text-sm font-bold text-emerald-900">{stats.success}</span>
              </div>
              <div className="p-1.5 bg-red-50 rounded-xl border border-red-200">
                <span className="text-[10px] text-red-700 font-semibold block">Erros</span>
                <span className="text-sm font-bold text-red-900">{stats.error}</span>
              </div>
              <div className="p-1.5 bg-slate-100 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-600 font-semibold block">Latência</span>
                <span className="text-sm font-bold text-slate-800">{stats.avgDuration}ms</span>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Base local: {products.length} pães, {customers.length} clientes, {orders.length} pedidos.
          </p>
        </div>
      </div>

      {/* Diagnostic Report Panel (if run) */}
      {diagReport && (
        <div
          className={`rounded-3xl p-4 sm:p-5 border shadow-xs space-y-4 ${
            diagReport.allPassed ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-300'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {diagReport.allPassed ? (
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900">{diagReport.summary}</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Teste executado às {diagReport.timestamp} na planilha <code className="font-mono">{diagReport.spreadsheetId}</code>
                </p>
              </div>
            </div>
            <button
              onClick={() => setDiagReport(null)}
              className="text-xs text-slate-500 hover:text-slate-800 p-1 font-semibold"
            >
              Fechar
            </button>
          </div>

          {/* Diagnostic Steps List */}
          <div className="space-y-2 pt-1">
            {diagReport.steps.map((step, idx) => (
              <div
                key={idx}
                className="p-3 bg-white rounded-2xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  {step.status === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : step.status === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-bold text-slate-900">{step.name}</span>
                    <p className="text-slate-700 mt-0.5">{step.message}</p>
                    {step.detail && <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{step.detail}</p>}
                  </div>
                </div>
                {typeof step.durationMs === 'number' && (
                  <span className="text-[10px] font-mono text-slate-500 shrink-0 px-2 py-0.5 bg-slate-100 rounded-md">
                    {step.durationMs}ms
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Recommendations box */}
          {diagReport.recommendations.length > 0 && (
            <div className="p-3.5 bg-white rounded-2xl border border-amber-200 text-xs space-y-1.5">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-700" />
                Ações Recomendadas para Resolver:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-1">
                {diagReport.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-[11px]">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Logs section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-amber-100 shadow-sm space-y-4">
        {/* Controls header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/70">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Logs de Leitura & Escrita (Google Sheets)</h3>
            <span className="text-xs text-slate-500">({filteredLogs.length} exibidos)</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl text-[11px] font-semibold text-slate-600">
              <button
                onClick={() => setLogFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  logFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setLogFilter('error')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  logFilter === 'error' ? 'bg-red-600 text-white shadow-xs font-bold' : 'hover:text-red-700'
                }`}
              >
                Erros ({stats.error})
              </button>
              <button
                onClick={() => setLogFilter('read')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  logFilter === 'read' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Leituras (READ)
              </button>
              <button
                onClick={() => setLogFilter('write')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  logFilter === 'write' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                Escritas (WRITE)
              </button>
            </div>

            {/* Clear logs button */}
            <button
              onClick={() => apiLogger.clearLogs()}
              title="Limpar Histórico de Logs"
              className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filtrar logs por texto, aba (ex: Produtos, Pedidos), código HTTP ou erro..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-800/30"
          />
        </div>

        {/* Logs list */}
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200/60 text-xs text-slate-500 space-y-2">
            <Activity className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700">Nenhum log registrado com os filtros selecionados.</p>
            <p className="text-[11px]">
              Execute uma ação no aplicativo (adicionar pedido, puxar planilha ou salvar produtos) para gerar registros.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {filteredLogs.map(log => {
              const isExpanded = expandedLogId === log.id;
              const isError = log.status === 'error';
              const isWarning = log.status === 'warning';

              return (
                <div
                  key={log.id}
                  className={`rounded-2xl border transition-all text-xs overflow-hidden ${
                    isError
                      ? 'bg-red-50/60 border-red-200/80'
                      : isWarning
                      ? 'bg-amber-50/60 border-amber-200/80'
                      : 'bg-white border-slate-200/70 hover:border-slate-300'
                  }`}
                >
                  <div
                    onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                    className="p-3 cursor-pointer flex items-center justify-between gap-3 select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isError ? (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 uppercase font-mono ${
                          log.type === 'READ' || log.type === 'METADATA'
                            ? 'bg-blue-100 text-blue-800'
                            : log.type === 'APPEND' || log.type === 'WRITE' || log.type === 'UPDATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.type === 'CLEAR'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.type}
                      </span>

                      <div className="min-w-0">
                        <span className="font-semibold text-slate-900 truncate block">{log.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono truncate block">{log.target}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {log.httpStatus && (
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            log.httpStatus >= 200 && log.httpStatus < 300
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          HTTP {log.httpStatus}
                        </span>
                      )}
                      {typeof log.durationMs === 'number' && (
                        <span className="text-[10px] text-slate-400 font-mono">{log.durationMs}ms</span>
                      )}
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded log details */}
                  {isExpanded && (
                    <div className="p-3.5 pt-0 border-t border-slate-200/50 bg-slate-50/50 space-y-2 text-[11px]">
                      {log.error && (
                        <div className="p-2.5 bg-red-100/70 border border-red-200 rounded-xl text-red-900 font-mono text-[10px] break-all">
                          <b>Mensagem de Erro da API:</b> {log.error}
                        </div>
                      )}

                      {log.details && (
                        <div className="text-slate-700">
                          <b>Detalhes / Diagnóstico:</b> {log.details}
                        </div>
                      )}

                      {log.payloadSummary && (
                        <div className="text-slate-600 font-mono text-[10px] bg-white p-2 rounded-lg border border-slate-200 break-all">
                          <b>Resumo dos Dados:</b> {log.payloadSummary}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>ID do Log: {log.id}</span>
                        <span>Data: {log.date} {log.timestamp}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Two-way quick action footer */}
        <div className="pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-slate-500 text-[11px]">
            Precisa sincronizar imediatamente? Use os atalhos manuais:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => syncWithGoogleSheets()}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition-all disabled:opacity-50"
            >
              <DownloadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span>Puxar da Planilha (Planilha ➔ App)</span>
            </button>
            <button
              onClick={() => pushAllToGoogleSheets()}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Salvar na Planilha (App ➔ Drive)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
