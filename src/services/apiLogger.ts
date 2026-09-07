export interface ApiLogEntry {
  id: string;
  timestamp: string; // HH:mm:ss
  date: string; // YYYY-MM-DD
  type: 'READ' | 'WRITE' | 'APPEND' | 'UPDATE' | 'CLEAR' | 'METADATA' | 'AUTH' | 'TEST';
  target: string; // e.g. "Produtos!A:Z", "Pedidos!A:N"
  status: 'success' | 'error' | 'pending' | 'warning';
  title: string;
  details?: string;
  httpStatus?: number;
  durationMs?: number;
  payloadSummary?: string;
  error?: string;
}

const STORAGE_KEY = 'bakery_sheets_api_logs_v1';
const MAX_LOGS = 100;

type LogListener = (logs: ApiLogEntry[]) => void;
const listeners = new Set<LogListener>();

function loadLogsFromStorage(): ApiLogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Erro ao carregar logs do localStorage:', e);
  }
  return [];
}

function saveLogsToStorage(logs: ApiLogEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs.slice(0, MAX_LOGS)));
  } catch (e) {
    console.warn('Erro ao salvar logs no localStorage:', e);
  }
}

let currentLogs: ApiLogEntry[] = loadLogsFromStorage();

function notifyListeners() {
  listeners.forEach(cb => {
    try {
      cb([...currentLogs]);
    } catch (e) {
      console.warn('Erro ao notificar listener de log:', e);
    }
  });
}

export const apiLogger = {
  getLogs(): ApiLogEntry[] {
    return [...currentLogs];
  },

  subscribe(listener: LogListener): () => void {
    listeners.add(listener);
    listener([...currentLogs]);
    return () => {
      listeners.delete(listener);
    };
  },

  addLog(entry: Omit<ApiLogEntry, 'id' | 'timestamp' | 'date'> & { id?: string }): string {
    const now = new Date();
    const id = entry.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullEntry: ApiLogEntry = {
      ...entry,
      id,
      timestamp: now.toTimeString().slice(0, 8),
      date: now.toISOString().slice(0, 10)
    };

    currentLogs = [fullEntry, ...currentLogs.slice(0, MAX_LOGS - 1)];
    saveLogsToStorage(currentLogs);
    notifyListeners();
    return id;
  },

  updateLog(id: string, updates: Partial<ApiLogEntry>) {
    currentLogs = currentLogs.map(l => {
      if (l.id === id) {
        return { ...l, ...updates };
      }
      return l;
    });
    saveLogsToStorage(currentLogs);
    notifyListeners();
  },

  clearLogs() {
    currentLogs = [];
    saveLogsToStorage([]);
    notifyListeners();
  },

  exportAsMarkdown(spreadsheetId: string, userEmail?: string): string {
    const now = new Date().toLocaleString('pt-BR');
    let md = `# Relatório de Diagnóstico do Google Sheets\n\n`;
    md += `- **Gerado em:** ${now}\n`;
    md += `- **Planilha ID:** \`${spreadsheetId}\`\n`;
    md += `- **Usuário:** ${userEmail || 'Não identificado'}\n`;
    md += `- **Total de Logs Registrados:** ${currentLogs.length}\n\n`;
    md += `## Histórico Recente de Operações (Últimos ${Math.min(currentLogs.length, 30)})\n\n`;

    if (currentLogs.length === 0) {
      md += `*Nenhum log registrado ainda.*\n`;
      return md;
    }

    md += `| Hora | Tipo | Alvo | Status | Código HTTP | Mensagem | Erro |\n`;
    md += `|---|---|---|---|---|---|---|\n`;

    currentLogs.slice(0, 30).forEach(log => {
      const statusIcon = log.status === 'success' ? '✅ Sucesso' : log.status === 'error' ? '❌ Erro' : '⏳ Pendente';
      const cleanErr = log.error ? log.error.replace(/\|/g, '/') : '-';
      const cleanMsg = log.title ? log.title.replace(/\|/g, '/') : '-';
      md += `| ${log.timestamp} | ${log.type} | ${log.target} | ${statusIcon} | ${log.httpStatus || '-'} | ${cleanMsg} | ${cleanErr} |\n`;
    });

    return md;
  }
};
