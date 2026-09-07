import { Order, InventoryItem } from '../types';

export interface DailyReportData {
  tomorrowDateFormatted: string; // e.g. "29/08/2026"
  tomorrowIsoDate: string;
  tomorrowOrders: Order[];
  lowStockItems: InventoryItem[];
  recipientEmail: string;
}

export async function sendDailyBakingEmail(
  token: string,
  reportData: DailyReportData
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { tomorrowDateFormatted, tomorrowOrders, lowStockItems, recipientEmail } = reportData;

    // Calculate bread recipe counts
    const recipeCounts: Record<string, number> = {};
    let totalLoaves = 0;
    let totalRevenue = 0;

    tomorrowOrders.forEach(order => {
      totalRevenue += order.valorTotal;
      order.itens.forEach(item => {
        recipeCounts[item.nome] = (recipeCounts[item.nome] || 0) + item.quantidade;
        totalLoaves += item.quantidade;
      });
    });

    const subject = `🥖 [Padaria da Tati] Produção e Entregas de Amanhã (${tomorrowDateFormatted}) + Alertas de Insumos`;

    const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #fdfaf6; color: #2d241e; margin: 0; padding: 20px; line-height: 1.5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #ebd9c8; box-shadow: 0 4px 12px rgba(180,83,9,0.08); }
    .header { background: linear-gradient(135deg, #b45309, #d97706); color: #ffffff; padding: 24px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; opacity: 0.95; font-size: 14px; }
    .content { padding: 20px; }
    .card { background: #fffaf0; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin-bottom: 18px; }
    .card-title { font-size: 16px; font-weight: bold; color: #92400e; margin-top: 0; margin-bottom: 10px; display: flex; align-items: center; }
    .metric-grid { display: flex; gap: 10px; margin-bottom: 12px; }
    .metric { flex: 1; background: #ffffff; border: 1px solid #fef3c7; border-radius: 6px; padding: 10px; text-align: center; }
    .metric-val { font-size: 20px; font-weight: bold; color: #b45309; }
    .metric-label { font-size: 11px; color: #78350f; text-transform: uppercase; }
    .recipe-list { list-style: none; padding: 0; margin: 0; }
    .recipe-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #fcd34d; font-size: 14px; }
    .recipe-item:last-child { border-bottom: none; }
    .recipe-qty { font-weight: bold; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 999px; font-size: 13px; }
    .order-card { background: #ffffff; border: 1px solid #e7e5e4; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
    .order-header { display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin-bottom: 4px; color: #44403c; }
    .order-sub { font-size: 12px; color: #78716c; margin-bottom: 6px; }
    .order-items { font-size: 13px; color: #1c1917; background: #fafaf9; padding: 6px 10px; border-radius: 4px; }
    .badge-paid { color: #15803d; background: #dcfce7; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-pending { color: #b45309; background: #fef3c7; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .alert-card { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-top: 18px; }
    .alert-title { font-size: 15px; font-weight: bold; color: #b91c1c; margin-top: 0; margin-bottom: 8px; }
    .alert-item { font-size: 13px; color: #7f1d1d; margin-bottom: 4px; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #a8a29e; border-top: 1px solid #f5f5f4; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🥖 Padaria Artesanal da Tati</h1>
      <p>Planejamento de Produção & Entregas de Amanhã (${tomorrowDateFormatted})</p>
    </div>

    <div class="content">
      <!-- Summary Metrics -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
        <tr>
          <td width="33%" style="padding: 4px;">
            <div class="metric" style="background:#fffaf0; border:1px solid #fde68a; border-radius:6px; padding:10px; text-align:center;">
              <div class="metric-val" style="font-size:20px; font-weight:bold; color:#b45309;">${tomorrowOrders.length}</div>
              <div class="metric-label" style="font-size:11px; color:#78350f;">Pedidos</div>
            </div>
          </td>
          <td width="33%" style="padding: 4px;">
            <div class="metric" style="background:#fffaf0; border:1px solid #fde68a; border-radius:6px; padding:10px; text-align:center;">
              <div class="metric-val" style="font-size:20px; font-weight:bold; color:#b45309;">${totalLoaves}</div>
              <div class="metric-label" style="font-size:11px; color:#78350f;">Pães / Unidades</div>
            </div>
          </td>
          <td width="33%" style="padding: 4px;">
            <div class="metric" style="background:#fffaf0; border:1px solid #fde68a; border-radius:6px; padding:10px; text-align:center;">
              <div class="metric-val" style="font-size:20px; font-weight:bold; color:#15803d;">R$ ${totalRevenue.toFixed(2).replace('.', ',')}</div>
              <div class="metric-label" style="font-size:11px; color:#166534;">Previsto</div>
            </div>
          </td>
        </tr>
      </table>

      <!-- Fornada / Recipe List -->
      <div class="card">
        <div class="card-title">🔥 Fornada & Receitas para Assar</div>
        ${
          Object.keys(recipeCounts).length === 0
            ? '<p style="font-size:13px; color:#78716c; margin:0;">Nenhum pão agendado para amanhã ainda.</p>'
            : Object.entries(recipeCounts)
                .map(
                  ([name, qty]) => `
          <div class="recipe-item">
            <span>${name}</span>
            <span class="recipe-qty">${qty}x un</span>
          </div>`
                )
                .join('')
        }
      </div>

      <!-- Orders List -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 15px; color: #44403c; margin-bottom: 8px;">📦 Lista de Encomendas & Clientes (${tomorrowOrders.length})</h3>
        ${
          tomorrowOrders.length === 0
            ? '<p style="font-size:13px; color:#78716c;">Nenhum pedido cadastrado para entrega nesta data.</p>'
            : tomorrowOrders
                .map(
                  (order, idx) => `
          <div class="order-card">
            <div class="order-header">
              <span>#${idx + 1} - ${order.clienteNome}</span>
              <span>R$ ${order.valorTotal.toFixed(2).replace('.', ',')} <span class="${order.pago ? 'badge-paid' : 'badge-pending'}">${order.pago ? 'PAGO' : 'A RECEBER'}</span></span>
            </div>
            <div class="order-sub">
              📍 ${order.tipoEntrega === 'retirada' ? 'Retirada no Balcão' : order.clienteEndereco || 'Entrega'} | 🕒 Turno: ${order.horarioEntrega.toUpperCase()} | 📞 ${order.clienteTelefone || 'Sem tel'}
            </div>
            <div class="order-items">
              ${order.itens.map(it => `<b>${it.quantidade}x</b> ${it.nome}`).join(' + ')}
              ${order.observacoes ? `<br><i style="color:#b45309;">Obs: ${order.observacoes}</i>` : ''}
            </div>
          </div>`
                )
                .join('')
        }
      </div>

      <!-- Low Stock Alerts -->
      ${
        lowStockItems.length > 0
          ? `
      <div class="alert-card">
        <div class="alert-title">⚠️ Lembrete de Compra de Matérias-Primas</div>
        <p style="font-size:12px; color:#991b1b; margin-top:0; margin-bottom:8px;">Os seguintes insumos estão abaixo do estoque mínimo ou esgotando:</p>
        ${lowStockItems
          .map(
            item => `
          <div class="alert-item">
            • <b>${item.nome}</b>: Restam <b>${item.quantidadeAtual}${item.unidade}</b> (Mínimo recomendado: ${item.quantidadeMinima}${item.unidade})
          </div>`
          )
          .join('')}
      </div>`
          : `
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; font-size:13px; color:#166534;">
        ✅ <b>Estoque em dia!</b> Todos os insumos principais possuem quantidade suficiente para as próximas fornadas.
      </div>`
      }
    </div>

    <div class="footer">
      Enviado automaticamente pelo Sistema de Gestão da Padaria Artesanal da Tati às 22:00.<br>
      Sincronizado diretamente com a sua planilha Google Sheets.
    </div>
  </div>
</body>
</html>
    `;

    // Construct raw MIME email message
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    const messageParts = [
      `To: ${recipientEmail}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      bodyHtml
    ];
    const message = messageParts.join('\r\n');

    // Gmail requires base64url encoding (replace + with -, / with _, and remove =)
    const encodedMessage = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedMessage
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Erro ao enviar e-mail pelo Gmail: ${res.statusText}`);
    }

    const data = await res.json();
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error('Erro no envio do e-mail:', error);
    return { success: false, error: error.message || 'Falha ao enviar e-mail via Gmail API' };
  }
}
