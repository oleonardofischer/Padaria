import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Order, OrderStatus } from '../types';
import {
  Calendar,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  Phone,
  MessageCircle,
  Truck,
  ShoppingBag,
  DollarSign,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Filter,
  Check,
  Eye,
  Mail
} from 'lucide-react';

export const DailySummaryDashboard: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    toggleOrderPaid,
    sendDailyReportEmailNow,
    emailSettings,
    inventory,
    lowStockItemsCount
  } = useBakery();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [showEmailPreviewModal, setShowEmailPreviewModal] = useState(false);

  // Filter orders by chosen date
  const dateOrders = useMemo(() => {
    return orders.filter(o => o.dataEntrega === selectedDate);
  }, [orders, selectedDate]);

  // Filter by status if set
  const filteredOrders = useMemo(() => {
    if (statusFilter === 'todos') return dateOrders;
    if (statusFilter === 'pendentes') return dateOrders.filter(o => o.status === 'pendente');
    if (statusFilter === 'producao') return dateOrders.filter(o => o.status === 'em_producao');
    if (statusFilter === 'prontos') return dateOrders.filter(o => o.status === 'pronto');
    if (statusFilter === 'entregues') return dateOrders.filter(o => o.status === 'entregue');
    return dateOrders;
  }, [dateOrders, statusFilter]);

  // Aggregates for the day
  const recipeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    dateOrders.forEach(order => {
      if (order.status !== 'cancelado') {
        order.itens.forEach(item => {
          counts[item.nome] = (counts[item.nome] || 0) + item.quantidade;
        });
      }
    });
    return counts;
  }, [dateOrders]);

  const totalLoaves = useMemo(() => {
    return (Object.values(recipeCounts) as number[]).reduce((a: number, b: number) => a + b, 0);
  }, [recipeCounts]);

  const totalRevenue = useMemo(() => {
    return dateOrders.reduce((sum, o) => (o.status !== 'cancelado' ? sum + o.valorTotal : sum), 0);
  }, [dateOrders]);

  const paidRevenue = useMemo(() => {
    return dateOrders.reduce((sum, o) => (o.status !== 'cancelado' && o.pago ? sum + o.valorTotal : sum), 0);
  }, [dateOrders]);

  const pendingDeliveries = useMemo(() => {
    return dateOrders.filter(o => o.status !== 'entregue' && o.status !== 'cancelado').length;
  }, [dateOrders]);

  // Handle WhatsApp Notification to customer
  const handleOpenWhatsApp = (order: Order) => {
    const rawPhone = (order.clienteTelefone || '').replace(/\D/g, '');
    if (!rawPhone) {
      alert('Este cliente não possui número de WhatsApp cadastrado.');
      return;
    }
    const fullPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const itemsText = order.itens.map(i => `${i.quantidade}x ${i.nome}`).join(' + ');
    
    let text = `Olá ${order.clienteNome}! 🥖\n`;
    if (order.status === 'pronto') {
      text += `Seu pedido de pão artesanal da *Padaria da Tati* está prontinho e quentinho!\n\n`;
    } else {
      text += `Seu pedido de pão artesanal da *Padaria da Tati* para entrega hoje está confirmado!\n\n`;
    }
    text += `📦 *Itens:* ${itemsText}\n`;
    text += `💰 *Valor:* R$ ${order.valorTotal.toFixed(2).replace('.', ',')} (${order.pago ? '✅ Pago' : '⏳ A pagar na entrega'})\n`;
    if (order.tipoEntrega === 'retirada') {
      text += `🏠 *Retirada:* No nosso Ateliê\n`;
    } else {
      text += `🛵 *Entrega:* ${order.clienteEndereco || 'Seu endereço'}\n`;
    }
    text += `\nQualquer dúvida estamos à disposição. Bom apetite! 🥐`;

    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatusMessage(null);
    try {
      const res = await sendDailyReportEmailNow();
      if (res.success) {
        setEmailStatusMessage('Relatório e lembrete de insumos enviados para o e-mail com sucesso! ✉️');
        setShowEmailPreviewModal(false);
      } else {
        setEmailStatusMessage(res.error || 'Erro ao enviar e-mail');
      }
    } catch (e: any) {
      setEmailStatusMessage('Falha ao enviar: ' + e.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 pb-28 space-y-4">
      
      {/* Header & Date Switcher */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-bakery font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Calendar className="w-4 h-4" />
              </div>
              <span>Painel de Entregas & Fornada</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Visualize os pedidos programados, receitas para o forno e status de entrega.
            </p>
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 bg-amber-50 p-1.5 rounded-2xl border border-amber-200 shadow-inner">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedDate === todayStr ? 'bg-amber-800 text-white shadow-sm' : 'text-slate-700 hover:text-amber-950'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                selectedDate === tomorrowStr ? 'bg-amber-800 text-white shadow-sm' : 'text-slate-700 hover:text-amber-950'
              }`}
            >
              Amanhã
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-inner"
            />
          </div>
        </div>

        {/* Operational Metrics Cards for Selected Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Pedidos</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{dateOrders.length}</p>
            <span className="text-[10px] text-amber-800 font-semibold">{pendingDeliveries} pendentes</span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Pães no Forno</span>
            <p className="text-2xl font-bold text-amber-950 mt-0.5">{totalLoaves}</p>
            <span className="text-[10px] text-slate-500 font-medium">Unidades totais</span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider">Faturamento</span>
            <p className="text-xl font-bold text-emerald-900 mt-0.5">
              R$ {totalRevenue.toFixed(2).replace('.', ',')}
            </p>
            <span className="text-[10px] text-emerald-700 font-medium">Previsto do dia</span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-center">
            <span className="text-[11px] font-bold uppercase text-amber-900 tracking-wider">Já Recebido</span>
            <p className="text-xl font-bold text-amber-950 mt-0.5">
              R$ {paidRevenue.toFixed(2).replace('.', ',')}
            </p>
            <span className="text-[10px] text-slate-500 font-medium">
              R$ {(totalRevenue - paidRevenue).toFixed(2).replace('.', ',')} a receber
            </span>
          </div>
        </div>
      </div>

      {/* Production List: Recipe Quantities (Fornada do Dia) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Flame className="w-4 h-4" />
            </div>
            <h3 className="font-serif-bakery font-bold text-base text-slate-900">
              Lista de Fornada (Receitas a Assar)
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            {totalLoaves} pães ao todo
          </span>
        </div>

        {Object.keys(recipeCounts).length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-5 bg-slate-50 rounded-2xl border border-dashed border-amber-200">
            Nenhum pão programado para esta data ainda. Anote um novo pedido na aba anterior!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(recipeCounts).map(([name, qty]) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl"
              >
                <span className="text-xs font-bold text-slate-800">{name}</span>
                <span className="px-3 py-1 bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 ml-2 shadow-sm">
                  {qty} un
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 22:00 Automatic Email Dispatch Trigger Card */}
      <div className="bg-amber-900 text-amber-50 rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-amber-300" />
            <span className="font-bold text-sm text-amber-100">
              Resumo Diário às 22h por E-mail (Gmail)
            </span>
          </div>
          <p className="text-xs text-amber-200 leading-relaxed">
            Envia a lista de pedidos do dia seguinte + lembrete de insumos para <b>{emailSettings.emailDestinatario}</b>
          </p>
          {emailSettings.ultimoEnvio && (
            <p className="text-[11px] text-amber-300">
              Último envio registrado: {emailSettings.ultimoEnvio}
            </p>
          )}
        </div>

        <button
          onClick={() => setShowEmailPreviewModal(true)}
          className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold text-xs rounded-xl shadow-sm transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ver Prévia & Enviar Agora</span>
        </button>
      </div>

      {emailStatusMessage && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-2xl font-medium">
          {emailStatusMessage}
        </div>
      )}

      {/* Orders List Section */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
              <Truck className="w-4 h-4" />
            </div>
            <h3 className="font-serif-bakery font-bold text-base text-slate-900">
              Encomendas do Dia ({filteredOrders.length})
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendentes', label: 'Pendentes' },
              { id: 'producao', label: 'No Forno' },
              { id: 'prontos', label: 'Prontos' },
              { id: 'entregues', label: 'Entregues' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                  statusFilter === f.id
                    ? 'bg-amber-800 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Card Stack */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Nenhum pedido encontrado para o filtro selecionado.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order, index) => {
              const isDelivered = order.status === 'entregue';

              return (
                <div
                  key={order.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                    isDelivered
                      ? 'bg-slate-50 border-slate-200 opacity-75'
                      : order.status === 'pronto'
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : order.status === 'em_producao'
                      ? 'bg-amber-50 border-amber-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          #{index + 1} - {order.clienteNome}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                            order.status === 'entregue'
                              ? 'bg-slate-200 text-slate-700'
                              : order.status === 'pronto'
                              ? 'bg-emerald-200 text-emerald-900'
                              : order.status === 'em_producao'
                              ? 'bg-amber-300 text-amber-950'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {order.status === 'em_producao'
                            ? 'No Forno'
                            : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        📍 {order.tipoEntrega === 'retirada' ? 'Retirada no Ateliê' : order.clienteEndereco || 'Entrega'} • 🕒 {order.horarioEntrega.toUpperCase()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-base text-amber-950 leading-none">
                        R$ {order.valorTotal.toFixed(2).replace('.', ',')}
                      </p>
                      <button
                        onClick={() => toggleOrderPaid(order.id)}
                        className={`mt-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
                          order.pago
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                        }`}
                      >
                        {order.pago ? '✅ PAGO' : '⏳ A PAGAR'}
                      </button>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="my-2.5 bg-slate-50/80 p-2.5 rounded-xl text-xs text-slate-800 space-y-1 border border-slate-200/70">
                    {order.itens.map((it, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="font-medium">
                          <b>{it.quantidade}x</b> {it.nome}
                        </span>
                        <span className="text-slate-500">
                          R$ {(it.quantidade * it.precoUnitario).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    ))}
                    {order.observacoes && (
                      <p className="text-[11px] text-amber-900 italic pt-1 border-t border-slate-200">
                        Obs: {order.observacoes}
                      </p>
                    )}
                  </div>

                  {/* Action Bar (WhatsApp + Status Stepper) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    {/* WhatsApp Quick Button */}
                    <button
                      onClick={() => handleOpenWhatsApp(order)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Avisar cliente via WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Avisar no WhatsApp</span>
                    </button>

                    {/* Status Step Buttons */}
                    <div className="flex items-center gap-1.5">
                      {order.status === 'pendente' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'em_producao')}
                          className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-1 border border-amber-300/60 shadow-sm"
                        >
                          <Flame className="w-3 h-3 text-amber-700" />
                          <span>Levar ao Forno</span>
                        </button>
                      )}

                      {order.status === 'em_producao' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'pronto')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Check className="w-3 h-3" />
                          <span>Pão Pronto!</span>
                        </button>
                      )}

                      {order.status === 'pronto' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'entregue')}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Marcar Entregue</span>
                        </button>
                      )}

                      {order.status === 'entregue' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'pendente')}
                          className="px-2.5 py-1 text-slate-400 hover:text-slate-700 text-[11px] underline"
                        >
                          Reabrir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Preview Modal */}
      {showEmailPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-bakery font-bold text-lg text-slate-900 flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-700" />
                <span>Prévia do Relatório das 22h</span>
              </h3>
              <button
                onClick={() => setShowEmailPreviewModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <p><b>Destinatário:</b> {emailSettings.emailDestinatario}</p>
              <p><b>Data analisada:</b> Entregas de Amanhã ({tomorrowStr.split('-').reverse().join('/')})</p>
              <p><b>Total de Pedidos amanhã:</b> {orders.filter(o => o.dataEntrega === tomorrowStr).length}</p>
              <p><b>Alertas de insumos com estoque baixo:</b> {lowStockItemsCount} item(ns)</p>
            </div>

            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2">
              <span className="font-bold text-amber-950 block">Conteúdo que será disparado:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-700">
                <li>Tabela com métricas de faturamento e volume total de pães.</li>
                <li>Lista de receitas e fornadas para preparar com as quantidades exatas.</li>
                <li>Ficha completa de cada cliente com endereço, telefone e itens.</li>
                <li>Lembrete de compras com todos os insumos (farinha, fermento, embalagens) abaixo da cota mínima.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                onClick={() => setShowEmailPreviewModal(false)}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-bold hover:bg-slate-100"
              >
                Fechar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingEmail ? 'Disparando...' : 'Confirmar & Disparar E-mail'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
