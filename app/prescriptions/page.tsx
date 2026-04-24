'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { Package, Eye, CheckCircle, Clock, Pill } from 'lucide-react';

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: number;
  instructions?: string;
}

interface Prescription {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  visit_id?: number;
  medications: Medication[];
  status: 'pending' | 'dispensed' | 'cancelled';
  prescription_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function PrescriptionsPage() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dispensingId, setDispensingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchPrescriptions();
  }, [router]);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ data?: Prescription[] }>('/pharmacy/prescriptions');
      setPrescriptions(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load prescriptions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      dispensed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const icons: Record<string, React.ReactNode> = {
      pending: <Clock size={14} />,
      dispensed: <CheckCircle size={14} />,
      cancelled: <Package size={14} />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {icons[status]}
        {status}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusCounts = () => {
    return {
      pending: prescriptions.filter(rx => rx.status === 'pending').length,
      dispensed: prescriptions.filter(rx => rx.status === 'dispensed').length,
      total: prescriptions.length,
    };
  };

  const statusCounts = getStatusCounts();

  const formatMedications = (medications: Medication[]) => {
    if (!medications || medications.length === 0) return '—';
    return medications.map(m => m.name).join(', ');
  };

  const formatDosage = (medications: Medication[]) => {
    if (!medications || medications.length === 0) return '—';
    const first = medications[0];
    return `${first.dosage || ''} ${first.frequency || ''}`.trim() || '—';
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={32} />
              Prescriptions
            </h1>
            <p className="text-gray-600 mt-2">Manage patient prescriptions and medications</p>
          </div>
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
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.pending}
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
                  <p className="text-sm text-gray-600">Dispensed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.dispensed}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Prescriptions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Pill size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prescriptions List */}
        <Card>
          <CardHeader>
            <CardTitle>All Prescriptions ({prescriptions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading prescriptions...</p>
            ) : prescriptions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No prescriptions found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Patient</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Medications</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Dosage / Frequency</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Doctor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((prescription) => (
                      <tr
                        key={prescription.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          #{prescription.id}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {prescription.patient_name}
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">
                          {formatMedications(prescription.medications)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDosage(prescription.medications)}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(prescription.status)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(prescription.prescription_date)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {prescription.doctor_name}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Eye size={16} />
                            </Button>
                            {prescription.status === 'pending' && (
                              <Button
                                variant="primary"
                                size="sm"
                                isLoading={dispensingId === prescription.id}
                                onClick={async () => {
                                  setDispensingId(prescription.id);
                                  try {
                                    await apiClient.put(`/pharmacy/prescriptions/${prescription.id}`, { status: 'dispensed' });
                                    setPrescriptions(prescriptions.map(p => p.id === prescription.id ? { ...p, status: 'dispensed' } : p));
                                  } catch (err: unknown) {
                                    setError(getErrorMessage(err, 'Failed to dispense'));
                                  } finally {
                                    setDispensingId(null);
                                  }
                                }}
                              >
                                Dispense
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
