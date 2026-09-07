import { Product, InventoryItem, Customer, Order, AuthorizedUser, EmailSettings } from '../types';

export const DEFAULT_SPREADSHEET_ID = '1M68EaVORIna6Je-yeEsOCVu4SXJOQmQwVZPniXTQ1qM';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    nome: 'Pão de Fermentação Natural Tradicional (Levain)',
    categoria: 'Pães Rústicos',
    preco: 24.00,
    pesoOuTamanho: '700g',
    descricao: 'Casca crocante dourada, miolo alvéolo macio e sabor artesanal suavemente ácido.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 450, fermentoGramos: 100 }
  },
  {
    id: 'prod-2',
    nome: 'Pão Rústico Integral Multigrãos',
    categoria: 'Pães Rústicos',
    preco: 26.00,
    pesoOuTamanho: '650g',
    descricao: 'Com sementes de girassol, linhaça dourada, gergelim e aveia laminada.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 420, fermentoGramos: 90 }
  },
  {
    id: 'prod-3',
    nome: 'Pão Brioche Francês na Forma',
    categoria: 'Pães Especiais',
    preco: 28.00,
    pesoOuTamanho: '500g',
    descricao: 'Rico em manteiga de primeira linha e ovos caipiras, miolo incrivelmente fofo.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 300, fermentoGramos: 15 }
  },
  {
    id: 'prod-4',
    nome: 'Focaccia Clássica Alecrim & Flor de Sal',
    categoria: 'Salgados & Focaccias',
    preco: 22.00,
    pesoOuTamanho: '450g',
    descricao: 'Regada com azeite de oliva extravirgem, alecrim fresco e flor de sal.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 300, fermentoGramos: 10 }
  },
  {
    id: 'prod-5',
    nome: 'Focaccia Especial Tomate Confit & Pesto',
    categoria: 'Salgados & Focaccias',
    preco: 30.00,
    pesoOuTamanho: '500g',
    descricao: 'Tomatinhos cereja assados lentamente, pesto fresco de manjericão e azeite.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 300, fermentoGramos: 10 }
  },
  {
    id: 'prod-6',
    nome: 'Pão Australiano com Mel & Cacau',
    categoria: 'Pães Especiais',
    preco: 25.00,
    pesoOuTamanho: '550g',
    descricao: 'Adocicado na medida, com toque de mel silvestre, cacau nobre e fubá na crosta.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 350, fermentoGramos: 12 }
  },
  {
    id: 'prod-7',
    nome: 'Pão de Queijo Mineiro Artesanal (Pacote c/ 10 un)',
    categoria: 'Salgados & Focaccias',
    preco: 25.00,
    pesoOuTamanho: 'Pacote 400g',
    descricao: 'Feito com queijo canastra curado e polvilho doce selecionado.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 0, fermentoGramos: 0 }
  },
  {
    id: 'prod-8',
    nome: 'Pão Doce Trançado com Canela & Gotas de Chocolate',
    categoria: 'Pães Doces',
    preco: 27.00,
    pesoOuTamanho: '600g',
    descricao: 'Trança fofíssima com recheio cremoso de canela, açúcar mascavo e chocolate.',
    ativo: true,
    ingredientesEstimados: { farinhaGramos: 350, fermentoGramos: 15 }
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    nome: 'Dona Maria Oliveira',
    telefone: '(11) 98765-4321',
    endereco: 'Rua das Flores, 120 - Apto 42',
    pedidosCount: 8,
    totalGasto: 198.00,
    ultimoPedidoData: '2026-08-27',
    preferidos: ['Pão de Fermentação Natural Tradicional (Levain)', 'Brioche Francês'],
    observacoes: 'Prefere pão bem coradinho e casca bem crocante. Entregar de manhã.'
  },
  {
    id: 'cust-2',
    nome: 'Carlos Eduardo Santos',
    telefone: '(11) 99123-4567',
    endereco: 'Av. Paulista, 1500 - Bloco B',
    pedidosCount: 5,
    totalGasto: 135.00,
    ultimoPedidoData: '2026-08-25',
    preferidos: ['Focaccia Especial Tomate Confit & Pesto'],
    observacoes: 'Paga sempre via Pix na entrega.'
  },
  {
    id: 'cust-3',
    nome: 'Fernanda Lima',
    telefone: '(11) 97654-3210',
    endereco: 'Rua Harmonia, 340',
    pedidosCount: 12,
    totalGasto: 310.00,
    ultimoPedidoData: '2026-08-28',
    preferidos: ['Pão Rústico Integral Multigrãos', 'Pão Australiano'],
    observacoes: 'Cliente fiel semanal todas as terças e sextas.'
  },
  {
    id: 'cust-4',
    nome: 'Juliana Costa',
    telefone: '(11) 98222-1133',
    endereco: 'Retirada no Ateliê',
    pedidosCount: 3,
    totalGasto: 74.00,
    ultimoPedidoData: '2026-08-20',
    preferidos: ['Pão Doce Trançado com Canela']
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    nome: 'Farinha de Trigo Especial Tipo 1 (Alta Proteína)',
    categoria: 'Farinhas & Grãos',
    quantidadeAtual: 14.5,
    quantidadeMinima: 10,
    unidade: 'kg',
    custoUnitario: 8.50,
    statusAlerta: 'normal',
    ultimaAtualizacao: '2026-08-28',
    fornecedor: 'Moinho Paulista'
  },
  {
    id: 'inv-2',
    nome: 'Farinha de Trigo Integral Orgânica',
    categoria: 'Farinhas & Grãos',
    quantidadeAtual: 3.2,
    quantidadeMinima: 5,
    unidade: 'kg',
    custoUnitario: 12.00,
    statusAlerta: 'baixo',
    ultimaAtualizacao: '2026-08-28',
    fornecedor: 'Bio Grãos'
  },
  {
    id: 'inv-3',
    nome: 'Fermento Biológico Seco Instantâneo',
    categoria: 'Fermentos & Leveduras',
    quantidadeAtual: 0.25,
    quantidadeMinima: 0.5,
    unidade: 'kg',
    custoUnitario: 35.00,
    statusAlerta: 'critico',
    ultimaAtualizacao: '2026-08-28',
    fornecedor: 'Distribuidora Panificação'
  },
  {
    id: 'inv-4',
    nome: 'Manteiga Extra sem Sal (82% gordura)',
    categoria: 'Laticínios & Ovos',
    quantidadeAtual: 1.8,
    quantidadeMinima: 3.0,
    unidade: 'kg',
    custoUnitario: 42.00,
    statusAlerta: 'baixo',
    ultimaAtualizacao: '2026-08-27',
    fornecedor: 'Laticínios Serra'
  },
  {
    id: 'inv-5',
    nome: 'Ovos Caipiras Selecionados',
    categoria: 'Laticínios & Ovos',
    quantidadeAtual: 24,
    quantidadeMinima: 30,
    unidade: 'un',
    custoUnitario: 1.10,
    statusAlerta: 'baixo',
    ultimaAtualizacao: '2026-08-28',
    fornecedor: 'Granja Esperança'
  },
  {
    id: 'inv-6',
    nome: 'Queijo Canastra Meia Cura / Curado',
    categoria: 'Laticínios & Ovos',
    quantidadeAtual: 2.5,
    quantidadeMinima: 2.0,
    unidade: 'kg',
    custoUnitario: 75.00,
    statusAlerta: 'normal',
    ultimaAtualizacao: '2026-08-26',
    fornecedor: 'Queijaria do Vale'
  },
  {
    id: 'inv-7',
    nome: 'Azeite de Oliva Extravirgem',
    categoria: 'Temperos & Sal',
    quantidadeAtual: 3.0,
    quantidadeMinima: 2.0,
    unidade: 'L',
    custoUnitario: 55.00,
    statusAlerta: 'normal',
    ultimaAtualizacao: '2026-08-25'
  },
  {
    id: 'inv-8',
    nome: 'Sacos Kraft c/ Visor para Pão Artesanal',
    categoria: 'Embalagens',
    quantidadeAtual: 18,
    quantidadeMinima: 50,
    unidade: 'un',
    custoUnitario: 1.40,
    statusAlerta: 'critico',
    ultimaAtualizacao: '2026-08-28',
    fornecedor: 'Pack Arte'
  }
];

export const INITIAL_AUTHORIZED_USERS: AuthorizedUser[] = [
  {
    email: 'oleonardofischer@gmail.com',
    nome: 'Leonardo Fischer',
    cargo: 'Administrador',
    ativo: true
  },
  {
    email: 'tati.paoartesanal@gmail.com',
    nome: 'Tati Padeiro(a)',
    cargo: 'Padeiro(a)',
    ativo: true
  }
];

export const INITIAL_EMAIL_SETTINGS: EmailSettings = {
  emailDestinatario: 'oleonardofischer@gmail.com',
  horarioEnvio: '22:00',
  ativarEnvioAutomatico: true,
  incluirEstoqueBaixo: true
};
