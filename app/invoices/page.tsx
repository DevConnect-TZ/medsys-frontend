'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface Invoice {
  id: number;
  invoice_number: string;
  patient_id: number;
  patient_name: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  description: string;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchInvoices();
  }, [router]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data?: Invoice[] }>('/billing/invoices');
      setInvoices(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load invoices');
      console.error(err);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
          <Button variant="primary" className="flex items-center gap-2">
            <FileText size={20} />
            Create Invoice
          </Button>
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
                    {formatCurrency(
                      invoices
                        .filter((inv) => inv.status === 'paid')
                        .reduce((sum, inv) => sum + inv.amount, 0)
                    )}
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
                        .reduce((sum, inv) => sum + inv.amount, 0)
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
              All Invoices ({invoices.length})
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
                        Issue Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Due Date
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
                          {formatCurrency(invoice.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(invoice.status)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invoice.issue_date)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(invoice.due_date)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                            {invoice.status === 'pending' && (
                              <Button variant="primary" size="sm">
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
