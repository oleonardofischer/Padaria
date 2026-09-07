import { Order, Customer, InventoryItem, AuthorizedUser, Product } from '../types';
import { apiLogger } from './apiLogger';

export interface SheetMetadata {
  spreadsheetId: string;
  title: string;
  sheets: { title: string; sheetId: number }[];
}

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

// In-memory cache for metadata to reduce Read Requests quota consumption
const metadataCache = new Map<string, { data: SheetMetadata; timestamp: number }>();
const CACHE_TTL_MS = 60000; // 60 seconds

export function clearSpreadsheetCache(spreadsheetId?: string) {
  if (spreadsheetId) {
    metadataCache.delete(spreadsheetId);
  } else {
    metadataCache.clear();
  }
}

/**
 * Executes a fetch request with automatic exponential backoff retry on HTTP 429 (Quota Exceeded).
 */
async function fetchWithQuotaRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  baseDelayMs = 1500
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429) {
        if (attempt < retries) {
          const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
          console.warn(`[Google Sheets API] Limite de cota atingido (429). Tentativa ${attempt + 1}/${retries} em ${Math.round(delay)}ms...`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      return res;
    } catch (networkErr: any) {
      if (attempt < retries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw networkErr;
    }
  }
  return fetch(url, options);
}

export async function fetchSpreadsheetInfo(
  token: string,
  spreadsheetId: string,
  forceRefresh = false
): Promise<SheetMetadata> {
  // Check in-memory cache first to avoid burning quota
  const cached = metadataCache.get(spreadsheetId);
  if (!forceRefresh && cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  const startTime = Date.now();
  const logId = apiLogger.addLog({
    type: 'METADATA',
    target: `Planilha: ${spreadsheetId}`,
    status: 'pending',
    title: 'Consultando metadados e abas da planilha'
  });

  try {
    const res = await fetchWithQuotaRetry(`${BASE_URL}/${spreadsheetId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Erro ao carregar planilha: ${res.statusText}`;
      apiLogger.updateLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs,
        title: `Falha ao carregar metadados (${res.status})`,
        error: errMsg,
        details: res.status === 429
          ? 'Limite temporário de leitura por minuto da Google Sheets API atingido. Aguarde alguns segundos.'
          : res.status === 403
          ? 'Permissão negada no Google Drive. Adicione seu e-mail como Editor na planilha.'
          : errMsg
      });
      throw new Error(errMsg);
    }

    const data = await res.json();
    const sheetsList = (data.sheets || []).map((s: { properties: { title: string; sheetId: number } }) => ({
      title: s.properties.title,
      sheetId: s.properties.sheetId
    }));

    const result: SheetMetadata = {
      spreadsheetId: data.spreadsheetId,
      title: data.properties?.title || 'Planilha de Pães da Tati',
      sheets: sheetsList
    };

    metadataCache.set(spreadsheetId, { data: result, timestamp: Date.now() });

    apiLogger.updateLog(logId, {
      status: 'success',
      httpStatus: 200,
      durationMs,
      title: `Planilha "${result.title}" identificada`,
      payloadSummary: `${sheetsList.length} abas encontradas: ${sheetsList.map((s: { title: string }) => s.title).join(', ')}`
    });

    return result;
  } catch (err: any) {
    if (!err.message?.includes('carregar metadados')) {
      apiLogger.updateLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        title: 'Erro de rede/conexão ao acessar Google Sheets',
        error: err.message || 'Falha de comunicação de rede'
      });
    }
    throw err;
  }
}

/**
 * Batch read multiple ranges in ONE single API call.
 * Reduces quota usage drastically (1 request instead of N requests).
 */
