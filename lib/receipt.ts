export interface ReceiptItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface ReceiptInvoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string;
  invoice_date: string;
  items?: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  discount?: number;
  total: number;
  payment_method?: string;
  amount_paid?: number;
  payment_date?: string;
  paid_at?: string;
}

export function formatReceiptCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatReceiptDate(dateString?: string) {
  if (!dateString) return '—';

  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatReceiptDateTime(dateString?: string) {
  if (!dateString) return '—';

  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatPaymentMethod(paymentMethod?: string) {
  if (!paymentMethod) return '—';
  return paymentMethod
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function toDataUrl(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read logo'));
    reader.readAsDataURL(blob);
  });
}

async function resolveReceiptLogo() {
  if (typeof window === 'undefined') return '/logo.png';

  const logoUrl = `${window.location.origin}/logo.png`;

  try {
    return await toDataUrl(logoUrl);
  } catch {
    return logoUrl;
  }
}

export async function buildReceiptHtml(invoice: ReceiptInvoice, cashierName?: string) {
  const logoSrc = await resolveReceiptLogo();
  const items = invoice.items || [];

  const rows = items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td class="num">${item.quantity}</td>
          <td class="num">${escapeHtml(formatReceiptCurrency(item.unit_price))}</td>
          <td class="num strong">${escapeHtml(formatReceiptCurrency(item.total))}</td>
        </tr>
      `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt ${escapeHtml(invoice.invoice_number)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #0f172a;
      --muted: #64748b;
      --line: #dbe4ef;
      --panel: #f8fafc;
      --accent: #0f766e;
      --accent-soft: #ecfeff;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 32px;
      background: #eef4f7;
      color: var(--ink);
      font-family: "Segoe UI", Arial, sans-serif;
    }

    .sheet {
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--line);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
    }

    .hero {
      padding: 28px 32px;
      background:
        radial-gradient(circle at top right, rgba(13, 148, 136, 0.18), transparent 32%),
        linear-gradient(135deg, #ecfeff, #f8fafc 55%, #ffffff);
      border-bottom: 1px solid var(--line);
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: center;
    }

    .brand {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .brand img {
      width: 68px;
      height: 68px;
      object-fit: contain;
      border-radius: 18px;
      border: 1px solid rgba(15, 118, 110, 0.18);
      background: #ffffff;
      padding: 8px;
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      line-height: 1.1;
    }

    .sub {
      margin-top: 8px;
      color: var(--muted);
      font-size: 14px;
    }

    .status {
      background: var(--accent-soft);
      color: var(--accent);
      border: 1px solid rgba(13, 148, 136, 0.16);
      border-radius: 999px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      white-space: nowrap;
    }

    .content {
      padding: 32px;
    }

    .meta {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 18px;
    }

    .label {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .value {
      font-size: 20px;
      font-weight: 700;
    }

    .stack {
      margin-top: 10px;
      display: grid;
      gap: 8px;
      color: var(--ink);
      font-size: 14px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th, td {
      padding: 14px 12px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      font-size: 14px;
    }

    th {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 11px;
    }

    .num {
      text-align: right;
    }

    .strong {
      font-weight: 700;
    }

    .totals {
      margin-top: 20px;
      margin-left: auto;
      width: 100%;
      max-width: 320px;
      display: grid;
      gap: 12px;
    }

    .totals .row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: var(--muted);
      font-size: 14px;
    }

    .totals .grand {
      padding-top: 14px;
      border-top: 1px solid var(--line);
      color: var(--ink);
      font-size: 18px;
      font-weight: 700;
    }

    .footer {
      margin-top: 28px;
      padding-top: 18px;
      border-top: 1px dashed var(--line);
      display: flex;
      justify-content: space-between;
      gap: 24px;
      color: var(--muted);
      font-size: 13px;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }

      .sheet {
        max-width: none;
        border: none;
        border-radius: 0;
        box-shadow: none;
      }
    }

    @media (max-width: 700px) {
      body { padding: 12px; }
      .hero, .content { padding: 20px; }
      .hero { flex-direction: column; align-items: flex-start; }
      .meta { grid-template-columns: 1fr; }
      .footer { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="hero">
      <div class="brand">
        <img src="${logoSrc}" alt="System logo" />
        <div>
          <div class="eyebrow">Payment Receipt</div>
          <h1>Medical Billing Receipt</h1>
          <div class="sub">Receipt No. ${escapeHtml(invoice.invoice_number)}</div>
        </div>
      </div>
      <div class="status">Paid</div>
    </div>

    <div class="content">
      <div class="meta">
        <div class="panel">
          <div class="label">Patient</div>
          <div class="value">${escapeHtml(invoice.patient_name)}</div>
          <div class="stack">
            <div>Patient ID: #${invoice.patient_id}</div>
            <div>Invoice Date: ${escapeHtml(formatReceiptDate(invoice.invoice_date))}</div>
          </div>
        </div>
        <div class="panel">
          <div class="label">Payment</div>
          <div class="value">${escapeHtml(formatReceiptCurrency(invoice.amount_paid ?? invoice.total))}</div>
          <div class="stack">
            <div>Method: ${escapeHtml(formatPaymentMethod(invoice.payment_method))}</div>
            <div>Payment Date: ${escapeHtml(formatReceiptDate(invoice.payment_date))}</div>
            <div>Confirmed At: ${escapeHtml(formatReceiptDateTime(invoice.paid_at))}</div>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th class="num">Qty</th>
            <th class="num">Unit Price</th>
            <th class="num">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals">
        <div class="row"><span>Subtotal</span><span>${escapeHtml(formatReceiptCurrency(invoice.subtotal ?? invoice.total))}</span></div>
        <div class="row"><span>Tax</span><span>${escapeHtml(formatReceiptCurrency(invoice.tax ?? 0))}</span></div>
        <div class="row"><span>Discount</span><span>-${escapeHtml(formatReceiptCurrency(invoice.discount ?? 0))}</span></div>
        <div class="row grand"><span>Total Paid</span><span>${escapeHtml(formatReceiptCurrency(invoice.amount_paid ?? invoice.total))}</span></div>
      </div>

      <div class="footer">
        <div>Processed by: ${escapeHtml(cashierName || 'Cashier')}</div>
        <div>This receipt confirms payment for the invoice above.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function printReceipt(invoice: ReceiptInvoice, cashierName?: string) {
  if (typeof window === 'undefined') return;

  const receiptHtml = await buildReceiptHtml(invoice, cashierName);
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=900');

  if (!printWindow) {
    throw new Error('Unable to open print window');
  }

  printWindow.document.open();
  printWindow.document.write(receiptHtml);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

export async function downloadReceipt(invoice: ReceiptInvoice, cashierName?: string) {
  if (typeof window === 'undefined') return;

  const receiptHtml = await buildReceiptHtml(invoice, cashierName);
  const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `${invoice.invoice_number}-receipt.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
}
