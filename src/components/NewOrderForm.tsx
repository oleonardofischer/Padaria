import React, { useState, useMemo, useRef } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Product, OrderItem, Customer, DeliveryType, PaymentMethod, Order } from '../types';
import {
  Plus,
  Minus,
  Check,
  UserPlus,
  Search,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  DollarSign,
  QrCode,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Flame,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export const NewOrderForm: React.FC = () => {
  const {
    products,
    customers,
    addOrder,
    setActiveTab,
    isSyncing
  } = useBakery();

  // Selected customer state
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isNewCustomerFormOpen, setIsNewCustomerFormOpen] = useState(false);

  // Selected items in current order
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');

  // Delivery options
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [deliveryDate, setDeliveryDate] = useState<string>(tomorrowStr);
  const [deliveryShift, setDeliveryShift] = useState<string>('manha');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('entrega');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  const clientInputRef = useRef<HTMLInputElement>(null);

  // Filter existing customers matching search
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 5);
    const q = customerSearch.toLowerCase();
    return customers.filter(
      c => c.nome.toLowerCase().includes(q) || c.telefone.includes(q)
    );
  }, [customerSearch, customers]);

  // Categories list
  const categories = useMemo(() => {
    const cats = ['Todos', ...Array.from(new Set(products.map(p => p.categoria)))];
    return cats;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.ativo) return false;
      const matchCat = activeCategory === 'Todos' || p.categoria === activeCategory;
      const matchSearch = !productSearchTerm.trim() || 
        p.nome.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
        (p.descricao && p.descricao.toLowerCase().includes(productSearchTerm.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, productSearchTerm]);

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.nome);
    setCustomerPhone(customer.telefone);
    setCustomerAddress(customer.endereco || '');
    setCustomerSearch(customer.nome);
    setIsNewCustomerFormOpen(false);
  };

  // Add/Increment product item in order
  const handleAddProduct = (product: Product) => {
    setOrderItems(prev => {
      const existing = prev.find(it => it.produtoId === product.id);
      if (existing) {
        return prev.map(it =>
          it.produtoId === product.id ? { ...it, quantidade: it.quantidade + 1 } : it
        );
      } else {
        return [
          ...prev,
          {
            produtoId: product.id,
            nome: product.nome,
            quantidade: 1,
            precoUnitario: product.preco
          }
        ];
      }
    });
  };

  // Decrement item quantity
  const handleRemoveProduct = (productId: string) => {
    setOrderItems(prev => {
      const existing = prev.find(it => it.produtoId === productId);
      if (existing && existing.quantidade > 1) {
        return prev.map(it =>
          it.produtoId === productId ? { ...it, quantidade: it.quantidade - 1 } : it
        );
      }
      return prev.filter(it => it.produtoId !== productId);
    });
  };

  // Calculate order total
  const orderTotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantidade * item.precoUnitario, 0);
  }, [orderItems]);

  const totalBreadLoaves = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + item.quantidade, 0);
  }, [orderItems]);

  // Submit Order and Reset immediately for next entry
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalClientName = customerName.trim() || customerSearch.trim();
    if (!finalClientName) {
      alert('Por favor, informe o nome do cliente.');
      clientInputRef.current?.focus();
      return;
    }

    if (orderItems.length === 0) {
      alert('Por favor, selecione pelo menos um pão ou produto.');
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await addOrder({
        clienteNome: finalClientName,
        clienteTelefone: customerPhone.trim(),
        clienteEndereco: deliveryType === 'retirada' ? 'Retirada no Ateliê' : customerAddress.trim(),
        itens: orderItems,
        valorTotal: orderTotal,
        dataPedido: todayStr,
        dataEntrega: deliveryDate,
        horarioEntrega: deliveryShift,
        status: 'pendente',
        tipoEntrega: deliveryType,
        formaPagamento: paymentMethod,
        pago: isPaid,
        observacoes: notes.trim()
      });

      setLastCreatedOrder(created);
      setShowSuccessNotification(true);

      // Reset form fields immediately so Tati can write the next order
      setCustomerSearch('');
      setSelectedCustomerId(null);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setOrderItems([]);
      setNotes('');
      setIsPaid(false);

      // Auto-focus back to client field for seamless next order entry
      setTimeout(() => {
        clientInputRef.current?.focus();
      }, 100);

      // Hide notification after 8 seconds
      setTimeout(() => {
        setShowSuccessNotification(false);
      }, 8000);
    } catch (err: any) {
      alert('Erro ao registrar pedido: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4 pb-28">
      
      {/* Success alert banner with rapid feedback */}
      {showSuccessNotification && lastCreatedOrder && (
        <div className="mb-4 bg-emerald-800 text-white p-4 rounded-2xl shadow-md border border-emerald-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-xl shrink-0">
              🥖
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">
                Pedido anotado e sincronizado com sucesso!
              </p>
              <p className="text-xs text-emerald-100 mt-0.5">
                {lastCreatedOrder.clienteNome} • {lastCreatedOrder.itens.length} tipo(s) de pão • R$ {lastCreatedOrder.valorTotal.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('entregas')}
            className="px-3 py-1.5 bg-white text-emerald-900 text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-50 transition-colors shrink-0 flex items-center gap-1"
          >
            <span>Ver Entregas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Order Capture Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-amber-100 overflow-hidden">
        
        {/* Card Header */}
        <div className="bg-amber-900 text-amber-50 px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-amber-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-800 flex items-center justify-center text-amber-300">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <h2 className="font-serif-bakery font-bold text-base sm:text-lg text-amber-100">
              Anotação Rápida de Pedido
            </h2>
          </div>
          <span className="text-xs bg-amber-800/80 border border-amber-700 text-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
            Entrada Direta
          </span>
        </div>

        <form onSubmit={handleSubmitOrder} className="p-4 sm:p-6 space-y-5">
          
          {/* SECTION 1: CUSTOMER SELECTION / SEARCH */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Cliente (Recorrente ou Novo) *
            </label>

            {!selectedCustomerId && !isNewCustomerFormOpen ? (
              <div className="space-y-2.5">
                <div className="relative">
                  <input
                    ref={clientInputRef}
                    type="text"
                    value={customerSearch}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setCustomerName(e.target.value);
                    }}
                    placeholder="Digite o nome do cliente..."
                    className="w-full pl-9 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white transition-colors placeholder:text-slate-400"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-amber-700 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewCustomerFormOpen(true);
                      setCustomerName(customerSearch);
                    }}
                    className="absolute right-1.5 top-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 border border-amber-300/60"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                  </button>
                </div>

                {/* Autocomplete Customer Suggestions */}
                {filteredCustomers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-[11px] text-slate-500 self-center mr-1">Sugestões:</span>
                    {filteredCustomers.map(cust => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-amber-100 text-slate-800 border border-slate-200 hover:border-amber-300 transition-colors flex items-center gap-1"
                      >
                        <span className="font-semibold">{cust.nome}</span>
                        {cust.preferidos && cust.preferidos[0] && (
                          <span className="text-[10px] text-amber-700 font-normal">
                            ({cust.preferidos[0].split(' ')[0]})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : selectedCustomerId ? (
              /* Selected Customer Card */
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{customerName}</span>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Cadastrado
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    📞 {customerPhone || 'Sem telefone'} • 📍 {customerAddress || 'Retirada'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setCustomerSearch('');
                  }}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-white transition-colors"
                >
                  Trocar
                </button>
              </div>
            ) : (
              /* Inline Full New Customer Form */
              <div className="bg-slate-50 border border-amber-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-amber-700" /> Cadastro Rápido de Novo Cliente
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNewCustomerFormOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-medium"
                  >
                    Cancelar
                  </button>
                </div>
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nome completo do cliente *"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  required
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="WhatsApp / Telefone (ex: 11 98765-4321)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={e => setCustomerAddress(e.target.value)}
                    placeholder="Endereço de entrega (Rua, nº, Apto)"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: BREAD & BAKERY PRODUCT SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Seleção de Pães & Encomenda *
              </label>
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                {totalBreadLoaves} pão(ães) no pedido
              </span>
            </div>

            {/* Category Filter Pills & Quick Search */}
            <div className="space-y-2">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeCategory === cat
                        ? 'bg-amber-800 text-white font-bold shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-amber-900'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {products.length > 4 && (
                <div className="relative">
                  <input
                    type="text"
                    value={productSearchTerm}
                    onChange={e => setProductSearchTerm(e.target.value)}
                    placeholder="Filtrar pão por nome..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                </div>
              )}
            </div>

            {/* Product Quick-Add Grid */}
            {filteredProducts.length === 0 ? (
              <div className="p-5 text-center bg-slate-50 rounded-2xl border border-slate-200 mt-2 text-xs text-slate-500">
                Nenhum pão encontrado nessa categoria ou busca.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {filteredProducts.map(product => {
                  const existingItem = orderItems.find(it => it.produtoId === product.id);
                  const quantity = existingItem ? existingItem.quantidade : 0;

                  return (
                    <div
                      key={product.id}
                      className={`p-2.5 rounded-2xl border transition-colors flex items-center justify-between ${
                        quantity > 0
                          ? 'bg-amber-50 border-amber-300'
                          : 'bg-white border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex-1 pr-2 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {product.nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                          <span className="font-bold text-amber-800">
                            R$ {product.preco.toFixed(2).replace('.', ',')}
                          </span>
                          {product.pesoOuTamanho && (
                            <>
                              <span>•</span>
                              <span>{product.pesoOuTamanho}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Stepper Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {quantity > 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRemoveProduct(product.id)}
                              className="w-7 h-7 rounded-lg bg-amber-200 text-amber-950 font-bold flex items-center justify-center hover:bg-amber-300 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-5 text-center font-bold text-sm text-slate-900">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddProduct(product)}
                              className="w-7 h-7 rounded-lg bg-amber-800 text-white font-bold flex items-center justify-center hover:bg-amber-900 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddProduct(product)}
                            className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1 transition-colors border border-amber-200"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected items summary list & special notes per item */}
            {orderItems.length > 0 && (
              <div className="mt-3 bg-amber-50/60 rounded-2xl p-3 border border-amber-200/70 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Itens Selecionados ({totalBreadLoaves})</span>
                  <span className="text-amber-900">Subtotal: R$ {orderTotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="divide-y divide-amber-200/50">
                  {orderItems.map((item) => (
                    <div key={item.produtoId} className="py-1.5 flex items-center justify-between text-xs">
                      <div className="flex-1 pr-2">
                        <span className="font-semibold text-slate-900">
                          {item.quantidade}x {item.nome}
                        </span>
                        <span className="text-slate-500 ml-2">
                          (R$ {(item.quantidade * item.precoUnitario).toFixed(2).replace('.', ',')})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(item.produtoId)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: DELIVERY SCHEDULE & LOGISTICS */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              3. Data de Entrega & Logística
            </label>

            {/* Fast Date Selector Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => setDeliveryDate(todayStr)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  deliveryDate === todayStr
                    ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Hoje ({todayStr.slice(8, 10)}/{todayStr.slice(5, 7)})
              </button>
              <button
                type="button"
                onClick={() => setDeliveryDate(tomorrowStr)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-colors ${
                  deliveryDate === tomorrowStr
                    ? 'bg-amber-800 text-white border-amber-800 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Amanhã ({tomorrowStr.slice(8, 10)}/{tomorrowStr.slice(5, 7)})
              </button>
              <div className="col-span-2 relative">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={e => setDeliveryDate(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                />
              </div>
            </div>

            {/* Shift & Delivery Mode */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-1">Turno / Horário</span>
                <select
                  value={deliveryShift}
                  onChange={e => setDeliveryShift(e.target.value)}
                  className="w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:bg-white"
                >
                  <option value="manha">🌅 Manhã (07h às 11h)</option>
                  <option value="tarde">☀️ Tarde (14h às 18h)</option>
                  <option value="noite">🌙 Noite (18h às 20h)</option>
                  <option value="balcao">🥖 Balcão / Retirada</option>
                </select>
              </div>

              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-1">Tipo de Entrega</span>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('entrega')}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                      deliveryType === 'entrega' ? 'bg-white text-amber-950 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    🛵 Entrega
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('retirada')}
                    className={`py-1 text-xs font-bold rounded-lg transition-colors ${
                      deliveryType === 'retirada' ? 'bg-white text-amber-950 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    🏠 Retirada
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: PAYMENT & NOTES */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              4. Pagamento & Observações
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
              {[
                { id: 'pix', label: 'Pix', icon: <QrCode className="w-3.5 h-3.5" /> },
                { id: 'dinheiro', label: 'Dinheiro', icon: <DollarSign className="w-3.5 h-3.5" /> },
                { id: 'cartao', label: 'Cartão', icon: <CreditCard className="w-3.5 h-3.5" /> },
                { id: 'a_pagar', label: 'Na Entrega', icon: <Clock className="w-3.5 h-3.5" /> }
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-colors ${
                    paymentMethod === p.id
                      ? 'bg-amber-100 text-amber-950 border-amber-300 font-bold'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Paid status toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-2.5">
              <span className="text-xs font-bold text-slate-800">
                O cliente já realizou o pagamento?
              </span>
              <button
                type="button"
                onClick={() => setIsPaid(!isPaid)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  isPaid ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isPaid ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Pago (Sim)</span>
                  </>
                ) : (
                  <span>Pendente (A pagar)</span>
                )}
              </button>
            </div>

            {/* Custom Notes */}
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Observações (ex: embalar para presente, pão bem tostadinho, etc.)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
            />
          </div>

          {/* TOTAL & SUBMIT BUTTON */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <span className="text-xs text-slate-500 font-medium">Total do Pedido:</span>
                <p className="text-2xl font-bold text-amber-950 leading-none mt-0.5">
                  R$ {orderTotal.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Data de Entrega:</span>
                <p className="text-sm font-bold text-slate-800">
                  {deliveryDate.split('-').reverse().join('/')} ({deliveryShift.toUpperCase()})
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || orderItems.length === 0}
              className="w-full py-3.5 bg-amber-800 hover:bg-amber-900 active:bg-amber-950 text-white font-bold text-base rounded-2xl shadow-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flame className="w-5 h-5 text-amber-300" />
              <span>{isSubmitting ? 'Gravando na Planilha...' : 'Salvar Pedido na Planilha 🥖'}</span>
            </button>
            <p className="text-[11px] text-center text-slate-500 mt-1.5">
              Ao salvar, a tela limpa automaticamente para você anotar o próximo pedido.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
};
