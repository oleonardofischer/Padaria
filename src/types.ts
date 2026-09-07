export type OrderStatus = 'pendente' | 'em_producao' | 'pronto' | 'entregue' | 'cancelado';
export type DeliveryType = 'retirada' | 'entrega';
export type PaymentMethod = 'pix' | 'dinheiro' | 'cartao' | 'a_pagar';

export interface OrderItem {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
}

export interface Order {
  id: string;
  numeroPedido?: number;
  clienteNome: string;
  clienteTelefone: string;
  clienteEndereco?: string;
  itens: OrderItem[];
  valorTotal: number;
  dataPedido: string; // YYYY-MM-DD
  dataEntrega: string; // YYYY-MM-DD
  horarioEntrega: string; // 'manha' | 'tarde' | 'noite' | '08:00' etc.
  status: OrderStatus;
  tipoEntrega: DeliveryType;
  taxaEntrega?: number;
  formaPagamento: PaymentMethod;
  pago: boolean;
  observacoes?: string;
  createdAt: string;
  spreadsheetRowIndex?: number;
}

export interface Customer {
  id: string;
  nome: string;
  telefone: string;
  endereco?: string;
  pedidosCount: number;
  totalGasto: number;
  ultimoPedidoData?: string;
  preferidos?: string[];
  observacoes?: string;
}

export interface Product {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  pesoOuTamanho?: string;
  descricao?: string;
  ativo: boolean;
  ingredientesEstimados?: {
    farinhaGramos: number;
    fermentoGramos: number;
    outros?: string;
  };
}

export type AlertLevel = 'normal' | 'baixo' | 'critico';

export interface InventoryItem {
  id: string;
  nome: string;
  categoria: 'Farinhas & Grãos' | 'Fermentos & Leveduras' | 'Laticínios & Ovos' | 'Açúcares & Doces' | 'Temperos & Sal' | 'Embalagens';
  quantidadeAtual: number;
  quantidadeMinima: number;
  unidade: 'kg' | 'g' | 'un' | 'pct' | 'L' | 'ml';
  custoUnitario?: number;
  statusAlerta: AlertLevel;
  ultimaAtualizacao: string;
  fornecedor?: string;
}

export interface AuthorizedUser {
  email: string;
  nome: string;
  cargo: 'Administrador' | 'Padeiro(a)' | 'Atendente';
  ativo: boolean;
}

export interface EmailSettings {
  emailDestinatario: string;
  horarioEnvio: string; // '22:00'
  ativarEnvioAutomatico: boolean;
  incluirEstoqueBaixo: boolean;
  ultimoEnvio?: string;
}

export type ActiveTab = 'novo-pedido' | 'entregas' | 'estoque' | 'clientes' | 'configuracoes';