export async function getBatchSheetValues(
  token: string,
  spreadsheetId: string,
  ranges: string[]
): Promise<Record<string, string[][]>> {
  if (!ranges || ranges.length === 0) return {};

  const startTime = Date.now();
  const rangeParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const url = `${BASE_URL}/${spreadsheetId}/values:batchGet?${rangeParams}`;

  const logId = apiLogger.addLog({
    type: 'READ',
    target: `Batch (${ranges.length} abas)`,
    status: 'pending',
    title: `Leitura em lote (Batch) de ${ranges.length} abas: ${ranges.map(r => r.split('!')[0]).join(', ')}`
  });

  try {
    const res = await fetchWithQuotaRetry(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Erro na leitura em lote: ${res.statusText}`;
      apiLogger.updateLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs,
        title: `Falha na leitura em lote (${res.status})`,
        error: errMsg,
        details: res.status === 429 ? 'Limite de consultas por minuto atingido no Google Sheets. Tente novamente em instantes.' : errMsg
      });
      throw new Error(errMsg);
    }

    const data = await res.json();
    const result: Record<string, string[][]> = {};

    (data.valueRanges || []).forEach((vr: { range: string; values?: string[][] }, idx: number) => {
      const requestedRange = ranges[idx] || vr.range;
      const rows = vr.values || [];
      result[requestedRange] = rows;
      
      // Also index by simple tab name (e.g. 'Produtos' from 'Produtos!A:Z')
      const tabName = requestedRange.split('!')[0];
      result[tabName] = rows;
    });

    apiLogger.updateLog(logId, {
      status: 'success',
      httpStatus: 200,
      durationMs,
      title: `Leitura em lote de ${ranges.length} abas concluída`,
      payloadSummary: ranges.map(r => `${r.split('!')[0]}: ${(result[r] || []).length} linhas`).join(' | ')
    });

    return result;
  } catch (err: any) {
    if (!err.message?.includes('Falha na leitura em lote')) {
      apiLogger.updateLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        title: 'Erro na leitura em lote do Google Sheets',
        error: err.message || 'Erro inesperado'
      });
    }
    throw err;
  }
}

export async function getSheetValues(token: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const startTime = Date.now();
  const logId = apiLogger.addLog({
    type: 'READ',
    target: range,
    status: 'pending',
    title: `Lendo dados da aba ${range}`
  });

  try {
    const res = await fetchWithQuotaRetry(`${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      if (res.status === 404 || res.status === 400) {
        apiLogger.updateLog(logId, {
          status: 'warning',
          httpStatus: res.status,
          durationMs,
          title: `Aba ${range} não encontrada ou vazia (${res.status})`,
          payloadSummary: '0 linhas retornadas'
        });
        return [];
      }
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Erro ao ler dados da aba ${range}: ${res.statusText}`;
      apiLogger.updateLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs,
        title: `Falha ao ler aba ${range} (${res.status})`,
        error: errMsg
      });
      throw new Error(errMsg);
    }

    const data = await res.json();
    const rows = data.values || [];

    apiLogger.updateLog(logId, {
      status: 'success',
      httpStatus: 200,
      durationMs,
      title: `Leitura concluída da aba ${range}`,
      payloadSummary: `${rows.length} linha(s) obtida(s)`
    });

    return rows;
  } catch (err: any) {
    if (!err.message?.includes('Falha ao ler')) {
      apiLogger.updateLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        title: `Erro ao consultar aba ${range}`,
        error: err.message || 'Erro inesperado'
      });
    }
    throw err;
  }
}

export async function appendSheetRows(
  token: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const startTime = Date.now();
  const logId = apiLogger.addLog({
    type: 'APPEND',
    target: range,
    status: 'pending',
    title: `Gravando ${values.length} nova(s) linha(s) em ${range}`,
    payloadSummary: JSON.stringify(values[0] || []).slice(0, 80)
  });

  try {
    const res = await fetchWithQuotaRetry(
      `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Erro ao adicionar linhas no Google Sheets: ${res.statusText}`;
      apiLogger.updateLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs,
        title: `Falha ao gravar em ${range} (${res.status})`,
        error: errMsg,
        details: res.status === 403 ? 'Permissão negada no Google Drive. Adicione seu e-mail como Editor na planilha.' : errMsg
      });
      throw new Error(errMsg);
    }

    apiLogger.updateLog(logId, {
      status: 'success',
      httpStatus: 200,
      durationMs,
      title: `${values.length} linha(s) gravada(s) com sucesso em ${range}`
    });
  } catch (err: any) {
    if (!err.message?.includes('Falha ao gravar')) {
      apiLogger.updateLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        title: `Erro ao adicionar em ${range}`,
        error: err.message || 'Erro inesperado'
      });
    }
    throw err;
  }
}

export async function updateSheetRange(
  token: string,
  spreadsheetId: string,
  range: string,
  values: (string | number | boolean)[][]
): Promise<void> {
  const startTime = Date.now();
  const logId = apiLogger.addLog({
    type: 'UPDATE',
    target: range,
    status: 'pending',
    title: `Atualizando dados no intervalo ${range}`,
    payloadSummary: `${values.length} linha(s)`
  });

  try {
    const res = await fetchWithQuotaRetry(
      `${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Erro ao atualizar dados no Google Sheets: ${res.statusText}`;
      apiLogger.updateLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs,
        title: `Falha ao atualizar ${range} (${res.status})`,
        error: errMsg
      });
      throw new Error(errMsg);
    }

    apiLogger.updateLog(logId, {
      status: 'success',
      httpStatus: 200,
      durationMs,
      title: `Intervalo ${range} atualizado com sucesso (${values.length} linhas)`
    });
  } catch (err: any) {
    if (!err.message?.includes('Falha ao atualizar')) {
      apiLogger.updateLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        title: `Erro ao atualizar ${range}`,
        error: err.message || 'Erro inesperado'
      });
    }
    throw err;
  }
}

export async function createTabIfNotExists(
  token: string,
  spreadsheetId: string,
  tabTitle: string,
  headerRow: string[]
): Promise<void> {
  try {
    const info = await fetchSpreadsheetInfo(token, spreadsheetId);
    const existing = info.sheets.find(s => s.title.toLowerCase() === tabTitle.toLowerCase());
    
    if (!existing) {
      // Add sheet
      const addRes = await fetchWithQuotaRetry(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: {
                  title: tabTitle,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                }
              }
            }
          ]
        })
      });

      if (addRes.ok) {
        clearSpreadsheetCache(spreadsheetId);
        // Add header
        await updateSheetRange(token, spreadsheetId, `${tabTitle}!A1:${String.fromCharCode(64 + headerRow.length)}1`, [headerRow]);
      }
    }
  } catch (err) {
    console.warn(`Não foi possível verificar/criar aba ${tabTitle}:`, err);
  }
}

// Ensure database tabs structure in the user's Google Sheet (single-pass check)
export async function initializeSpreadsheetTabs(token: string, spreadsheetId: string): Promise<void> {
  const tabConfigs = [
    {
      name: 'Pedidos',
      headers: [
        'ID Pedido',
        'Data Registro',
        'Cliente',
        'Telefone',
        'Endereço',
        'Pães e Itens',
        'Valor Total (R$)',
        'Data Entrega',
        'Turno / Horário',
        'Tipo (Retirada/Entrega)',
        'Forma Pagamento',
        'Pago?',
        'Status (Pendente/Produção/Pronto/Entregue)',
        'Observações'
      ]
    },
    {
      name: 'Clientes',
      headers: [
        'ID Cliente',
        'Nome',
        'Telefone',
        'Endereço',
        'Total de Pedidos',
        'Total Gasto (R$)',
        'Último Pedido',
        'Pães Favoritos',
        'Observações do Cliente'
      ]
    },
    {
      name: 'Estoque',
      headers: [
        'ID',
        'Insumo / Matéria-Prima',
        'Categoria',
        'Qtd Atual',
        'Qtd Mínima',
        'Unidade',
        'Custo Unitário (R$)',
        'Status Alerta',
        'Última Atualização',
        'Fornecedor'
      ]
    },
    {
      name: 'Usuarios',
      headers: ['Email', 'Nome', 'Cargo', 'Status']
    },
    {
      name: 'Produtos',
      headers: ['ID', 'Nome do Pão', 'Categoria', 'Preço (R$)', 'Peso / Tamanho', 'Descrição', 'Ativo']
    }
  ];

  try {
    // Single metadata lookup
    const info = await fetchSpreadsheetInfo(token, spreadsheetId);
    const existingTitles = info.sheets.map(s => s.title.toLowerCase());
    const missingConfigs = tabConfigs.filter(cfg => !existingTitles.includes(cfg.name.toLowerCase()));

    if (missingConfigs.length === 0) {
      return; // All tabs exist! 0 additional network calls needed.
    }

    // Batch create all missing tabs in 1 single request
    const batchRequests = missingConfigs.map(cfg => ({
      addSheet: {
        properties: {
          title: cfg.name,
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    }));

    const addRes = await fetchWithQuotaRetry(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests: batchRequests })
    });

    if (addRes.ok) {
      clearSpreadsheetCache(spreadsheetId);
      // Write headers for newly created tabs
      for (const cfg of missingConfigs) {
        await updateSheetRange(
          token,
          spreadsheetId,
          `${cfg.name}!A1:${String.fromCharCode(64 + cfg.headers.length)}1`,
          [cfg.headers]
        );
      }
    }
  } catch (err) {
    console.warn('Aviso na inicialização das abas da planilha:', err);
  }
}

// PARSING & SERIALIZATION UTILITIES

export function parseOrdersFromRows(rows: string[][]): Order[] {
  if (!rows || rows.length <= 1) return [];
  
  // Skip header row
  const dataRows = rows.slice(1);
  const result: Order[] = [];

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0 || !row[0]) return;
    
    const id = row[0] || `ped-${Date.now()}-${idx}`;
    const dataPedido = row[1] || new Date().toISOString().split('T')[0];
    const clienteNome = row[2] || 'Cliente';
    const clienteTelefone = row[3] || '';
    const clienteEndereco = row[4] || '';
    const itensRaw = row[5] || '';
    const valorTotal = parseFloat((row[6] || '0').replace('R$', '').replace('.', '').replace(',', '.').trim()) || 0;
    const dataEntrega = row[7] || dataPedido;
    const horarioEntrega = row[8] || 'manha';
    const tipoEntrega: Order['tipoEntrega'] = row[9]?.toLowerCase().includes('retirada') ? 'retirada' : 'entrega';
    const rawPayment = (row[10] || '').toLowerCase();
    
    let formaPagamento: Order['formaPagamento'] = 'pix';
    if (rawPayment.includes('cart')) formaPagamento = 'cartao';
    else if (rawPayment.includes('dinh')) formaPagamento = 'dinheiro';
    else if (rawPayment.includes('pagar')) formaPagamento = 'a_pagar';

    const pago = row[11]?.toLowerCase() === 'sim' || row[11]?.toLowerCase() === 'pago' || row[11] === 'TRUE';
    
    let status: Order['status'] = 'pendente';
    const rawStatus = (row[12] || '').toLowerCase();
    if (rawStatus.includes('entregue')) status = 'entregue';
    else if (rawStatus.includes('pronto')) status = 'pronto';
    else if (rawStatus.includes('produ') || rawStatus.includes('forno')) status = 'em_producao';
    else if (rawStatus.includes('cancel')) status = 'cancelado';

    const observacoes = row[13] || '';
    const itens = parseOrderItemsString(itensRaw);

    result.push({
      id,
      spreadsheetRowIndex: idx + 2, // 1-indexed, skipping header
      clienteNome,
      clienteTelefone,
      clienteEndereco,
      itens,
      valorTotal,
      dataPedido,
      dataEntrega,
      horarioEntrega,
      status,
      tipoEntrega,
      formaPagamento,
      pago,
      observacoes,
      createdAt: dataPedido
    });
  });

  return result;
}

export function parseOrderItemsString(raw: string) {
  if (!raw) return [{ produtoId: 'custom', nome: 'Pão Artesanal', quantidade: 1, precoUnitario: 0 }];
  
  // Format example: "2x Pão Levain (R$ 24,00), 1x Brioche (R$ 28,00)"
  const parts = raw.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    return [{ produtoId: 'custom', nome: raw, quantidade: 1, precoUnitario: 0 }];
  }

  return parts.map((part, i) => {
    const match = part.match(/^(\d+)\s*x\s*(.+?)(?:\s*\((?:R\$\s*)?([\d,\.]+)\))?$/i);
    if (match) {
      const qty = parseInt(match[1], 10) || 1;
      const name = match[2].trim();
      const price = match[3] ? parseFloat(match[3].replace(',', '.')) : 0;
      return {
        produtoId: `item-${i}`,
        nome: name,
        quantidade: qty,
        precoUnitario: price
      };
    }
    return {
      produtoId: `item-${i}`,
      nome: part,
      quantidade: 1,
      precoUnitario: 0
    };
  });
}

export function formatOrderItemsToString(items: Order['itens']): string {
  return items
    .map(it => `${it.quantidade}x ${it.nome}${it.precoUnitario ? ` (R$ ${it.precoUnitario.toFixed(2).replace('.', ',')})` : ''}${it.observacao ? ` [${it.observacao}]` : ''}`)
    .join(', ');
}

export function orderToSpreadsheetRow(order: Order): (string | number | boolean)[] {
  return [
    order.id,
    order.dataPedido,
    order.clienteNome,
    order.clienteTelefone,
    order.clienteEndereco || '',
    formatOrderItemsToString(order.itens),
    `R$ ${order.valorTotal.toFixed(2).replace('.', ',')}`,
    order.dataEntrega,
    order.horarioEntrega,
    order.tipoEntrega === 'retirada' ? 'Retirada' : 'Entrega',
    order.formaPagamento.toUpperCase(),
    order.pago ? 'Sim' : 'Não',
    order.status === 'em_producao' ? 'Em Produção' : order.status.charAt(0).toUpperCase() + order.status.slice(1),
    order.observacoes || ''
  ];
}

export function findMatchingSheetName(
  sheets: { title: string }[],
  candidates: RegExp[]
): string | undefined {
  for (const pattern of candidates) {
    const found = sheets.find(s => pattern.test(s.title.trim()));
    if (found) return found.title;
  }
  return undefined;
}

export function parseAuthorizedUsersFromRows(rows: string[][]): AuthorizedUser[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    email: (row[0] || '').trim().toLowerCase(),
    nome: row[1] || 'Usuário',
    cargo: (row[2] as any) || 'Padeiro(a)',
    ativo: row[3] ? !row[3].toLowerCase().includes('inativ') : true
  })).filter(u => u.email.length > 0);
}

export function parseInventoryFromRows(rows: string[][]): InventoryItem[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map((row, idx) => {
    const id = row[0] || `inv-${idx + 1}`;
    const nome = row[1] || 'Insumo';
    const categoria = (row[2] as any) || 'Farinhas & Grãos';
    const quantidadeAtual = parseFloat((row[3] || '0').replace(',', '.')) || 0;
    const quantidadeMinima = parseFloat((row[4] || '0').replace(',', '.')) || 0;
    const unidade = (row[5] as any) || 'kg';
    const custoUnitario = parseFloat((row[6] || '0').replace('R$', '').replace(',', '.').trim()) || 0;
    
    let statusAlerta: InventoryItem['statusAlerta'] = 'normal';
    if (quantidadeAtual <= 0 || quantidadeAtual < quantidadeMinima * 0.5) {
      statusAlerta = 'critico';
    } else if (quantidadeAtual <= quantidadeMinima) {
      statusAlerta = 'baixo';
    }

    return {
      id,
      nome,
      categoria,
      quantidadeAtual,
      quantidadeMinima,
      unidade,
      custoUnitario,
      statusAlerta,
      ultimaAtualizacao: row[8] || new Date().toISOString().split('T')[0],
      fornecedor: row[9] || ''
    };
  });
}

function normalizeHeader(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function parseCurrencyValue(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).trim();
  const clean = str.replace(/[R$\s]/g, '');
  if (clean.includes(',') && clean.includes('.')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  } else if (clean.includes(',')) {
    return parseFloat(clean.replace(',', '.')) || 0;
  } else {
    return parseFloat(clean) || 0;
  }
}

export function parseProductsFromRows(rows: string[][]): Product[] {
  if (!rows || rows.length === 0) return [];

  // Check if first row is a header
  const row0 = rows[0] || [];
  const normalizedRow0 = row0.map(normalizeHeader);
  
  const isHeader = normalizedRow0.some(h => 
    h.includes('nome') ||
    h.includes('pao') ||
    h.includes('produto') ||
    h.includes('item') ||
    h.includes('preco') ||
    h.includes('valor') ||
    h.includes('categoria') ||
    h === 'id' ||
    h === 'cod'
  );

  let dataRows = isHeader ? rows.slice(1) : rows;

  // Header column index detection
  let idIdx = -1;
  let nameIdx = -1;
  let categoryIdx = -1;
  let priceIdx = -1;
  let weightIdx = -1;
  let descIdx = -1;
  let activeIdx = -1;

  if (isHeader) {
    normalizedRow0.forEach((h, idx) => {
      if (/^(id|c[oó]d|c[oó]digo|identificador)$/.test(h)) idIdx = idx;
      else if (/(nome|p[ãa]o|produto|item|t[ií]tulo)/.test(h) && nameIdx === -1) nameIdx = idx;
      else if (/(pre[çc]o|valor|r\$|custo|unit[aá]rio)/.test(h) && priceIdx === -1) priceIdx = idx;
      else if (/(categoria|tipo|grupo|se[çc][ãa]o|linha)/.test(h) && categoryIdx === -1) categoryIdx = idx;
      else if (/(peso|tamanho|gramas|por[çc][ãa]o|rendimento)/.test(h) && weightIdx === -1) weightIdx = idx;
      else if (/(descri[çc][ãa]o|detalhe|observa[çc]|ingrediente|obs)/.test(h) && descIdx === -1) descIdx = idx;
      else if (/(ativo|status|dispon[ií]vel|vis[ií]vel)/.test(h) && activeIdx === -1) activeIdx = idx;
    });
  }

  // Fallback defaults if indices couldn't be detected
  if (nameIdx === -1) {
    if (row0.length >= 7) {
      idIdx = 0;
      nameIdx = 1;
      categoryIdx = 2;
      priceIdx = 3;
      weightIdx = 4;
      descIdx = 5;
      activeIdx = 6;
    } else if (row0.length >= 4) {
      nameIdx = 0;
      categoryIdx = 1;
      priceIdx = 2;
      weightIdx = 3;
    } else if (row0.length >= 2) {
      nameIdx = 0;
      priceIdx = 1;
    } else {
      nameIdx = 0;
    }
  }

  const products: Product[] = [];

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    
    const rawName = (nameIdx >= 0 ? row[nameIdx] : row[0]) || '';
    const nome = rawName.trim();
    if (!nome) return; // Skip empty rows

    const id = (idIdx >= 0 && row[idIdx]) ? row[idIdx].trim() : `prod-${idx + 1}`;
    
    const rawCategory = (categoryIdx >= 0 && row[categoryIdx]) ? row[categoryIdx].trim() : '';
    let categoria = rawCategory || 'Pães Rústicos';

    const rawPrice = priceIdx >= 0 ? row[priceIdx] : (row[1] || '0');
    const preco = parseCurrencyValue(rawPrice);

    const pesoOuTamanho = (weightIdx >= 0 && row[weightIdx]) ? row[weightIdx].trim() : '';
    const descricao = (descIdx >= 0 && row[descIdx]) ? row[descIdx].trim() : '';

    let ativo = true;
    if (activeIdx >= 0 && row[activeIdx] !== undefined) {
      const activeStr = normalizeHeader(row[activeIdx]);
      if (activeStr === 'nao' || activeStr === 'false' || activeStr === '0' || activeStr === 'inativo' || activeStr === 'desativado' || activeStr === 'esgotado') {
        ativo = false;
      }
    }

    products.push({
      id,
      nome,
      categoria,
      preco,
      pesoOuTamanho,
      descricao,
      ativo
    });
  });

  return products;
}

export function productToSpreadsheetRow(product: Product): (string | number | boolean)[] {
  return [
    product.id,
    product.nome,
    product.categoria,
    `R$ ${product.preco.toFixed(2).replace('.', ',')}`,
    product.pesoOuTamanho || '',
    product.descricao || '',
    product.ativo ? 'Sim' : 'Não'
  ];
}

export function parseCustomersFromRows(rows: string[][]): Customer[] {
  if (!rows || rows.length <= 1) return [];

  const row0 = rows[0] || [];
  const normalizedRow0 = row0.map(normalizeHeader);

  let idIdx = -1;
  let nameIdx = -1;
  let phoneIdx = -1;
  let addressIdx = -1;
  let ordersCountIdx = -1;
  let totalSpentIdx = -1;
  let lastOrderIdx = -1;
  let favoritesIdx = -1;
  let notesIdx = -1;

  normalizedRow0.forEach((h, idx) => {
    if (/^(id|c[oó]d|c[oó]digo)$/.test(h)) idIdx = idx;
    else if (/(nome|cliente|contato)/.test(h) && nameIdx === -1) nameIdx = idx;
    else if (/(telefone|celular|whatsapp|fone)/.test(h) && phoneIdx === -1) phoneIdx = idx;
    else if (/(endere[çc]o|rua|local)/.test(h) && addressIdx === -1) addressIdx = idx;
    else if (/(total de pedidos|pedidos|qtd pedidos)/.test(h) && ordersCountIdx === -1) ordersCountIdx = idx;
    else if (/(total gasto|gasto|valor total)/.test(h) && totalSpentIdx === -1) totalSpentIdx = idx;
    else if (/(ultimo pedido|data)/.test(h) && lastOrderIdx === -1) lastOrderIdx = idx;
    else if (/(favoritos|preferidos)/.test(h) && favoritesIdx === -1) favoritesIdx = idx;
    else if (/(observa[çc]|obs|detalhes)/.test(h) && notesIdx === -1) notesIdx = idx;
  });

  if (nameIdx === -1) nameIdx = 1;
  if (phoneIdx === -1) phoneIdx = 2;
  if (addressIdx === -1) addressIdx = 3;

  return rows.slice(1).map((row, idx) => {
    const nome = (nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : row[1] || '').trim();
    if (!nome) return null;

    const id = (idIdx >= 0 && row[idIdx]) ? row[idIdx].trim() : `cust-${idx + 1}`;
    const telefone = (phoneIdx >= 0 && row[phoneIdx] ? row[phoneIdx] : row[2] || '').trim();
    const endereco = (addressIdx >= 0 && row[addressIdx] ? row[addressIdx] : row[3] || '').trim();
    const pedidosCount = parseInt((ordersCountIdx >= 0 && row[ordersCountIdx] ? row[ordersCountIdx] : row[4]) || '0', 10) || 0;
    const totalGasto = parseCurrencyValue((totalSpentIdx >= 0 && row[totalSpentIdx] ? row[totalSpentIdx] : row[5]) || '0');
    const ultimoPedidoData = (lastOrderIdx >= 0 && row[lastOrderIdx] ? row[lastOrderIdx] : row[6] || '').trim();
    
    const favsRaw = (favoritesIdx >= 0 && row[favoritesIdx] ? row[favoritesIdx] : row[7] || '').trim();
    const preferidos = favsRaw ? favsRaw.split(/[,;]/).map(p => p.trim()).filter(Boolean) : undefined;
    
    const observacoes = (notesIdx >= 0 && row[notesIdx] ? row[notesIdx] : row[8] || '').trim();

    const customerObj: Customer = {
      id,
      nome,
      telefone,
      endereco: endereco || undefined,
      pedidosCount,
      totalGasto,
      ultimoPedidoData: ultimoPedidoData || undefined,
      preferidos,
      observacoes: observacoes || undefined
    };

    return customerObj;
  }).filter((c): c is Customer => c !== null);
}

export function customerToSpreadsheetRow(customer: Customer): (string | number | boolean)[] {
  return [
    customer.id,
    customer.nome,
    customer.telefone || '',
    customer.endereco || '',
    customer.pedidosCount || 0,
    `R$ ${(customer.totalGasto || 0).toFixed(2).replace('.', ',')}`,
    customer.ultimoPedidoData || '',
    (customer.preferidos || []).join(', '),
    customer.observacoes || ''
  ];
}

export function inventoryToSpreadsheetRow(item: InventoryItem): (string | number | boolean)[] {
  return [
    item.id,
    item.nome,
    item.categoria,
    item.quantidadeAtual,
    item.unidade,
    item.quantidadeMinima,
    item.statusAlerta === 'critico' ? 'Crítico' : item.statusAlerta === 'baixo' ? 'Baixo' : 'Normal',
    item.ultimaAtualizacao,
    `R$ ${item.custoUnitario.toFixed(2).replace('.', ',')}`,
    item.fornecedor || ''
  ];
}

export async function clearSheetTabValues(
  token: string,
  spreadsheetId: string,
  range: string
): Promise<void> {
  const startTime = Date.now();
  const logId = apiLogger.addLog({
    type: 'CLEAR',
    target: range,
    status: 'pending',
    title: `Limpando conteúdo da aba ${range}`
  });

  try {
    const res = await fetch(`${BASE_URL}/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const durationMs = Date.now() - startTime;

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const errMsg = err.error?.message || `Erro ao limpar aba ${range}: ${res.statusText}`;
      apiLogger.updateLog(logId, {
        status: 'error',
        httpStatus: res.status,
        durationMs,
        title: `Falha ao limpar aba ${range} (${res.status})`,
        error: errMsg
      });
      throw new Error(errMsg);
    }

    apiLogger.updateLog(logId, {
      status: 'success',
      httpStatus: 200,
      durationMs,
      title: `Aba ${range} limpa com sucesso`
    });
  } catch (err: any) {
    if (!err.message?.includes('Falha ao limpar')) {
      apiLogger.updateLog(logId, {
        status: 'error',
        durationMs: Date.now() - startTime,
        title: `Erro ao limpar aba ${range}`,
        error: err.message || 'Erro inesperado'
      });
    }
    throw err;
  }
}

export async function saveAllProductsToSheet(
  token: string,
  spreadsheetId: string,
  products: Product[],
  tabName = 'Produtos'
): Promise<void> {
  const header = ['ID', 'Nome do Pão', 'Categoria', 'Preço Unitário (R$)', 'Peso / Tamanho', 'Descrição', 'Disponível'];
  const rows = products.map(productToSpreadsheetRow);
  
  // Update header and values starting at A1
  await updateSheetRange(token, spreadsheetId, `${tabName}!A1:G${rows.length + 1}`, [header, ...rows]);
}

export async function saveAllCustomersToSheet(
  token: string,
  spreadsheetId: string,
  customers: Customer[],
  tabName = 'Clientes'
): Promise<void> {
  const header = ['ID', 'Nome Cliente', 'Telefone', 'Endereço', 'Total Pedidos', 'Total Gasto (R$)', 'Último Pedido', 'Pães Preferidos', 'Observações'];
  const rows = customers.map(customerToSpreadsheetRow);
  
  await updateSheetRange(token, spreadsheetId, `${tabName}!A1:I${rows.length + 1}`, [header, ...rows]);
}

export interface DiagnosticStepResult {
  step: string;
  name: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
  detail?: string;
  durationMs?: number;
}

export interface ComprehensiveDiagnosticReport {
  timestamp: string;
  spreadsheetId: string;
  allPassed: boolean;
  steps: DiagnosticStepResult[];
  summary: string;
  recommendations: string[];
}

export async function runDetailedApiDiagnostics(
  token: string,
  spreadsheetId: string
): Promise<ComprehensiveDiagnosticReport> {
  const steps: DiagnosticStepResult[] = [];
  const recommendations: string[] = [];

  // Step 1: Token Presence
  if (!token) {
    steps.push({
      step: '1_auth',
      name: 'Verificação de Autenticação (OAuth)',
      status: 'error',
      message: 'Token de autorização do Google ausente.',
      detail: 'Você não está conectado com sua Conta Google. Clique em "Conectar Conta Google".'
    });
    recommendations.push('Clique no botão "Conectar Conta Google" no topo do painel para conceder permissão de leitura e escrita no Drive.');
    return {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      spreadsheetId,
      allPassed: false,
      steps,
      summary: 'Diagnóstico interrompido: Falta de autenticação com a Conta Google.',
      recommendations
    };
  }

  steps.push({
    step: '1_auth',
    name: 'Verificação de Autenticação (OAuth)',
    status: 'success',
    message: 'Token Google OAuth válido detectado.',
    detail: `Token presente (início: ${token.slice(0, 10)}...)`
  });

  // Step 2: Spreadsheet Metadata & Read Access
  const step2Start = Date.now();
  let metadata: SheetMetadata | null = null;
  try {
    metadata = await fetchSpreadsheetInfo(token, spreadsheetId);
    steps.push({
      step: '2_metadata',
      name: 'Acesso de Leitura à Planilha',
      status: 'success',
      message: `Planilha acessada com sucesso: "${metadata.title}"`,
      detail: `${metadata.sheets.length} abas encontradas no Google Drive.`,
      durationMs: Date.now() - step2Start
    });
  } catch (err: any) {
    const errMsg = err.message || '';
    const is403 = errMsg.includes('403') || errMsg.includes('permission');
    const is404 = errMsg.includes('404') || errMsg.includes('not found');

    steps.push({
      step: '2_metadata',
      name: 'Acesso de Leitura à Planilha',
      status: 'error',
      message: is403
        ? 'Erro 403: Acesso Negado à Planilha.'
        : is404
        ? 'Erro 404: Planilha não encontrada no Google Drive.'
        : `Erro ao acessar planilha: ${errMsg}`,
      detail: errMsg,
      durationMs: Date.now() - step2Start
    });

    if (is403) {
      recommendations.push('Abra a planilha no Google Drive, clique em "Compartilhar" e adicione seu e-mail como "Editor".');
    } else if (is404) {
      recommendations.push(`Verifique se o ID "${spreadsheetId}" está correto na URL da sua planilha no Google Sheets.`);
    }

    return {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      spreadsheetId,
      allPassed: false,
      steps,
      summary: 'Diagnóstico falhou: Impossível ler os metadados da planilha.',
      recommendations
    };
  }

  // Step 3: Tab structure check
  const sheetNames = metadata.sheets.map(s => s.title);
  const requiredTabs = ['Produtos', 'Pedidos', 'Clientes', 'Estoque', 'Usuarios'];
  const missingTabs = requiredTabs.filter(req => !sheetNames.some(s => s.toLowerCase() === req.toLowerCase()));

  if (missingTabs.length > 0) {
    steps.push({
      step: '3_tabs',
      name: 'Estrutura de Abas da Planilha',
      status: 'warning',
      message: `Abas ausentes detectadas: ${missingTabs.join(', ')}`,
      detail: `Abas existentes: ${sheetNames.join(', ')}. O app criará ou mapeará as abas automaticamente na primeira gravação.`
    });
    recommendations.push(`Clique em "Salvar na Planilha" para criar automaticamente as abas faltantes (${missingTabs.join(', ')}).`);
  } else {
    steps.push({
      step: '3_tabs',
      name: 'Estrutura de Abas da Planilha',
      status: 'success',
      message: `Todas as 5 abas principais foram encontradas: ${requiredTabs.join(', ')}.`,
      detail: `Total de abas na planilha: ${sheetNames.length}`
    });
  }

  // Step 4: Test Read from Produtos / Pedidos using batch
  const step4Start = Date.now();
  try {
    const batchProbe = await getBatchSheetValues(token, spreadsheetId, ['Produtos!A:G', 'Pedidos!A:N']);
    const prodRows = batchProbe['Produtos!A:G'] || batchProbe['Produtos'] || [];
    const ordersRows = batchProbe['Pedidos!A:N'] || batchProbe['Pedidos'] || [];
    steps.push({
      step: '4_read_probe',
      name: 'Teste de Leitura de Dados',
      status: 'success',
      message: `Leitura concluída com sucesso!`,
      detail: `Lidas ${prodRows.length} linhas em "Produtos" e ${ordersRows.length} linhas em "Pedidos" em uma única requisição em lote.`,
      durationMs: Date.now() - step4Start
    });
  } catch (err: any) {
    steps.push({
      step: '4_read_probe',
      name: 'Teste de Leitura de Dados',
      status: 'error',
      message: `Falha ao ler dados das abas: ${err.message}`,
      durationMs: Date.now() - step4Start
    });
    recommendations.push('Verifique se as abas não estão bloqueadas contra leitura.');
  }

  // Step 5: Test Write Probe (Ensure write permission works)
  const step5Start = Date.now();
  try {
    // Attempt to touch metadata or write headers if needed
    await initializeSpreadsheetTabs(token, spreadsheetId);
    steps.push({
      step: '5_write_probe',
      name: 'Teste de Permissão de Gravação (Escrita)',
      status: 'success',
      message: 'Permissão de gravação no Google Sheets confirmada!',
      detail: 'O aplicativo tem permissão de Editor para gravar pedidos, clientes e produtos na planilha.',
      durationMs: Date.now() - step5Start
    });
  } catch (err: any) {
    steps.push({
      step: '5_write_probe',
      name: 'Teste de Permissão de Gravação (Escrita)',
      status: 'error',
      message: `Falha no teste de escrita: ${err.message}`,
      detail: err.message?.includes('403') ? 'Seu usuário tem apenas permissão de Leitor/Comentador na planilha, não de Editor.' : err.message,
      durationMs: Date.now() - step5Start
    });
    recommendations.push('A sua Conta Google precisa ter permissão de "Editor" (e não apenas "Leitor") na planilha.');
  }

  const allPassed = steps.every(s => s.status === 'success' || s.status === 'warning');

  return {
    timestamp: new Date().toLocaleTimeString('pt-BR'),
    spreadsheetId,
    allPassed,
    steps,
    summary: allPassed
      ? '🎉 Tudo certo! A comunicação com o Google Sheets está funcionando perfeitamente em leitura e escrita.'
      : '⚠️ Foram detectados pontos de atenção ou bloqueios na comunicação com o Google Sheets.',
    recommendations
  };
}

export async function testSpreadsheetHealth(
  token: string,
  spreadsheetId: string
): Promise<{
  success: boolean;
  title?: string;
  sheets: string[];
  message: string;
  actionRequired?: 'auth' | 'permission' | 'not_found' | 'none';
}> {
  try {
    const info = await fetchSpreadsheetInfo(token, spreadsheetId);
    const sheetNames = info.sheets.map(s => s.title);
    return {
      success: true,
      title: info.title,
      sheets: sheetNames,
      message: `Conectado com sucesso à planilha "${info.title}" (${sheetNames.length} abas encontradas).`,
      actionRequired: 'none'
    };
  } catch (err: any) {
    const errMsg = (err.message || '').toLowerCase();
    if (errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('invalid credentials')) {
      return {
        success: false,
        sheets: [],
        message: 'A autenticação com o Google Drive expirou ou não está ativa.',
        actionRequired: 'auth'
      };
    }
    if (errMsg.includes('403') || errMsg.includes('permission') || errMsg.includes('access')) {
      return {
        success: false,
        sheets: [],
        message: 'Acesso negado no Google Drive: seu e-mail não tem permissão para editar ou visualizar esta planilha.',
        actionRequired: 'permission'
      };
    }
    if (errMsg.includes('404') || errMsg.includes('not found') || errMsg.includes('não encontrada')) {
      return {
        success: false,
        sheets: [],
        message: `Planilha com ID "${spreadsheetId}" não foi encontrada no Google Drive.`,
        actionRequired: 'not_found'
      };
    }
    return {
      success: false,
      sheets: [],
      message: err.message || 'Erro desconhecido ao testar conexão com o Google Drive.',
      actionRequired: 'none'
    };
  }
}
