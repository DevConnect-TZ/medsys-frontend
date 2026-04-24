'use client';

import { Button } from '@/components/Button';
import { InvoiceReceipt } from '@/components/InvoiceReceipt';
import { downloadReceipt, printReceipt, type ReceiptInvoice } from '@/lib/receipt';
import { Download, Printer, X } from 'lucide-react';
import { useState } from 'react';

interface InvoiceReceiptModalProps {
  invoice: ReceiptInvoice;
  cashierName?: string;
  onClose: () => void;
}

export function InvoiceReceiptModal({ invoice, cashierName, onClose }: InvoiceReceiptModalProps) {
  const [busyAction, setBusyAction] = useState<'print' | 'download' | null>(null);
  const [error, setError] = useState('');

  const handlePrint = async () => {
    try {
      setBusyAction('print');
      setError('');
      await printReceipt(invoice, cashierName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print receipt');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownload = async () => {
    try {
      setBusyAction('download');
      setError('');
      await downloadReceipt(invoice, cashierName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download receipt');
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Receipt Ready</h2>
            <p className="mt-1 text-sm text-slate-600">Print it now or download a copy for the patient.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <InvoiceReceipt invoice={invoice} cashierName={cashierName} />
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 md:flex-row md:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={handleDownload} isLoading={busyAction === 'download'}>
            <Download size={16} className="mr-2" />
            Download Receipt
          </Button>
          <Button onClick={handlePrint} isLoading={busyAction === 'print'}>
            <Printer size={16} className="mr-2" />
            Print Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
