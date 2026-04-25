'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { usePermission } from '@/hooks/usePermission';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { InvoiceReceiptModal } from '@/components/InvoiceReceiptModal';
import { CreditCard, DollarSign, Clock, CheckCircle, FileText, X } from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string;
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  invoice_date: string;
  items?: { description: string; quantity: number; unit_price: number; total: number }[];
  payment_method?: string;
  amount_paid?: number;
  payment_date?: string;
}

function normalizeInvoiceItem(raw: unknown): { description: string; quantity: number; unit_price: number; total: number } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

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
  const id = Number(candidate.id);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

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

  return {
    id,
    invoice_number: String(candidate.invoice_number || ''),
    patient_id: Number(candidate.patient_id || 0) || 0,
    patient_name: String(candidate.patient_name || ''),
    total: Number(candidate.total || 0) || 0,
    status:
      candidate.status === 'paid' || candidate.status === 'cancelled'
        ? candidate.status
        : 'pending',
    invoice_date: String(candidate.invoice_date || ''),
    items: rawItems
      .map((item) => normalizeInvoiceItem(item))
      .filter((item): item is { description: string; quantity: number; unit_price: number; total: number } => item !== null),
    payment_method: candidate.payment_method ? String(candidate.payment_method) : undefined,
    amount_paid: Number(candidate.amount_paid || 0) || 0,
    payment_date: candidate.payment_date ? String(candidate.payment_date) : undefined,
  };
}

function isPharmacyInvoice(invoice: Invoice): boolean {
  return (invoice.items || []).some((item) => item.description.startsWith('Medicine:'));
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { can } = usePermission();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null);
  const canProcessPayments = can('process_payments');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const status = activeTab === 'pending' ? 'pending' : 'paid';
      const response = await apiClient.getInvoices<Invoice>(1, { status, per_page: 100 });
      const normalizedInvoices = (response.data || [])
        .map((invoice) => normalizeInvoice(invoice))
        .filter((invoice): invoice is Invoice => invoice !== null)
        .filter((invoice) => (user?.role === 'pharmacist' ? isPharmacyInvoice(invoice) : true));
      setInvoices(normalizedInvoices);
      setError('');
    } catch (err) {
      setError('Failed to load invoices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, user?.role]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchInvoices();
  }, [fetchInvoices, router]);

  const openPaymentModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setAmountPaid(String(invoice.total));
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setShowModal(true);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setProcessing(true);
    try {
      const response = await apiClient.payInvoice<{ invoice?: Invoice; data?: Invoice }>(selectedInvoice.id, {
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid),
        payment_date: paymentDate,
      });
      const paidInvoice = response.invoice || response.data || {
        ...selectedInvoice,
        status: 'paid',
        payment_method: paymentMethod,
        amount_paid: Number(amountPaid),
        payment_date: paymentDate,
      };
      setShowModal(false);
      setSelectedInvoice(null);
      setReceiptInvoice(paidInvoice);
      fetchInvoices();
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
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
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={32} />
              Payments
            </h1>
            <p className="text-gray-600 mt-2">Process payments and view transaction history</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab('pending')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'pending'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock size={18} />
                Forwarded Orders ({activeTab === 'pending' ? invoices.length : '–'})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CheckCircle size={18} />
                Payment History ({activeTab === 'history' ? invoices.length : '–'})
              </button>
            </nav>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    {activeTab === 'pending' ? 'Total Pending' : 'Total Collected'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      invoices.reduce((sum, inv) => {
                        const amount = activeTab === 'history' && typeof inv.amount_paid === 'number' && inv.amount_paid > 0
                          ? inv.amount_paid
                          : inv.total;
                        return sum + amount;
                      }, 0)
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <DollarSign size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Count</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <FileText size={24} className="text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'pending' ? 'Forwarded Orders Awaiting Payment' : 'Payment History'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : invoices.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                {activeTab === 'pending'
                  ? 'No forwarded orders awaiting payment'
                  : 'No payment history found'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Invoice #</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      {activeTab === 'history' && (
                        <>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Paid Date</th>
                        </>
                      )}
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-900 font-medium">{invoice.invoice_number}</td>
                        <td className="py-3 px-4 text-gray-900">{invoice.patient_name}</td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">{formatCurrency(invoice.total)}</td>
                        <td className="py-3 px-4">{getStatusBadge(invoice.status)}</td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(invoice.invoice_date)}</td>
                        {activeTab === 'history' && (
                          <>
                            <td className="py-3 px-4 text-gray-600 capitalize">{invoice.payment_method || '—'}</td>
                            <td className="py-3 px-4 text-gray-600">{formatDate(invoice.payment_date)}</td>
                          </>
                        )}
                        <td className="py-3 px-4">
                          {activeTab === 'pending' && canProcessPayments ? (
                            <Button variant="primary" size="sm" onClick={() => openPaymentModal(invoice)}>
                              <CreditCard size={14} className="mr-1" />
                              Process
                            </Button>
                          ) : (
                            <div className="flex gap-2">
                              <Link href={`/invoices/${invoice.id}`}>
                                <Button variant="outline" size="sm">
                                  {activeTab === 'pending' ? 'Review' : 'View'}
                                </Button>
                              </Link>
                              {activeTab === 'history' && (
                                <Button variant="secondary" size="sm" onClick={() => setReceiptInvoice(invoice)}>
                                  Receipt
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Modal */}
        {showModal && selectedInvoice && (
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
                  <p className="font-semibold text-gray-900">{selectedInvoice.invoice_number}</p>
                  <p className="text-sm text-gray-600 mt-1">Patient: {selectedInvoice.patient_name}</p>
                  <p className="text-lg font-bold text-blue-700 mt-2">
                    {formatCurrency(selectedInvoice.total)}
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

        {receiptInvoice && (
          <InvoiceReceiptModal
            invoice={receiptInvoice}
            cashierName={user?.name}
            onClose={() => setReceiptInvoice(null)}
          />
        )}
      </main>
    </Layout>
  );
}
