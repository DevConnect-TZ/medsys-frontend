'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { InvoiceReceiptModal } from '@/components/InvoiceReceiptModal';
import { ArrowLeft, FileText, CheckCircle, Clock, CreditCard, ReceiptText, X } from 'lucide-react';
import Link from 'next/link';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string;
  visit_id?: number;
  appointment_id?: number;
  invoice_date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method?: string;
  amount_paid?: number;
  payment_date?: string;
  paid_at?: string;
}

function normalizeInvoiceItem(item: unknown): InvoiceItem | null {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const candidate = item as Record<string, unknown>;

  return {
    description: String(candidate.description || ''),
    quantity: Number(candidate.quantity || 0) || 0,
    unit_price: Number(candidate.unit_price || 0) || 0,
    total: Number(candidate.total || 0) || 0,
  };
}

function normalizeInvoice(raw: unknown): Invoice | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (candidate.data && typeof candidate.data === 'object') {
    return normalizeInvoice(candidate.data);
  }
  
  // Handle items - could be array, string (JSON), or missing
  let rawItems: unknown[] = [];
  if (Array.isArray(candidate.items)) {
    rawItems = candidate.items;
  } else if (typeof candidate.items === 'string' && candidate.items) {
    try {
      const parsed = JSON.parse(candidate.items);
      rawItems = Array.isArray(parsed) ? parsed : [];
    } catch {
      rawItems = [];
    }
  }

  // Safely map and filter items
  let items: InvoiceItem[] = [];
  if (rawItems && Array.isArray(rawItems)) {
    items = rawItems
      .map(normalizeInvoiceItem)
      .filter((item): item is InvoiceItem => item !== null);
  }

  return {
    id: Number(candidate.id) || 0,
    invoice_number: String(candidate.invoice_number || ''),
    patient_id: Number(candidate.patient_id) || 0,
    patient_name: String(candidate.patient_name || ''),
    visit_id: candidate.visit_id ? Number(candidate.visit_id) : undefined,
    appointment_id: candidate.appointment_id ? Number(candidate.appointment_id) : undefined,
    invoice_date: String(candidate.invoice_date || ''),
    items,
    subtotal: Number(candidate.subtotal || 0) || 0,
    tax: Number(candidate.tax || 0) || 0,
    discount: Number(candidate.discount || 0) || 0,
    total: Number(candidate.total || 0) || 0,
    status: (candidate.status === 'paid' || candidate.status === 'cancelled') 
      ? candidate.status 
      : 'pending',
    payment_method: candidate.payment_method ? String(candidate.payment_method) : undefined,
    amount_paid: candidate.amount_paid !== undefined ? Number(candidate.amount_paid) || undefined : undefined,
    payment_date: candidate.payment_date ? String(candidate.payment_date) : undefined,
    paid_at: candidate.paid_at ? String(candidate.paid_at) : undefined,
  };
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment modal state
  const [showModal, setShowModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  const fetchInvoice = useCallback(async () => {
    if (!id) {
      setError('Invalid invoice ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log('[InvoiceDetail] Fetching invoice:', id);
      const response = await apiClient.getInvoice<Invoice>(Number(id));
      console.log('[InvoiceDetail] API Response:', response);
      
      // Handle wrapped response shapes from different backend/resource combinations.
      const data =
        (response as { invoice?: unknown })?.invoice ||
        (response as { data?: unknown })?.data ||
        response;
      
      console.log('[InvoiceDetail] Extracted data:', data);
      
      const normalizedInvoice = normalizeInvoice(data);
      if (!normalizedInvoice || !normalizedInvoice.id) {
        throw new Error('Invoice not found');
      }
      setInvoice(normalizedInvoice);
      setAmountPaid(String(normalizedInvoice.total));
      setError('');
    } catch (err) {
      setError('Failed to load invoice');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (id) {
      fetchInvoice();
    }
  }, [fetchInvoice, id, router]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setProcessing(true);
    try {
      const response = await apiClient.payInvoice<{ invoice?: Invoice; data?: Invoice }>(invoice.id, {
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid),
        payment_date: paymentDate,
      });
      const paidInvoice = normalizeInvoice(response.invoice || response.data || {
        ...invoice,
        status: 'paid',
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid),
        payment_date: paymentDate,
      });
      setShowModal(false);
      setInvoice(paidInvoice);
      setShowReceipt(true);
      fetchInvoice();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to process payment'));
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status === 'paid' || status === 'cancelled' ? status : 'pending';
    const styles: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const icons: Record<string, React.ReactNode> = {
      paid: <CheckCircle size={14} />,
      pending: <Clock size={14} />,
      cancelled: <FileText size={14} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[normalizedStatus]}`}>
        {icons[normalizedStatus]}
        {normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto p-6">
          <p className="text-gray-600 text-center py-8">Loading invoice...</p>
        </main>
      </Layout>
    );
  }

  if (error || !invoice) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto p-6">
          <Alert type="error" message={error || 'Invoice not found'} />
          <Link href="/invoices">
            <Button variant="outline" className="mt-4">
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </Link>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FileText size={32} />
                Invoice {invoice.invoice_number}
              </h1>
              <p className="text-gray-600 mt-1">{formatDate(invoice.invoice_date)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {getStatusBadge(invoice.status)}
            {invoice.status === 'pending' && user?.role === 'cashier' && (
              <Button variant="primary" onClick={() => setShowModal(true)}>
                <CreditCard size={18} className="mr-2" />
                Process Payment
              </Button>
            )}
            {invoice.status === 'paid' && (
              <Button variant="outline" onClick={() => setShowReceipt(true)}>
                <ReceiptText size={18} className="mr-2" />
                Receipt
              </Button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-gray-900">{invoice.patient_name}</p>
              <p className="text-sm text-gray-600">ID: #{invoice.patient_id}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Invoice Number</p>
              <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
              <p className="text-sm text-gray-600 mt-2">Date</p>
              <p className="font-semibold text-gray-900">{formatDate(invoice.invoice_date)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment Info</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.status === 'paid' ? (
                <>
                  <p className="text-sm text-gray-600">Method</p>
                  <p className="font-semibold text-gray-900 capitalize">{invoice.payment_method}</p>
                  <p className="text-sm text-gray-600 mt-2">Amount Paid</p>
                  <p className="font-semibold text-green-700">{formatCurrency(invoice.amount_paid || 0)}</p>
                  <p className="text-sm text-gray-600 mt-2">Paid On</p>
                  <p className="font-semibold text-gray-900">{formatDate(invoice.payment_date)}</p>
                </>
              ) : (
                <p className="text-gray-600">Awaiting payment</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Qty</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Unit Price</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-gray-900">{item.description}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(item.unit_price)}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax</span>
                  <span>{formatCurrency(invoice.tax)}</span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Process Payment</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleProcessPayment} className="p-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">Invoice</p>
                  <p className="font-semibold text-gray-900">{invoice.invoice_number}</p>
                  <p className="text-sm text-gray-600 mt-1">Patient: {invoice.patient_name}</p>
                  <p className="text-lg font-bold text-blue-700 mt-2">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <Input
                  label="Amount Paid (Tshs)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                />

                <Input
                  label="Payment Date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" isLoading={processing}>
                    Confirm Payment
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showReceipt && (
          <InvoiceReceiptModal
            invoice={invoice}
            cashierName={user?.name}
            onClose={() => setShowReceipt(false)}
          />
        )}
      </main>
    </Layout>
  );
}
