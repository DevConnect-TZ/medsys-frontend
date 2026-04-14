'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { Package, Plus, Eye, CheckCircle, Clock, Pill } from 'lucide-react';

interface Prescription {
  id: number;
  prescription_number: string;
  patient_id: number;
  patient_name: string;
  doctor_name: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  status: 'pending' | 'dispensed' | 'cancelled';
  prescribed_date: string;
  dispensed_date?: string;
  instructions?: string;
  refills_allowed: number;
  refills_remaining: number;
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
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      dispensed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const icons = {
      pending: <Clock size={14} />,
      dispensed: <CheckCircle size={14} />,
      cancelled: <Package size={14} />,
    };

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
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
          <Button variant="primary" className="flex items-center gap-2">
            <Plus size={20} />
            New Prescription
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
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Rx #
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Patient
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Medication
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Dosage
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Frequency
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Prescribed Date
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Doctor
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prescriptions.map((prescription) => (
                      <tr
                        key={prescription.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {prescription.prescription_number}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {prescription.patient_name}
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">
                          {prescription.medication_name}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {prescription.dosage}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {prescription.frequency}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(prescription.status)}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(prescription.prescribed_date)}
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

        {/* Prescription Details Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prescriptions.slice(0, 5).map((rx) => (
                  <div key={rx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Pill size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rx.medication_name}</p>
                        <p className="text-sm text-gray-600">{rx.patient_name}</p>
                      </div>
                    </div>
                    {getStatusBadge(rx.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Pending Refills</span>
                  <span className="font-semibold text-gray-900">
                    {prescriptions.filter(rx => rx.refills_remaining > 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Dispensed Today</span>
                  <span className="font-semibold text-gray-900">
                    {prescriptions.filter(rx => 
                      rx.dispensed_date && 
                      new Date(rx.dispensed_date).toDateString() === new Date().toDateString()
                    ).length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Awaiting Pickup</span>
                  <span className="font-semibold text-gray-900">
                    {prescriptions.filter(rx => rx.status === 'dispensed').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
}
