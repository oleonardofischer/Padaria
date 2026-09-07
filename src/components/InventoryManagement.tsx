import React, { useState, useMemo } from 'react';
import { useBakery } from '../context/BakeryContext';
import { InventoryItem, AlertLevel } from '../types';
import {
  PackageCheck,
  AlertTriangle,
  Plus,
  Minus,
  PlusCircle,
  Search,
  ShoppingCart,
  Check,
  Copy,
  Flame,
  ArrowDownUp,
  Sparkles,
  Layers
} from 'lucide-react';

export const InventoryManagement: React.FC = () => {
  const {
    inventory,
    adjustInventoryStock,
    addInventoryItem,
    updateInventoryItem,
    orders
  } = useBakery();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'alertas'>('todos');
  
  // New Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<InventoryItem['categoria']>('Farinhas & Grãos');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemMin, setNewItemMin] = useState('');
  const [newItemUnit, setNewItemUnit] = useState<InventoryItem['unidade']>('kg');
  const [newItemCost, setNewItemCost] = useState('');
  const [newItemSupplier, setNewItemSupplier] = useState('');

  // Copy notification state
  const [copiedShoppingList, setCopiedShoppingList] = useState(false);

  // Tomorrow's date for ingredient forecasting
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Tomorrow's required ingredients estimation
  const tomorrowIngredientsEstimate = useMemo(() => {
    const tomorrowOrders = orders.filter(o => o.dataEntrega === tomorrowStr && o.status !== 'cancelado');
    let totalFlourGrams = 0;
    let totalYeastGrams = 0;
    let totalLoaves = 0;

    tomorrowOrders.forEach(o => {
      o.itens.forEach(it => {
        totalLoaves += it.quantidade;
        // Standard average: ~400g flour per loaf, ~15g yeast
        totalFlourGrams += it.quantidade * 400;
        totalYeastGrams += it.quantidade * 15;
      });
    });

    return {
      totalOrders: tomorrowOrders.length,
      totalLoaves,
      flourKg: +(totalFlourGrams / 1000).toFixed(2),
      yeastKg: +(totalYeastGrams / 1000).toFixed(2)
    };
  }, [orders, tomorrowStr]);

  // Filtered inventory list
  const categories = useMemo(() => {
    return ['Todos', 'Farinhas & Grãos', 'Fermentos & Leveduras', 'Laticínios & Ovos', 'Temperos & Sal', 'Embalagens'];
  }, []);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.categoria.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'Todos' || item.categoria === selectedCategory;
      const matchAlert = statusFilter === 'todos' || item.statusAlerta !== 'normal';
      return matchSearch && matchCat && matchAlert;
    });
  }, [inventory, searchTerm, selectedCategory, statusFilter]);

  const lowStockItems = useMemo(() => {
    return inventory.filter(i => i.statusAlerta === 'baixo' || i.statusAlerta === 'critico');
  }, [inventory]);

  const handleCopyShoppingList = () => {
    if (lowStockItems.length === 0) {
      alert('Nenhum item com estoque baixo no momento!');
      return;
    }

    let text = `🛒 *Lista de Compras / Reposição de Insumos - Padaria da Tati*\n`;
    text += `Data: ${new Date().toLocaleDateString('pt-BR')}\n\n`;
    
    lowStockItems.forEach(i => {
      const needed = Math.max(0, +(i.quantidadeMinima * 2 - i.quantidadeAtual).toFixed(1));
      text += `• *${i.nome}*\n  Atual: ${i.quantidadeAtual}${i.unidade} (Mín: ${i.quantidadeMinima}${i.unidade}) -> Comprar: ~${needed}${i.unidade}${i.fornecedor ? ` [${i.fornecedor}]` : ''}\n`;
    });

    text += `\nGerado automaticamente pelo Sistema de Gestão.`;

    navigator.clipboard.writeText(text);
    setCopiedShoppingList(true);
    setTimeout(() => setCopiedShoppingList(false), 3000);
  };

  const handleCreateNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    await addInventoryItem({
      nome: newItemName.trim(),
      categoria: newItemCategory,
      quantidadeAtual: parseFloat(newItemQty.replace(',', '.')) || 0,
      quantidadeMinima: parseFloat(newItemMin.replace(',', '.')) || 0,
      unidade: newItemUnit,
      custoUnitario: parseFloat(newItemCost.replace(',', '.')) || 0,
      fornecedor: newItemSupplier.trim()
    });

    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemQty('');
    setNewItemMin('');
    setNewItemCost('');
    setNewItemSupplier('');
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-4 py-4 pb-28 space-y-4">
      
      {/* Header & Quick Action */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-serif-bakery font-bold text-lg sm:text-xl text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800">
                <PackageCheck className="w-4 h-4" />
              </div>
              <span>Controle de Estoque & Matérias-Primas</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Acompanhe farinhas, fermentos e embalagens com alertas automáticos de reposição.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Novo Insumo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Stock Alert Banner if any items low */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200 flex items-center justify-center text-amber-900 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Atenção: {lowStockItems.length} insumo(s) abaixo do nível mínimo!
                </h3>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  Estes itens precisam de reposição antes das próximas fornadas:
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {lowStockItems.map(it => (
                    <span
                      key={it.id}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-xs ${
                        it.statusAlerta === 'critico'
                          ? 'bg-red-200 text-red-950 border border-red-300'
                          : 'bg-amber-200 text-amber-950 border border-amber-300'
                      }`}
                    >
                      {it.nome}: {it.quantidadeAtual}{it.unidade} (Mín: {it.quantidadeMinima}{it.unidade})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyShoppingList}
              className="px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors shrink-0"
              title="Copiar lista de compras para o WhatsApp"
            >
              {copiedShoppingList ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedShoppingList ? 'Copiado!' : 'Copiar p/ WhatsApp'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tomorrow's Baking Ingredient Estimation Card */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <h3 className="font-serif-bakery font-bold text-sm text-slate-900">
            Estimativa de Consumo para Amanhã ({tomorrowStr.split('-').reverse().join('/')})
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Pães a Assar</span>
            <span className="text-base font-bold text-amber-950 mt-0.5 block">{tomorrowIngredientsEstimate.totalLoaves} un</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Farinha Estimada</span>
            <span className="text-base font-bold text-amber-950 mt-0.5 block">~{tomorrowIngredientsEstimate.flourKg} kg</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Fermento Estimado</span>
            <span className="text-base font-bold text-amber-950 mt-0.5 block">~{tomorrowIngredientsEstimate.yeastKg} kg</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <span className="text-slate-500 block font-medium">Embalagens Kraft</span>
            <span className="text-base font-bold text-amber-950 mt-0.5 block">{tomorrowIngredientsEstimate.totalLoaves} un</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-amber-100 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar insumo (farinha, fermento, embalagem...)"
              className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          </div>

          <div className="flex gap-1">
            <button
              onClick={() => setStatusFilter(statusFilter === 'alertas' ? 'todos' : 'alertas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                statusFilter === 'alertas'
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Só Alertas ({lowStockItems.length})</span>
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-amber-800 text-white font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Inventory Item Cards */}
        <div className="space-y-2.5 pt-1">
          {filteredInventory.map(item => {
            const pct = Math.min(100, Math.round((item.quantidadeAtual / (item.quantidadeMinima * 1.5 || 1)) * 100));
            const isCritical = item.statusAlerta === 'critico';
            const isLow = item.statusAlerta === 'baixo';

            return (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-colors ${
                  isCritical
                    ? 'bg-red-50/80 border-red-300'
                    : isLow
                    ? 'bg-amber-50 border-amber-300'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{item.nome}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          isCritical
                            ? 'bg-red-200 text-red-900 font-bold'
                            : isLow
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isCritical ? 'Crítico' : isLow ? 'Baixo' : 'Em Dia'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.categoria} {item.fornecedor ? `• Fornecedor: ${item.fornecedor}` : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {item.quantidadeAtual} {item.unidade}
                    </span>
                    <span className="block text-[11px] text-slate-500">
                      Mínimo: {item.quantidadeMinima} {item.unidade}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 my-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCritical ? 'bg-red-600' : isLow ? 'bg-amber-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.max(5, pct)}%` }}
                  />
                </div>

                {/* Fast Adjuster Controls for Mobile */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400">
                    Atualizado: {item.ultimaAtualizacao}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Quick decrement (-1 or -0.5) */}
                    <button
                      onClick={() => adjustInventoryStock(item.id, item.unidade === 'un' ? -1 : -0.5)}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-0.5 border border-slate-200"
                      title="Diminuir estoque"
                    >
                      <Minus className="w-3 h-3" />
                      <span>{item.unidade === 'un' ? '1' : '0.5'}</span>
                    </button>

                    {/* Quick increment (+1 or +5) */}
                    <button
                      onClick={() => adjustInventoryStock(item.id, item.unidade === 'un' ? 5 : 1)}
                      className="px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition-colors flex items-center gap-0.5 border border-amber-200"
                      title="Adicionar ao estoque"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{item.unidade === 'un' ? '5 un' : '1 kg'}</span>
                    </button>

                    {/* Restock buy button */}
                    <button
                      onClick={() => adjustInventoryStock(item.id, item.unidade === 'un' ? 20 : 5)}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                      title="Registrar compra grande"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>+ Comprar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Raw Material Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-serif-bakery font-bold text-lg text-slate-900 flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-amber-700" />
                <span>Adicionar Novo Insumo</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Insumo *</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="ex: Farinha de Centeio Integral"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <select
                    value={newItemCategory}
                    onChange={e => setNewItemCategory(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="Farinhas & Grãos">Farinhas & Grãos</option>
                    <option value="Fermentos & Leveduras">Fermentos & Leveduras</option>
                    <option value="Laticínios & Ovos">Laticínios & Ovos</option>
                    <option value="Temperos & Sal">Temperos & Sal</option>
                    <option value="Embalagens">Embalagens</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidade</label>
                  <select
                    value={newItemUnit}
                    onChange={e => setNewItemUnit(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                  >
                    <option value="kg">kg (Quilogramas)</option>
                    <option value="g">g (Gramas)</option>
                    <option value="un">un (Unidades)</option>
                    <option value="pct">pct (Pacotes)</option>
                    <option value="L">L (Litros)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qtd Inicial</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItemQty}
                    onChange={e => setNewItemQty(e.target.value)}
                    placeholder="ex: 10"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qtd Mínima de Alerta</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newItemMin}
                    onChange={e => setNewItemMin(e.target.value)}
                    placeholder="ex: 5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fornecedor / Loja</label>
                <input
                  type="text"
                  value={newItemSupplier}
                  onChange={e => setNewItemSupplier(e.target.value)}
                  placeholder="ex: Distribuidora Moinho Real"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
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
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
