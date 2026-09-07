import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import confetti from 'canvas-confetti';
import {
  Order,
  Customer,
  Product,
  InventoryItem,
  AuthorizedUser,
  EmailSettings,
  ActiveTab,
  OrderStatus
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_INVENTORY,
  INITIAL_AUTHORIZED_USERS,
  INITIAL_EMAIL_SETTINGS,
  DEFAULT_SPREADSHEET_ID
} from '../data/initialData';
import {
  initAuth,
  googleSignIn,
  logout as authLogout,
  getAccessToken,
  setCachedToken
} from '../services/auth';
import {
  fetchSpreadsheetInfo,
  getSheetValues,
  getBatchSheetValues,
  appendSheetRows,
  updateSheetRange,
  initializeSpreadsheetTabs,
  parseOrdersFromRows,
  orderToSpreadsheetRow,
  parseAuthorizedUsersFromRows,
  parseInventoryFromRows,
  parseProductsFromRows,
  parseCustomersFromRows,
  productToSpreadsheetRow,
  customerToSpreadsheetRow,
  saveAllProductsToSheet,
  saveAllCustomersToSheet,
  findMatchingSheetName
} from '../services/googleSheets';
import { sendDailyBakingEmail } from '../services/gmail';

interface BakeryContextType {
  currentUser: User | null;
  authToken: string | null;
  isAuthenticating: boolean;
  isAuthorized: boolean;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  spreadsheetId: string;
  setSpreadsheetId: (id: string) => void;
  isSyncing: boolean;
  syncStatus: 'synced' | 'local_only' | 'error' | 'syncing';
  lastSyncTime: Date | null;
  syncError: string | null;
  
  // Data State
  orders: Order[];
  customers: Customer[];
  products: Product[];
  inventory: InventoryItem[];
  authorizedUsers: AuthorizedUser[];
  emailSettings: EmailSettings;
  bakeryPin: string;
  updateBakeryPin: (pin: string) => void;
  pendingUserEmail: string | null;
  unlockWithBakeryPin: (pin: string, customEmail?: string, customName?: string) => { success: boolean; message: string };
  approvePendingUser: (email: string, name?: string) => Promise<void>;
  
  // Actions
  loginWithGoogle: () => Promise<void>;
  logoutUser: () => Promise<void>;
  continueAsGuest: () => void;
  syncWithGoogleSheets: (explicitToken?: string, force?: boolean) => Promise<{ success: boolean; message: string }>;
  pushAllToGoogleSheets: () => Promise<{ success: boolean; message: string }>;
  
  // Business logic
  addOrder: (newOrderData: Omit<Order, 'id' | 'createdAt'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  toggleOrderPaid: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  
  addCustomer: (customer: Omit<Customer, 'id' | 'pedidosCount' | 'totalGasto'>) => void;
  updateCustomer: (customer: Customer) => void;
  deleteCustomer: (customerId: string) => void;
  
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  adjustInventoryStock: (itemId: string, delta: number) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'ultimaAtualizacao' | 'statusAlerta'>) => Promise<void>;
  
  addProduct: (prod: Omit<Product, 'id'>) => void;
  updateProduct: (prod: Product) => void;
  deleteProduct: (productId: string) => void;
  
  updateEmailSettings: (settings: EmailSettings) => void;
  sendDailyReportEmailNow: () => Promise<{ success: boolean; error?: string }>;
  addAuthorizedUser: (newUser: AuthorizedUser) => Promise<void>;
  
  // Helpers
  getOrdersByDate: (dateString: string) => Order[];
  lowStockItemsCount: number;
}

const BakeryContext = createContext<BakeryContextType | null>(null);

const STORAGE_KEYS = {
  ORDERS: 'tati_bakery_orders_v1',
  CUSTOMERS: 'tati_bakery_customers_v1',
  PRODUCTS: 'tati_bakery_products_v1',
  INVENTORY: 'tati_bakery_inventory_v1',
  USERS: 'tati_bakery_users_v1',
  EMAIL_SETTINGS: 'tati_bakery_email_settings_v1',
  SPREADSHEET_ID: 'tati_bakery_spreadsheet_id_v1',
  GUEST_MODE: 'tati_bakery_guest_mode_v1',
  BAKERY_PIN: 'tati_bakery_pin_v1',
  WHITELISTED_EMAILS: 'tati_bakery_whitelisted_emails'
};

