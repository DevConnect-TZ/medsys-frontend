'use client';

import Image from 'next/image';
import { formatPaymentMethod, formatReceiptCurrency, formatReceiptDate, formatReceiptDateTime, type ReceiptInvoice } from '@/lib/receipt';

interface InvoiceReceiptProps {
  invoice: ReceiptInvoice;
  cashierName?: string;
}

export function InvoiceReceipt({ invoice, cashierName }: InvoiceReceiptProps) {
  const items = invoice.items || [];

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.18),transparent_30%),linear-gradient(135deg,#ecfeff,#f8fafc_55%,#ffffff)] px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl border border-teal-200/70 bg-white p-2 shadow-sm">
              <Image src="/logo.png" alt="System logo" width={64} height={64} className="h-16 w-16 object-contain" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">Payment Receipt</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Medical Billing Receipt</h2>
              <p className="mt-1 text-sm text-slate-600">Receipt No. {invoice.invoice_number}</p>
            </div>
          </div>
          <span className="inline-flex w-fit rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            Paid
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Patient</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{invoice.patient_name}</p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Patient ID: #{invoice.patient_id}</p>
              <p>Invoice Date: {formatReceiptDate(invoice.invoice_date)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Payment</p>
            <p className="mt-2 text-xl font-bold text-slate-900">
              {formatReceiptCurrency(invoice.amount_paid ?? invoice.total)}
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>Method: {formatPaymentMethod(invoice.payment_method)}</p>
              <p>Payment Date: {formatReceiptDate(invoice.payment_date)}</p>
              <p>Confirmed At: {formatReceiptDateTime(invoice.paid_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Description</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Qty</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Unit Price</th>
                <th className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.description}-${index}`} className="border-b border-slate-100">
                  <td className="px-3 py-3 text-sm text-slate-900">{item.description}</td>
                  <td className="px-3 py-3 text-right text-sm text-slate-700">{item.quantity}</td>
                  <td className="px-3 py-3 text-right text-sm text-slate-700">{formatReceiptCurrency(item.unit_price)}</td>
                  <td className="px-3 py-3 text-right text-sm font-semibold text-slate-900">{formatReceiptCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 ml-auto grid max-w-xs gap-3">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Subtotal</span>
            <span>{formatReceiptCurrency(invoice.subtotal ?? invoice.total)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Tax</span>
            <span>{formatReceiptCurrency(invoice.tax ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Discount</span>
            <span>-{formatReceiptCurrency(invoice.discount ?? 0)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
            <span>Total Paid</span>
            <span>{formatReceiptCurrency(invoice.amount_paid ?? invoice.total)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t border-dashed border-slate-200 pt-4 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <p>Processed by: {cashierName || 'Cashier'}</p>
          <p>This receipt confirms payment for the invoice above.</p>
        </div>
      </div>
    </div>
  );
}
