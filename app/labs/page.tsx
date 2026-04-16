'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { FlaskConical, CheckCircle, Clock, AlertCircle, ArrowLeft } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import Link from 'next/link';

interface LabOrder {
  id: number;
  patient_name: string;
  test_name: string;
  test_type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  order_date: string;
  cost: number;
  appointment_id?: number;
}

export default function LabsPage() {
  return (
    <Suspense fallback={<Layout><main className="max-w-7xl mx-auto p-6"><p className="text-gray-600 text-center py-8">Loading...</p></main></Layout>}>
      <LabsPageContent />
    </Suspense>
  );
}

function LabsPageContent() {
  const router = useRouter();
  const { can } = usePermission();
  const searchParams = useSearchParams();
  const appointmentId = searchParams.get('appointment_id');
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchLabOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (appointmentId) params.appointment_id = appointmentId;
      const response = await apiClient.get<{ data?: LabOrder[] }>('/labs/orders', params);
      setLabOrders(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load lab orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchLabOrders();
  }, [fetchLabOrders, router]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock size={14} />,
      in_progress: <AlertCircle size={14} />,
      completed: <CheckCircle size={14} />,
      cancelled: <AlertCircle size={14} />,
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[status]}`}>
        {icons[status]}
        {status.replace('_', ' ')}
      </span>
    );
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            {appointmentId && (
              <Link href={`/appointments/${appointmentId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft size={18} />
                </Button>
              </Link>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical size={32} />
                Laboratory
              </h1>
              <p className="text-gray-600 mt-2">
                {appointmentId ? `Lab orders for appointment #${appointmentId}` : 'Manage lab orders and results'}
              </p>
            </div>
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

        <Card>
          <CardHeader>
            <CardTitle>Lab Orders ({labOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : labOrders.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No lab orders found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Test</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Cost</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labOrders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">{order.patient_name}</td>
                        <td className="py-3 px-4">{order.test_name}</td>
                        <td className="py-3 px-4">{order.test_type || '—'}</td>
                        <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                        <td className="py-3 px-4">Tshs {Number(order.cost).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            {order.status === 'pending' && can('create_lab_results') && (
                              <Link href={`/labs/orders/${order.id}/results`}>
                                <Button variant="primary" size="sm">
                                  Add Results
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
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