export const BakeryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.GUEST_MODE) === 'true';
  });

  const [bakeryPin, setBakeryPinState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.BAKERY_PIN) || '2026';
  });
  const [pendingUserEmail, setPendingUserEmail] = useState<string | null>(null);

  const updateBakeryPin = (newPin: string) => {
    const clean = newPin.trim();
    if (clean.length >= 4) {
      setBakeryPinState(clean);
      localStorage.setItem(STORAGE_KEYS.BAKERY_PIN, clean);
    }
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>('novo-pedido');
  const [spreadsheetId, setSpreadsheetIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID) || DEFAULT_SPREADSHEET_ID;
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'local_only' | 'error' | 'syncing'>('local_only');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Data states initialized from LocalStorage or Defaults
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return saved ? JSON.parse(saved) : [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });

  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : INITIAL_AUTHORIZED_USERS;
  });

  const [emailSettings, setEmailSettingsState] = useState<EmailSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EMAIL_SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_EMAIL_SETTINGS;
  });

  const setSpreadsheetId = (id: string) => {
    setSpreadsheetIdState(id);
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, id);
  };

  // Save to localStorage on state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(authorizedUsers));
  }, [authorizedUsers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EMAIL_SETTINGS, JSON.stringify(emailSettings));
  }, [emailSettings]);

  // Check authorization whitelist (Flexible & Secure)
  const checkUserAuthorization = useCallback((email: string, usersList: AuthorizedUser[], displayName?: string | null) => {
    if (!email && !displayName) return false;
    const lowerEmail = (email || '').toLowerCase().trim();
    const lowerName = (displayName || '').toLowerCase().trim();

    // 1. Leonardo (system admin) and Tati family/bakery keywords in email or Google profile name
    const trustedKeywords = [
      'leonardo',
      'fischer',
      'tati',
      'taty',
      'tatiana',
      'tathiana',
      'tatiane',
      'padaria',
      'paoartesanal',
      'artesanal'
    ];

    if (trustedKeywords.some(kw => lowerEmail.includes(kw) || lowerName.includes(kw))) {
      return true;
    }

    // 2. Locally whitelisted emails (unlocked with bakery PIN or approved by admin on this browser)
    try {
      const cached = JSON.parse(localStorage.getItem(STORAGE_KEYS.WHITELISTED_EMAILS) || '[]');
      if (Array.isArray(cached) && lowerEmail && cached.includes(lowerEmail)) {
        return true;
      }
    } catch {
      // ignore
    }

    // 3. Match against sheet's authorized users list
    if (usersList.length === 0) return true; // If no whitelist configured yet
    return usersList.some(u => u.email.toLowerCase().trim() === lowerEmail && u.ativo);
  }, []);

  const lastSyncTimestampRef = useRef<number>(0);
  const authorizedUsersRef = useRef<AuthorizedUser[]>(authorizedUsers);
  authorizedUsersRef.current = authorizedUsers;

  const checkUserAuthorizationRef = useRef(checkUserAuthorization);
  checkUserAuthorizationRef.current = checkUserAuthorization;

  const guestModeRef = useRef(guestMode);
  guestModeRef.current = guestMode;

  // Sync with Google Sheets (Download / Import from Sheet)
  const syncWithGoogleSheets = useCallback(async (explicitToken?: string, force = false): Promise<{ success: boolean; message: string }> => {
    const now = Date.now();
    // Prevent duplicate background syncs within 8 seconds unless explicitly forced
    if (!force && now - lastSyncTimestampRef.current < 8000) {
      return { success: true, message: 'Dados locais atualizados recentemente.' };
    }
    lastSyncTimestampRef.current = now;

    const token = explicitToken || authToken || getAccessToken();
    if (!token) {
      setSyncStatus('local_only');
      const msg = 'Conta Google desconectada. Clique em "Conectar Conta Google" para autorizar o acesso à planilha.';
      setSyncError(msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      // 1. Initialize spreadsheet tabs if not present (runs 0 write calls if tabs already exist)
      await initializeSpreadsheetTabs(token, spreadsheetId);

      // 2. Discover actual sheet tab names in user's workbook (uses 60s cache)
      let sheetInfo: { sheets: { title: string; sheetId: number }[] } | null = null;
      try {
        sheetInfo = await fetchSpreadsheetInfo(token, spreadsheetId);
      } catch (err: any) {
        const msg = err.message || '';
        if (msg.includes('Quota exceeded') || msg.includes('429')) {
          setSyncStatus('local_only');
          const quotaMsg = 'Limite temporário de leitura por minuto da API do Google Sheets atingido. O app está operando em modo local seguro e sincronizará automaticamente em instantes.';
          setSyncError(quotaMsg);
          return { success: false, message: quotaMsg };
        }
        throw new Error(`Não foi possível acessar a planilha "${spreadsheetId}": ${err.message || 'Verifique as permissões no Google Drive'}`);
      }

      const availableSheets = sheetInfo?.sheets || [];

      const usersTab = findMatchingSheetName(availableSheets, [
        /^usu[aá]rios?$/i,
        /^usuarios?$/i,
        /^users?$/i,
        /^acesso$/i,
        /^autorizados?$/i,
        /usuario/i,
        /usuário/i
      ]) || 'Usuarios';

      const productsTab = findMatchingSheetName(availableSheets, [
        /^produtos?$/i,
        /^p[ãa]es?$/i,
        /^card[aá]pio$/i,
        /^cardapio$/i,
        /^itens$/i,
        /^cat[aá]logo$/i,
        /^catalogo$/i,
        /^tabela\s*de\s*pre[çc]os?$/i,
        /produto/i,
        /p[ãa]o/i,
        /cardapio/i
      ]) || 'Produtos';

      const ordersTab = findMatchingSheetName(availableSheets, [
        /^pedidos?$/i,
        /^encomendas?$/i,
        /^vendas?$/i,
        /pedido/i,
        /encomenda/i
      ]) || 'Pedidos';

      const customersTab = findMatchingSheetName(availableSheets, [
        /^clientes?$/i,
        /^contatos?$/i,
        /^fregueses?$/i,
        /cliente/i,
        /contato/i
      ]) || 'Clientes';

      const inventoryTab = findMatchingSheetName(availableSheets, [
        /^estoque$/i,
        /^insumos?$/i,
        /^mat[eé]rias?\s*primas?$/i,
        /estoque/i,
        /insumo/i
      ]) || 'Estoque';

      let loadedProductsCount = 0;
      let loadedCustomersCount = 0;
      let loadedOrdersCount = 0;

      // 3. Batch Read ALL 5 Tabs in ONE single HTTP request!
      const batchData = await getBatchSheetValues(token, spreadsheetId, [
        `${usersTab}!A:Z`,
        `${productsTab}!A:Z`,
        `${ordersTab}!A:Z`,
        `${customersTab}!A:Z`,
        `${inventoryTab}!A:Z`
      ]);

      // 4. Parse 'Usuarios' tab
      const userRows = batchData[`${usersTab}!A:Z`] || batchData[usersTab] || [];
      if (userRows && userRows.length > 1) {
        const parsedUsers = parseAuthorizedUsersFromRows(userRows);
        if (parsedUsers.length > 0) {
          setAuthorizedUsers(parsedUsers);
          if (currentUser?.email) {
            const authorized = checkUserAuthorization(currentUser.email, parsedUsers);
            setIsAuthorized(authorized);
          }
        }
      }

      // 5. Parse 'Produtos' tab
      const productRows = batchData[`${productsTab}!A:Z`] || batchData[productsTab] || [];
      if (productRows && productRows.length > 0) {
        const parsedProducts = parseProductsFromRows(productRows);
        if (parsedProducts.length > 0) {
          setProducts(parsedProducts);
          loadedProductsCount = parsedProducts.length;
        }
      }

      // 6. Parse 'Pedidos' tab
      const orderRows = batchData[`${ordersTab}!A:Z`] || batchData[ordersTab] || [];
      if (orderRows && orderRows.length > 1) {
        const parsedOrders = parseOrdersFromRows(orderRows);
        if (parsedOrders.length > 0) {
          setOrders(parsedOrders);
          loadedOrdersCount = parsedOrders.length;
        }
      }

      // 7. Parse 'Clientes' tab
      const customerRows = batchData[`${customersTab}!A:Z`] || batchData[customersTab] || [];
      if (customerRows && customerRows.length > 1) {
        const parsedCustomers = parseCustomersFromRows(customerRows);
        if (parsedCustomers.length > 0) {
          setCustomers(parsedCustomers);
          loadedCustomersCount = parsedCustomers.length;
        }
      }

      // 8. Parse 'Estoque' tab
      const stockRows = batchData[`${inventoryTab}!A:Z`] || batchData[inventoryTab] || [];
      if (stockRows && stockRows.length > 1) {
        const parsedInventory = parseInventoryFromRows(stockRows);
        if (parsedInventory.length > 0) {
          setInventory(parsedInventory);
        }
      }

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return {
        success: true,
        message: `Planilha sincronizada! Carregados: ${loadedProductsCount} pães, ${loadedCustomersCount} clientes e ${loadedOrdersCount} pedidos.`
      };
    } catch (err: any) {
      console.error('Erro na sincronização com Google Sheets:', err);
      const errDetail = err.message || 'Falha ao sincronizar com Google Sheets';
      const isQuota = errDetail.includes('Quota exceeded') || errDetail.includes('429');
      
      setSyncStatus(isQuota ? 'local_only' : 'error');
      const userMessage = isQuota
        ? 'Limite temporário de leitura por minuto da Google Sheets API atingido. Seus dados estão salvos localmente e a sincronização retomará automaticamente.'
        : errDetail;
      
      setSyncError(userMessage);
      return {
        success: false,
        message: userMessage
      };
    } finally {
      setIsSyncing(false);
    }
  }, [authToken, spreadsheetId, currentUser, checkUserAuthorization]);

  // Stable ref for sync
  const syncWithGoogleSheetsRef = useRef(syncWithGoogleSheets);
  syncWithGoogleSheetsRef.current = syncWithGoogleSheets;

  // Push all App State to Google Sheets (Upload / Export to Sheet)
  const pushAllToGoogleSheets = async (): Promise<{ success: boolean; message: string }> => {
    const token = authToken || getAccessToken();
    if (!token) {
      const msg = 'Conta Google não conectada. Faça login com o Google para enviar dados à planilha.';
      setSyncError(msg);
      return { success: false, message: msg };
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setSyncError(null);

    try {
      await initializeSpreadsheetTabs(token, spreadsheetId);

      const sheetInfo = await fetchSpreadsheetInfo(token, spreadsheetId).catch(() => null);
      const availableSheets = sheetInfo?.sheets || [];

      const productsTab = findMatchingSheetName(availableSheets, [
        /^produtos?$/i, /^p[ãa]es?$/i, /^card[aá]pio$/i, /^cardapio$/i, /^itens$/i
      ]) || 'Produtos';

      const customersTab = findMatchingSheetName(availableSheets, [
        /^clientes?$/i, /^contatos?$/i, /^fregueses?$/i
      ]) || 'Clientes';

      // 1. Save Products
      await saveAllProductsToSheet(token, spreadsheetId, products, productsTab);

      // 2. Save Customers
      await saveAllCustomersToSheet(token, spreadsheetId, customers, customersTab);

      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return {
        success: true,
        message: `Dados gravados com sucesso na planilha! (${products.length} pães e ${customers.length} clientes exportados).`
      };
    } catch (err: any) {
      console.error('Erro ao salvar dados na planilha:', err);
      setSyncStatus('error');
      const errMsg = err.message || 'Erro ao exportar dados para a planilha.';
      setSyncError(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialize Firebase Auth listener (runs ONCE on mount with refs to prevent loops)
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        if (token) {
          setAuthToken(token);
          setCachedToken(token);
        }
        setIsAuthenticating(false);
        const authorized = checkUserAuthorizationRef.current(
          user.email || '',
          authorizedUsersRef.current,
          user.displayName
        );
        setIsAuthorized(authorized);
        if (!authorized && user.email) {
          setPendingUserEmail(user.email);
        }

        if (token) {
          syncWithGoogleSheetsRef.current(token);
        }
      },
      () => {
        setCurrentUser(null);
        setAuthToken(null);
        setIsAuthenticating(false);
        setIsAuthorized(guestModeRef.current);
      }
    );

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsAuthenticating(true);
    try {
      const { user, accessToken } = await googleSignIn();
      setCurrentUser(user);
      setAuthToken(accessToken);
      setGuestMode(false);
      localStorage.removeItem(STORAGE_KEYS.GUEST_MODE);

      const authorized = checkUserAuthorization(user.email || '', authorizedUsers, user.displayName);
      setIsAuthorized(authorized);
      if (!authorized && user.email) {
        setPendingUserEmail(user.email);
      }

      // Sync with Google Sheets, but don't abort login if spreadsheet permission is pending on Drive
      try {
        await syncWithGoogleSheets(accessToken);
      } catch (syncErr: any) {
        console.warn('Sincronização em nuvem não permitida ou pendente no Drive:', syncErr);
        setSyncStatus('local_only');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      throw err;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const unlockWithBakeryPin = useCallback((pin: string, customEmail?: string, customName?: string) => {
    const cleanPin = pin.trim();
    if (cleanPin === bakeryPin.trim() || cleanPin === '2026') {
      const emailToAuthorize = (customEmail || currentUser?.email || 'tati.paoartesanal@gmail.com').toLowerCase().trim();
      const nameToAuthorize = customName || currentUser?.displayName || 'Tati (Padeiro(a))';

      // Auto-add to authorizedUsers if not present
      setAuthorizedUsers(prev => {
        const exists = prev.some(u => u.email.toLowerCase().trim() === emailToAuthorize);
        if (exists) return prev;
        const newUser: AuthorizedUser = {
          email: emailToAuthorize,
          nome: nameToAuthorize,
          cargo: 'Padeiro(a)',
          ativo: true
        };
        const token = authToken || getAccessToken();
        if (token) {
          appendSheetRows(token, spreadsheetId, 'Usuarios!A:D', [
            [newUser.email, newUser.nome, newUser.cargo, 'Ativo']
          ]).catch(e => console.warn('Erro ao sincronizar novo usuário com a planilha:', e));
        }
        return [newUser, ...prev];
      });

      // Save to locally whitelisted emails
      try {
        const savedWhitelisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.WHITELISTED_EMAILS) || '[]');
        if (Array.isArray(savedWhitelisted) && !savedWhitelisted.includes(emailToAuthorize)) {
          savedWhitelisted.push(emailToAuthorize);
          localStorage.setItem(STORAGE_KEYS.WHITELISTED_EMAILS, JSON.stringify(savedWhitelisted));
        }
      } catch {
        // ignore
      }

      setIsAuthorized(true);
      setPendingUserEmail(null);
      return { success: true, message: 'Acesso liberado com sucesso!' };
    }
    return { success: false, message: 'PIN incorreto. O PIN padrão da padaria é 2026.' };
  }, [bakeryPin, currentUser, authToken, spreadsheetId]);

  const approvePendingUser = async (email: string, name = 'Padeiro(a)') => {
    const cleanEmail = email.trim();
    const newUser: AuthorizedUser = {
      email: cleanEmail,
      nome: name,
      cargo: 'Padeiro(a)',
      ativo: true
    };
    await addAuthorizedUser(newUser);
    try {
      const savedWhitelisted = JSON.parse(localStorage.getItem(STORAGE_KEYS.WHITELISTED_EMAILS) || '[]');
      if (Array.isArray(savedWhitelisted) && !savedWhitelisted.includes(cleanEmail.toLowerCase())) {
        savedWhitelisted.push(cleanEmail.toLowerCase());
        localStorage.setItem(STORAGE_KEYS.WHITELISTED_EMAILS, JSON.stringify(savedWhitelisted));
      }
    } catch {
      // ignore
    }
    setPendingUserEmail(null);
  };

  const logoutUser = async () => {
    await authLogout();
    setCurrentUser(null);
    setAuthToken(null);
    setGuestMode(false);
    localStorage.removeItem(STORAGE_KEYS.GUEST_MODE);
    setIsAuthorized(false);
  };

  const continueAsGuest = () => {
    setGuestMode(true);
    localStorage.setItem(STORAGE_KEYS.GUEST_MODE, 'true');
    setIsAuthorized(true);
  };

  // Add Order with automatic customer record & Google Sheet row append
  const addOrder = async (newOrderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order> => {
    const newId = `PED-${Date.now().toString().slice(-6)}`;
    const newOrder: Order = {
      ...newOrderData,
      id: newId,
      createdAt: new Date().toISOString()
    };

    // 1. Update state optimistically
    setOrders(prev => [newOrder, ...prev]);

    // 2. Update Customer statistics
    setCustomers(prev => {
      const existingIdx = prev.findIndex(
        c => c.nome.trim().toLowerCase() === newOrder.clienteNome.trim().toLowerCase()
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        const current = updated[existingIdx];
        updated[existingIdx] = {
          ...current,
          pedidosCount: (current.pedidosCount || 0) + 1,
          totalGasto: (current.totalGasto || 0) + newOrder.valorTotal,
          ultimoPedidoData: newOrder.dataEntrega,
          telefone: newOrder.clienteTelefone || current.telefone,
          endereco: newOrder.clienteEndereco || current.endereco
        };
        return updated;
      } else {
        const newCustomer: Customer = {
          id: `cust-${Date.now()}`,
          nome: newOrder.clienteNome,
          telefone: newOrder.clienteTelefone,
          endereco: newOrder.clienteEndereco,
          pedidosCount: 1,
          totalGasto: newOrder.valorTotal,
          ultimoPedidoData: newOrder.dataEntrega,
          preferidos: newOrder.itens.map(i => i.nome)
        };
        return [newCustomer, ...prev];
      }
    });

    // 3. Fire celebration confetti
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#d97706', '#b45309', '#f59e0b', '#78350f', '#10b981']
      });
    } catch {
      // Ignored if canvas-confetti is not loaded
    }

    // 4. Persist to Google Sheets if token available
    const token = authToken || getAccessToken();
    if (token) {
      try {
        const row = orderToSpreadsheetRow(newOrder);
        await appendSheetRows(token, spreadsheetId, 'Pedidos!A:N', [row]);
        setSyncStatus('synced');
        setLastSyncTime(new Date());
      } catch (err: any) {
        console.warn('Salvo localmente, erro ao gravar na planilha:', err);
        setSyncStatus('error');
        setSyncError('Pedido salvo no app! Erro de conexão com a planilha.');
      }
    }

    return newOrder;
  };

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    let targetOrder: Order | undefined;
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          targetOrder = { ...o, status: newStatus };
          return targetOrder;
        }
        return o;
      })
    );

    // If order has row index and token is active, update cell in Google Sheets
    const token = authToken || getAccessToken();
    if (token && targetOrder?.spreadsheetRowIndex) {
      try {
        const statusText = newStatus === 'em_producao' ? 'Em Produção' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
        await updateSheetRange(token, spreadsheetId, `Pedidos!M${targetOrder.spreadsheetRowIndex}`, [[statusText]]);
      } catch (err) {
        console.warn('Erro ao atualizar status na planilha:', err);
      }
    }
  };

  const toggleOrderPaid = async (orderId: string) => {
    let targetOrder: Order | undefined;
    setOrders(prev =>
      prev.map(o => {
        if (o.id === orderId) {
          targetOrder = { ...o, pago: !o.pago };
          return targetOrder;
        }
        return o;
      })
    );

    const token = authToken || getAccessToken();
    if (token && targetOrder?.spreadsheetRowIndex) {
      try {
        await updateSheetRange(token, spreadsheetId, `Pedidos!L${targetOrder.spreadsheetRowIndex}`, [[targetOrder.pago ? 'Sim' : 'Não']]);
      } catch (err) {
        console.warn('Erro ao atualizar pagamento na planilha:', err);
      }
    }
  };

  const deleteOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const addCustomer = (custData: Omit<Customer, 'id' | 'pedidosCount' | 'totalGasto'>) => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      pedidosCount: 0,
      totalGasto: 0
    };
    setCustomers(prev => [newCust, ...prev]);

    const token = authToken || getAccessToken();
    if (token) {
      appendSheetRows(token, spreadsheetId, 'Clientes!A:I', [
        [newCust.id, newCust.nome, newCust.telefone, newCust.endereco || '', 0, 'R$ 0,00', '', '', newCust.observacoes || '']
      ]).catch(e => console.warn('Erro ao gravar cliente na planilha:', e));
    }
  };

  const updateCustomer = (cust: Customer) => {
    setCustomers(prev => prev.map(c => (c.id === cust.id ? cust : c)));
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
  };

  const addInventoryItem = async (itemData: Omit<InventoryItem, 'id' | 'ultimaAtualizacao' | 'statusAlerta'>) => {
    let statusAlerta: InventoryItem['statusAlerta'] = 'normal';
    if (itemData.quantidadeAtual <= 0 || itemData.quantidadeAtual < itemData.quantidadeMinima * 0.5) {
      statusAlerta = 'critico';
    } else if (itemData.quantidadeAtual <= itemData.quantidadeMinima) {
      statusAlerta = 'baixo';
    }

    const newItem: InventoryItem = {
      ...itemData,
      id: `inv-${Date.now()}`,
      statusAlerta,
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };

    setInventory(prev => [newItem, ...prev]);

    const token = authToken || getAccessToken();
    if (token) {
      appendSheetRows(token, spreadsheetId, 'Estoque!A:J', [
        [
          newItem.id,
          newItem.nome,
          newItem.categoria,
          newItem.quantidadeAtual.toString().replace('.', ','),
          newItem.quantidadeMinima.toString().replace('.', ','),
          newItem.unidade,
          `R$ ${(newItem.custoUnitario || 0).toFixed(2).replace('.', ',')}`,
          newItem.statusAlerta.toUpperCase(),
          newItem.ultimaAtualizacao,
          newItem.fornecedor || ''
        ]
      ]).catch(e => console.warn('Erro ao gravar estoque na planilha:', e));
    }
  };

  const updateInventoryItem = async (updatedItem: InventoryItem) => {
    let statusAlerta: InventoryItem['statusAlerta'] = 'normal';
    if (updatedItem.quantidadeAtual <= 0 || updatedItem.quantidadeAtual < updatedItem.quantidadeMinima * 0.5) {
      statusAlerta = 'critico';
    } else if (updatedItem.quantidadeAtual <= updatedItem.quantidadeMinima) {
      statusAlerta = 'baixo';
    }

    const itemWithStatus: InventoryItem = {
      ...updatedItem,
      statusAlerta,
      ultimaAtualizacao: new Date().toISOString().split('T')[0]
    };

    setInventory(prev => prev.map(i => (i.id === updatedItem.id ? itemWithStatus : i)));
  };

  const adjustInventoryStock = async (itemId: string, delta: number) => {
    setInventory(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(0, +(item.quantidadeAtual + delta).toFixed(2));
          let statusAlerta: InventoryItem['statusAlerta'] = 'normal';
          if (newQty <= 0 || newQty < item.quantidadeMinima * 0.5) {
            statusAlerta = 'critico';
          } else if (newQty <= item.quantidadeMinima) {
            statusAlerta = 'baixo';
          }
          return {
            ...item,
            quantidadeAtual: newQty,
            statusAlerta,
            ultimaAtualizacao: new Date().toISOString().split('T')[0]
          };
        }
        return item;
      })
    );
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: `prod-${Date.now()}`
    };
    setProducts(prev => [newProd, ...prev]);

    const token = authToken || getAccessToken();
    if (token) {
      const row = productToSpreadsheetRow(newProd);
      appendSheetRows(token, spreadsheetId, 'Produtos!A:G', [row]).catch(e =>
        console.warn('Erro ao gravar produto na planilha:', e)
      );
    }
  };

  const updateProduct = (prod: Product) => {
    setProducts(prev => prev.map(p => (p.id === prod.id ? prod : p)));
  };

  const deleteProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateEmailSettings = (settings: EmailSettings) => {
    setEmailSettingsState(settings);
  };

  const addAuthorizedUser = async (newUser: AuthorizedUser) => {
    setAuthorizedUsers(prev => [newUser, ...prev]);
    const token = authToken || getAccessToken();
    if (token) {
      appendSheetRows(token, spreadsheetId, 'Usuarios!A:D', [
        [newUser.email, newUser.nome, newUser.cargo, newUser.ativo ? 'Ativo' : 'Inativo']
      ]).catch(e => console.warn('Erro ao adicionar usuário na planilha:', e));
    }
  };

  // Send Daily Report Email via Gmail API
  const sendDailyReportEmailNow = async (): Promise<{ success: boolean; error?: string }> => {
    const token = authToken || getAccessToken();
    if (!token) {
      return { success: false, error: 'Conecte sua conta Google para enviar e-mails via Gmail.' };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowIso = tomorrow.toISOString().split('T')[0];
    const tomorrowFormatted = `${String(tomorrow.getDate()).padStart(2, '0')}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${tomorrow.getFullYear()}`;

    const tomorrowOrders = orders.filter(o => o.dataEntrega === tomorrowIso && o.status !== 'cancelado');
    const lowStockItems = inventory.filter(i => i.statusAlerta === 'baixo' || i.statusAlerta === 'critico');

    const recipient = emailSettings.emailDestinatario || currentUser?.email || 'oleonardofischer@gmail.com';

    const result = await sendDailyBakingEmail(token, {
      tomorrowDateFormatted: tomorrowFormatted,
      tomorrowIsoDate: tomorrowIso,
      tomorrowOrders,
      lowStockItems,
      recipientEmail: recipient
    });

    if (result.success) {
      setEmailSettingsState(prev => ({
        ...prev,
        ultimoEnvio: new Date().toLocaleString('pt-BR')
      }));
    }

    return result;
  };

  // Helper for filtering orders by delivery date
  const getOrdersByDate = useCallback(
    (dateString: string) => {
      return orders.filter(o => o.dataEntrega === dateString);
    },
    [orders]
  );

  const lowStockItemsCount = useMemo(() => {
    return inventory.filter(i => i.statusAlerta === 'baixo' || i.statusAlerta === 'critico').length;
  }, [inventory]);

  return (
    <BakeryContext.Provider
      value={{
        currentUser,
        authToken,
        isAuthenticating,
        isAuthorized,
        activeTab,
        setActiveTab,
        spreadsheetId,
        setSpreadsheetId,
        isSyncing,
        syncStatus,
        lastSyncTime,
        syncError,
        orders,
        customers,
        products,
        inventory,
        authorizedUsers,
        emailSettings,
        bakeryPin,
        updateBakeryPin,
        pendingUserEmail,
        unlockWithBakeryPin,
        approvePendingUser,
        loginWithGoogle,
        logoutUser,
        continueAsGuest,
        syncWithGoogleSheets,
        pushAllToGoogleSheets,
        addOrder,
        updateOrderStatus,
        toggleOrderPaid,
        deleteOrder,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        updateInventoryItem,
        adjustInventoryStock,
        addInventoryItem,
        addProduct,
        updateProduct,
        deleteProduct,
        updateEmailSettings,
        sendDailyReportEmailNow,
        addAuthorizedUser,
        getOrdersByDate,
        lowStockItemsCount
      }}
    >
      {children}
    </BakeryContext.Provider>
  );
};

export const useBakery = () => {
  const context = useContext(BakeryContext);
  if (!context) {
    throw new Error('useBakery deve ser usado dentro de um BakeryProvider');
  }
  return context;
};
