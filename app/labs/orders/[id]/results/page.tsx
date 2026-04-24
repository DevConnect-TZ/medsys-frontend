'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import Link from 'next/link';

interface LabOrderDetail {
  patient_name?: string;
  test_name?: string;
  appointment_id?: number | null;
}

export default function LabResultPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientName, setPatientName] = useState('');
  const [testName, setTestName] = useState('');
  const [appointmentId, setAppointmentId] = useState<number | null>(null);

  const [resultData, setResultData] = useState({
    results: '',
    result_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await apiClient.get<{ lab_order?: LabOrderDetail; data?: LabOrderDetail }>(`/labs/orders/${id}`);
        const order = res.lab_order || res.data;
        if (!order) {
          throw new Error('Lab order data not found');
        }
        setPatientName(order.patient_name || '');
        setTestName(order.test_name || '');
        setAppointmentId(order.appointment_id || null);
      } catch {
        setError('Failed to load lab order');
      }
    };
    fetchOrder();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/labs/results', {
        lab_order_id: Number(id),
        results: resultData.results || null,
        result_date: resultData.result_date,
        notes: resultData.notes || null,
      });
      if (appointmentId) {
        router.push(`/appointments/${appointmentId}`);
      } else {
        router.push('/labs');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit result'));
      setLoading(false);
    }
  };

  const backHref = appointmentId ? `/appointments/${appointmentId}` : '/labs';

  return (
    <Layout>
      <main className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={backHref}>
            <Button variant="outline" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical size={28} />
              Submit Lab Result
            </h1>
            <p className="text-gray-600">
              {testName} for {patientName}
            </p>
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Result Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Results</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  value={resultData.results}
                  onChange={(e) => setResultData({ ...resultData, results: e.target.value })}
                  placeholder="Enter test results..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result Date</label>
                <input
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  type="date"
                  value={resultData.result_date}
                  onChange={(e) => setResultData({ ...resultData, result_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  value={resultData.notes}
                  onChange={(e) => setResultData({ ...resultData, notes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href={backHref}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={loading}>
              Submit Result
            </Button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
