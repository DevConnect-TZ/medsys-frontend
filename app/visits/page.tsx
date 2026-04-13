'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { Stethoscope, Plus, Eye, Calendar, User, FileText } from 'lucide-react';

interface Visit {
  id: number;
  visit_number: string;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  visit_date: string;
  visit_time: string;
  chief_complaint: string;
  diagnosis?: string;
  treatment_plan?: string;
  vital_signs?: {
    temperature?: string;
    blood_pressure?: string;
    heart_rate?: string;
    respiratory_rate?: string;
    oxygen_saturation?: string;
  };
  consultation_fee: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
}

export default function VisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchVisits();
  }, [router]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get('/visits');
      setVisits(response.data || []);
      setError('');
    } catch (err) {
      setError('Failed to load visits');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await apiClient.put(`/visits/${id}`, { status });
      setVisits(visits.map(v => v.id === id ? { ...v, status: status as any } : v));
    } catch (err) {
      setError(`Failed to update visit status to ${status}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };

    const label = status.replace('_', ' ');

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[status as keyof typeof styles]}`}>
        {label}
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'TZS',
    }).format(amount);
  };

  const getStatusCounts = () => {
    return {
      scheduled: visits.filter(v => v.status === 'scheduled').length,
      in_progress: visits.filter(v => v.status === 'in_progress').length,
      completed: visits.filter(v => v.status === 'completed').length,
      total: visits.length,
    };
  };

  const filteredVisits = filterStatus === 'all'
    ? visits
    : visits.filter(v => v.status === filterStatus);

  const statusCounts = getStatusCounts();

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope size={32} />
              Patient Visits
            </h1>
            <p className="text-gray-600 mt-2">Manage patient consultations and medical visits</p>
          </div>
          <Link href="/visits/new">
            <Button variant="primary" className="flex items-center gap-2">
              <Plus size={20} />
              New Visit
            </Button>
          </Link>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.scheduled}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar size={24} className="text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.in_progress}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Stethoscope size={24} className="text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.completed}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText size={24} className="text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Visits</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {statusCounts.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <User size={24} className="text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {['all', 'scheduled', 'in_progress', 'completed', 'cancelled'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${filterStatus === status
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  {status.replace('_', ' ')}
                  {status !== 'all' && (
                    <span className="ml-2 bg-gray-200 text-gray-700 py-0.5 px-2 rounded-full text-xs">
                      {visits.filter(v => v.status === status).length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Visits List */}
        <Card>
          <CardHeader>
            <CardTitle>
              {filterStatus === 'all' ? 'All Visits' : `${filterStatus.replace('_', ' ')} Visits`} ({filteredVisits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading visits...</p>
            ) : filteredVisits.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No visits found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Visit #
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Patient
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Doctor
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Date & Time
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Chief Complaint
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Fee
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVisits.map((visit) => (
                      <tr
                        key={visit.id}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {visit.visit_number}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {visit.patient_name}
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {visit.doctor_name}
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <div>{formatDate(visit.visit_date)}</div>
                          <div className="text-sm text-gray-500">{visit.visit_time}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-900">
                          {visit.chief_complaint}
                        </td>
                        <td className="py-3 px-4">
                          {getStatusBadge(visit.status)}
                        </td>
                        <td className="py-3 px-4 text-gray-900 font-semibold">
                          {formatCurrency(visit.consultation_fee)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Link href={`/visits/${visit.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye size={16} />
                              </Button>
                            </Link>
                            {visit.status === 'scheduled' && (
                              <Button variant="primary" size="sm" onClick={() => handleUpdateStatus(visit.id, 'in_progress')}>
                                Start
                              </Button>
                            )}
                            {visit.status === 'in_progress' && (
                              <Button variant="primary" size="sm" onClick={() => handleUpdateStatus(visit.id, 'completed')}>
                                Complete
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

        {/* Today's Schedule */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {visits
                  .filter(v =>
                    new Date(v.visit_date).toDateString() === new Date().toDateString() &&
                    (v.status === 'scheduled' || v.status === 'in_progress')
                  )
                  .slice(0, 5)
                  .map((visit) => (
                    <div key={visit.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Stethoscope size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{visit.patient_name}</p>
                          <p className="text-sm text-gray-600">
                            {visit.visit_time} • Dr. {visit.doctor_name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(visit.status)}
                      </div>
                    </div>
                  ))}
                {visits.filter(v =>
                  new Date(v.visit_date).toDateString() === new Date().toDateString() &&
                  (v.status === 'scheduled' || v.status === 'in_progress')
                ).length === 0 && (
                    <p className="text-gray-600 text-center py-4">No visits scheduled for today</p>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
}
