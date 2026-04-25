'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { FileText, DollarSign, CheckCircle, Clock, Plus } from 'lucide-react';
import Link from 'next/link';

interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string;
  total: number;
  amount_paid?: number;
  status: 'pending' | 'paid' | 'cancelled';
  invoice_date: string;
  payment_date?: string;
}

function normalizeInvoice(raw: unknown): Invoice | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const normalizedId = Number(candidate.id);

  if (!Number.isFinite(normalizedId) || normalizedId <= 0) {
    return null;
  }

  return {
    id: normalizedId,
    invoice_number: String(candidate.invoice_number || ''),
    patient_id: Number(candidate.patient_id || 0) || 0,
    patient_name: String(candidate.patient_name || ''),
    total: Number(candidate.total || 0) || 0,
    amount_paid: Number(candidate.amount_paid || 0) || 0,
    status:
      candidate.status === 'paid' || candidate.status === 'cancelled'
        ? candidate.status
        : 'pending',
    invoice_date: String(candidate.invoice_date || ''),
    payment_date: candidate.payment_date ? String(candidate.payment_date) : undefined,
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const { can } = usePermission();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [paidRevenue, setPaidRevenue] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchInvoices(currentPage);
  }, [router, currentPage]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    fetchPaidRevenue();
  }, []);

  const fetchInvoices = async (page = 1) => {
    try {
      setLoading(true);
      const response = await apiClient.getInvoices<Invoice>(page, {
        status: 'pending',
      });
      const normalizedInvoices = (response.data || [])
        .map((invoice) => normalizeInvoice(invoice))
        .filter((invoice): invoice is Invoice => invoice !== null);
      setInvoices(normalizedInvoices);
      setLastPage(response.meta?.last_page || 1);
      setCurrentPage(response.meta?.current_page || 1);
      setError('');
    } catch (err) {
      setError('Failed to load invoices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaidRevenue = async () => {
    try {
      const response = await apiClient.getInvoices<Invoice>(1, {
        status: 'paid',
        per_page: 1000,
      });
      const paidInvoices = (response.data || [])
        .map((invoice) => normalizeInvoice(invoice))
        .filter((invoice): invoice is Invoice => invoice !== null);

      setPaidRevenue(
        paidInvoices.reduce((sum, invoice) => {
          const paidAmount = typeof invoice.amount_paid === 'number' && invoice.amount_paid > 0
            ? invoice.amount_paid
            : invoice.total;

          return sum + paidAmount;
        }, 0)
      );
    } catch (err) {
      console.error('Failed to load paid revenue', err);
      setPaidRevenue(0);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const icons = {
      paid: <CheckCircle size={14} />,
      pending: <Clock size={14} />,
      cancelled: <FileText size={14} />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600 mt-2">Manage billing and invoices</p>
          </div>
          {can('create_invoices') && (
            <Link href="/invoices/new">
              <Button variant="primary" className="flex items-center gap-2">
                <Plus size={20} />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError('')}
          />
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(paidRevenue)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(
                      invoices
                        .filter((inv) => inv.status === 'pending')
                        .reduce((sum, inv) => sum + inv.total, 0)
                    )}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock size={24} className="text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {invoices.length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={20} />
              Pending Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No invoices found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Invoice #
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Patient
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr
                        key={invoice.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {invoice.invoice_number}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {invoice.patient_name}
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">
                          {formatCurrency(invoice.total)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="inline-flex items-center rounded-lg border-2 border-blue-600 px-3 py-1 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                              View
                            </Link>
                            {invoice.status === 'pending' && can('process_payments') && (
                              <Link href="/payments">
                                <Button variant="primary" size="sm">
                                  Mark Paid
                                </Button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {lastPage > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {lastPage}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(lastPage, p + 1))}
                  disabled={currentPage >= lastPage}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
