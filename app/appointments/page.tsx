'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { Plus, Eye, Calendar, Stethoscope, CreditCard, FlaskConical, Pill, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id: number;
  doctor_name?: string;
  appointment_date: string;
  appointment_time: string;
  reason: string;
  status: string;
  workflow_status: string;
  created_at: string;
}

const workflowLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  awaiting_payment: 'Awaiting Payment',
  paid: 'Paid - Awaiting Lab',
  lab_pending: 'Lab In Progress',
  lab_completed: 'Lab Completed',
  pharmacy_pending: 'Pharmacy Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AppointmentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'my_queue' | 'all'>('my_queue');

  const role = user?.role || '';
  const isAdmin = role === 'admin';
  const isReceptionist = role === 'receptionist';
  const canCreate = isAdmin || isReceptionist;

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number | boolean> = { page };
      if (viewMode === 'my_queue') {
        params.my_queue = true;
      }
      const response = await apiClient.getAppointments<Appointment>(page, params);
      setAppointments(response.data || []);
      setTotalPages(response.meta?.last_page || 1);
      setError('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load appointments'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, viewMode]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAppointments();
  }, [fetchAppointments, router]);

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await apiClient.cancelAppointment(id);
      setAppointments(appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled', workflow_status: 'cancelled' } : a)));
    } catch {
      setError('Failed to cancel appointment');
    }
  };

  const handleMarkPaid = async (id: number) => {
    if (!confirm('Confirm payment received for this appointment?')) return;
    try {
      await apiClient.markAppointmentPaid(id);
      setAppointments(appointments.map((a) => (a.id === id ? { ...a, workflow_status: 'paid' } : a)));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to mark as paid'));
    }
  };

  const handleDispense = async (id: number) => {
    if (!confirm('Confirm medicines dispensed?')) return;
    try {
      await apiClient.dispenseAppointment(id);
      setAppointments(appointments.map((a) => (a.id === id ? { ...a, workflow_status: 'completed', status: 'completed' } : a)));
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to dispense'));
    }
  };

  const getWorkflowBadge = (status: string) => {
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      awaiting_payment: 'bg-amber-100 text-amber-800',
      paid: 'bg-purple-100 text-purple-800',
      lab_pending: 'bg-indigo-100 text-indigo-800',
      lab_completed: 'bg-teal-100 text-teal-800',
      pharmacy_pending: 'bg-pink-100 text-pink-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {workflowLabels[status] || status}
      </span>
    );
  };

  const getActionButtons = (appt: Appointment) => {
    const buttons: React.ReactNode[] = [];

    if (appt.workflow_status === 'scheduled' && (role === 'doctor' || isAdmin)) {
      buttons.push(
        <Link key="review" href={`/appointments/${appt.id}/review`}>
          <Button variant="primary" size="sm">
            <Stethoscope size={16} className="mr-1" />
            Review
          </Button>
        </Link>
      );
    }

    if (appt.workflow_status === 'awaiting_payment' && (role === 'cashier' || isAdmin)) {
      buttons.push(
        <Button key="pay" variant="primary" size="sm" onClick={() => handleMarkPaid(appt.id)}>
          <CreditCard size={16} className="mr-1" />
          Mark Paid
        </Button>
      );
    }

    if (appt.workflow_status === 'paid' && (role === 'lab_technician' || isAdmin)) {
      buttons.push(
        <Link key="lab" href={`/labs?appointment_id=${appt.id}`}>
          <Button variant="primary" size="sm">
            <FlaskConical size={16} className="mr-1" />
            Run Tests
          </Button>
        </Link>
      );
    }

    if (appt.workflow_status === 'lab_completed' && (role === 'doctor' || isAdmin)) {
      buttons.push(
        <Link key="prescribe" href={`/appointments/${appt.id}/prescribe`}>
          <Button variant="primary" size="sm">
            <Stethoscope size={16} className="mr-1" />
            Prescribe
          </Button>
        </Link>
      );
    }

    if (appt.workflow_status === 'pharmacy_pending' && (role === 'pharmacist' || isAdmin)) {
      buttons.push(
        <Button key="dispense" variant="primary" size="sm" onClick={() => handleDispense(appt.id)}>
          <Pill size={16} className="mr-1" />
          Dispense
        </Button>
      );
    }

    if (appt.workflow_status === 'completed') {
      buttons.push(
        <span key="done" className="inline-flex items-center text-green-700 text-sm font-medium">
          <CheckCircle size={16} className="mr-1" />
          Done
        </span>
      );
    }

    return buttons;
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-600 mt-1">
              {viewMode === 'my_queue' ? 'Your workflow queue' : 'All appointments'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(isAdmin || isReceptionist) && (
              <>
                <Button
                  variant={viewMode === 'my_queue' ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('my_queue')}
                >
                  My Queue
                </Button>
                <Button
                  variant={viewMode === 'all' ? 'outline' : 'secondary'}
                  size="sm"
                  onClick={() => setViewMode('all')}
                >
                  All
                </Button>
              </>
            )}
            {canCreate && (
              <Link href="/appointments/new">
                <Button variant="primary">
                  <Plus size={18} className="mr-2" />
                  New Appointment
                </Button>
              </Link>
            )}
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar size={20} />
              Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No appointments in your queue</p>
                {canCreate && (
                  <Link href="/appointments/new">
                    <Button variant="primary">Create Appointment</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{appt.patient_name || `Patient #${appt.patient_id}`}</h3>
                          {getWorkflowBadge(appt.workflow_status)}
                        </div>
                        <p className="text-gray-600 text-sm mb-1">
                          {new Date(`${appt.appointment_date} ${appt.appointment_time}`).toLocaleString()}
                          {appt.doctor_name && ` • Dr. ${appt.doctor_name}`}
                        </p>
                        <p className="text-gray-700 text-sm">{appt.reason}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/appointments/${appt.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye size={16} className="mr-1" />
                            View
                          </Button>
                        </Link>
                        {getActionButtons(appt)}
                        {(isAdmin || isReceptionist) && appt.workflow_status !== 'cancelled' && appt.workflow_status !== 'completed' && (
                          <Button variant="secondary" size="sm" onClick={() => handleCancel(appt.id)}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex justify-between items-center border-t pt-6">
                <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>
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
