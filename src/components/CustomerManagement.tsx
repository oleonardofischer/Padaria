import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { Customer } from '../types';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  MapPin,
  ShoppingBag,
  PlusCircle,
  MessageCircle,
  ExternalLink,
  DollarSign,
  Heart,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export const CustomerManagement: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, setActiveTab } = useBakery();

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(
      c =>
        c.nome.toLowerCase().includes(q) ||
        c.telefone.includes(q) ||
        (c.endereco && c.endereco.toLowerCase().includes(q))
    );
  }, [customers, searchTerm]);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addCustomer({
      nome: name.trim(),
      telefone: phone.trim(),
      endereco: address.trim(),
      observacoes: notes.trim(),
      preferidos: []
    });

    setIsAddModalOpen(false);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
  };

  const openWhatsApp = (phoneStr: string, customerName: string) => {
    const raw = phoneStr.replace(/\D/g, '');
    if (!raw) return;
    const full = raw.length <= 11 ? `55${raw}` : raw;
    const text = `Olá ${customerName}! 🥖 Tudo bem? Passando para saber se você vai querer seus pães artesanais frescos para esta semana! 🥐`;
    window.open(`https://wa.me/${full}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 pb-28 space-y-4">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-bakery font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <Users className="w-4 h-4" />
              </div>
              <span>Gestão de Clientes & Contatos</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Lista de clientes cadastrados, histórico de compras e contato direto por WhatsApp.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, telefone ou endereço..."
            className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>
      </div>

      {/* Customer Cards List */}
      <div className="space-y-2.5">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center text-xs text-slate-400 border border-amber-100 shadow-sm">
            Nenhum cliente encontrado. Cadastre um novo cliente acima!
          </div>
        ) : (
          filteredCustomers.map(cust => (
            <div
              key={cust.id}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 hover:border-amber-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">{cust.nome}</span>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                    {cust.pedidosCount || 0} pedido(s)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  {cust.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-amber-700" />
                      <span>{cust.telefone}</span>
                    </span>
                  )}
                  {cust.endereco && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-amber-700" />
                      <span className="truncate max-w-[200px]">{cust.endereco}</span>
                    </span>
                  )}
                </div>

                {cust.preferidos && cust.preferidos.length > 0 && (
                  <div className="flex items-center gap-1 pt-0.5 text-[11px] text-amber-900 font-medium">
                    <Heart className="w-3 h-3 text-amber-600 shrink-0 fill-amber-600/30" />
                    <span>Favoritos: {cust.preferidos.join(', ')}</span>
                  </div>
                )}

                {cust.observacoes && (
                  <p className="text-[11px] text-slate-500 italic">
                    Obs: {cust.observacoes}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                {cust.telefone && (
                  <button
                    onClick={() => openWhatsApp(cust.telefone, cust.nome)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <button
                  onClick={() => setActiveTab('novo-pedido')}
                  className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                  title="Anotar novo pedido para este cliente"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Anotar Pedido</span>
                </button>

                <button
                  onClick={() => setCustomerToDelete(cust)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="Excluir cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-bakery font-bold text-lg text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-700" />
                <span>Novo Cliente</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="ex: Maria Silva"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp / Telefone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="ex: (11) 98765-4321"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Endereço de Entrega</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações do Cliente</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Preferências, dias favoritos de entrega, observações especiais"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-bold shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-serif-bakery font-bold text-base text-slate-900">
                  Excluir Cliente?
                </h3>
                <p className="text-xs text-slate-500">
                  Deseja remover este cliente da sua lista de contatos?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <p className="font-bold text-slate-900">{customerToDelete.nome}</p>
              {customerToDelete.telefone && (
                <p className="text-slate-500 text-[11px] mt-0.5">{customerToDelete.telefone}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
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
