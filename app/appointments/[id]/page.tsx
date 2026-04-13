'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Calendar, User, Stethoscope, CreditCard, FlaskConical, Pill, CheckCircle, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';

interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  status: string;
  workflow_status: string;
  reason: string;
  notes?: string;
  created_at: string;
  visit?: any;
  lab_orders?: any[];
  prescriptions?: any[];
  invoices?: any[];
}

const workflowSteps = [
  { key: 'scheduled', label: 'Scheduled', icon: Calendar },
  { key: 'awaiting_payment', label: 'Payment', icon: CreditCard },
  { key: 'paid', label: 'Lab Pending', icon: FlaskConical },
  { key: 'lab_completed', label: 'Lab Done', icon: CheckCircle },
  { key: 'pharmacy_pending', label: 'Pharmacy', icon: Pill },
  { key: 'completed', label: 'Completed', icon: CheckCircle },
];

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function AppointmentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const id = params?.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const role = user?.role || '';
  const isAdmin = role === 'admin';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (id) fetchAppointment();
  }, [id, router]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.getAppointment(Number(id));
      setAppointment(response.appointment || response.data);
      setError('');
    } catch (err) {
      setError('Failed to load appointment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!appointment) return;
    if (!confirm('Confirm payment received?')) return;
    try {
      await apiClient.markAppointmentPaid(appointment.id);
      fetchAppointment();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark as paid');
    }
  };

  const handleDispense = async () => {
    if (!appointment) return;
    if (!confirm('Confirm medicines dispensed?')) return;
    try {
      await apiClient.dispenseAppointment(appointment.id);
      fetchAppointment();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to dispense');
    }
  };

  const openInvoiceModal = () => {
    if (!appointment) return;
    const items: InvoiceItem[] = [];

    if (appointment.visit?.consultation_fee && Number(appointment.visit.consultation_fee) > 0) {
      items.push({
        description: 'Consultation Fee',
        quantity: 1,
        unit_price: Number(appointment.visit.consultation_fee),
        total: Number(appointment.visit.consultation_fee),
      });
    }

    (appointment.lab_orders || []).forEach((lo: any) => {
      if (Number(lo.cost) > 0) {
        items.push({
          description: `Lab Test: ${lo.test_name}`,
          quantity: 1,
          unit_price: Number(lo.cost),
          total: Number(lo.cost),
        });
      }
    });

    (appointment.prescriptions || []).forEach((pr: any) => {
      (pr.medications || []).forEach((med: any) => {
        const price = Number(med.price || med.unit_price || 0);
        const qty = Number(med.quantity || 1);
        if (price > 0) {
          items.push({
            description: `Medicine: ${med.name}`,
            quantity: qty,
            unit_price: price,
            total: price * qty,
          });
        }
      });
    });

    setInvoiceItems(items.length ? items : [{ description: '', quantity: 1, unit_price: 0, total: 0 }]);
    setShowInvoiceModal(true);
  };

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unit_price: 0, total: 0 }]);
  };

  const removeInvoiceItem = (idx: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== idx));
  };

  const updateInvoiceItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const copy = [...invoiceItems];
    const item = { ...copy[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      item.total = Number(item.quantity || 0) * Number(item.unit_price || 0);
    }
    copy[idx] = item;
    setInvoiceItems(copy);
  };

  const invoiceSubtotal = invoiceItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0);

  const submitInvoice = async () => {
    if (!appointment) return;
    setInvoiceLoading(true);
    try {
      await apiClient.createInvoice({
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        visit_id: appointment.visit?.id || null,
        invoice_date: new Date().toISOString().split('T')[0],
        items: JSON.stringify(invoiceItems.filter((i) => i.description.trim() !== '')),
        subtotal: invoiceSubtotal,
        total: invoiceSubtotal,
      });
      setShowInvoiceModal(false);
      fetchAppointment();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const getStepIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    const map: Record<string, number> = {
      scheduled: 0,
      awaiting_payment: 1,
      paid: 2,
      lab_pending: 2,
      lab_completed: 3,
      pharmacy_pending: 4,
      completed: 5,
    };
    return map[status] ?? 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto p-6">
          <p className="text-gray-600 text-center py-8">Loading appointment details...</p>
        </main>
      </Layout>
    );
  }

  if (error || !appointment) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto p-6">
          <Alert type="error" message={error || 'Appointment not found'} />
          <Link href="/appointments">
            <Button variant="outline" className="mt-4">
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </Link>
        </main>
      </Layout>
    );
  }

  const currentStep = getStepIndex(appointment.workflow_status);
  const hasExistingInvoice = (appointment.invoices || []).length > 0;

  return (
    <Layout>
      <main className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/appointments">
              <Button variant="outline" size="sm">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={32} />
                Appointment Details
              </h1>
              <p className="text-gray-600 mt-1">#{appointment.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {appointment.workflow_status === 'scheduled' && (role === 'doctor' || isAdmin) && (
              <Link href={`/appointments/${id}/review`}>
                <Button variant="primary">
                  <Stethoscope size={18} className="mr-2" />
                  Review & Add Labs
                </Button>
              </Link>
            )}
            {appointment.workflow_status === 'awaiting_payment' && (role === 'cashier' || isAdmin) && (
              <>
                {!hasExistingInvoice && (
                  <Button variant="primary" onClick={openInvoiceModal}>
                    <CreditCard size={18} className="mr-2" />
                    Generate Invoice
                  </Button>
                )}
                <Button variant="secondary" onClick={handleMarkPaid}>
                  <CreditCard size={18} className="mr-2" />
                  Mark Paid
                </Button>
              </>
            )}
            {appointment.workflow_status === 'paid' && (role === 'lab_technician' || isAdmin) && (
              <Link href={`/labs?appointment_id=${appointment.id}`}>
                <Button variant="primary">
                  <FlaskConical size={18} className="mr-2" />
                  Run Tests
                </Button>
              </Link>
            )}
            {appointment.workflow_status === 'lab_completed' && (role === 'doctor' || isAdmin) && (
              <Link href={`/appointments/${id}/prescribe`}>
                <Button variant="primary">
                  <Stethoscope size={18} className="mr-2" />
                  Prescribe
                </Button>
              </Link>
            )}
            {appointment.workflow_status === 'pharmacy_pending' && (role === 'pharmacist' || isAdmin) && (
              <Button variant="primary" onClick={handleDispense}>
                <Pill size={18} className="mr-2" />
                Dispense
              </Button>
            )}
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

        {/* Workflow Stepper */}
        {appointment.workflow_status !== 'cancelled' && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {workflowSteps.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = idx <= currentStep;
                  const isCurrent = idx === currentStep;
                  return (
                    <div key={step.key} className="flex-1 flex flex-col items-center text-center relative">
                      {idx < workflowSteps.length - 1 && (
                        <div className={`absolute top-4 left-1/2 w-full h-1 ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`} />
                      )}
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 ${isCurrent ? 'bg-blue-600 border-blue-600 text-white' : isActive ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-gray-100 border-gray-300 text-gray-400'}`}>
                        <Icon size={18} />
                      </div>
                      <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-blue-700' : isActive ? 'text-gray-700' : 'text-gray-400'}`}>{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {appointment.workflow_status === 'cancelled' && (
          <div className="mb-6">
            <Alert type="error" message="This appointment has been cancelled." />
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User size={20} /> Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-gray-900">{appointment.patient_name}</p>
              <p className="text-sm text-gray-600">ID: #{appointment.patient_id}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User size={20} /> Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-gray-900">Dr. {appointment.doctor_name}</p>
              <p className="text-sm text-gray-600">ID: #{appointment.doctor_id}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar size={20} /> Appointment Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold text-gray-900">{formatDate(appointment.appointment_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time</p>
                <p className="font-semibold text-gray-900">{formatTime(appointment.appointment_time)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Workflow Status</p>
                <p className="font-semibold text-gray-900 capitalize">{appointment.workflow_status.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Reason</p>
              <p className="text-gray-900">{appointment.reason}</p>
            </div>
            {appointment.notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Notes</p>
                <p className="text-gray-900">{appointment.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit */}
        {appointment.visit && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Stethoscope size={20} /> Visit Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-600">Chief Complaint</p><p className="font-medium">{appointment.visit.chief_complaint || '—'}</p></div>
                <div><p className="text-sm text-gray-600">Diagnosis</p><p className="font-medium">{appointment.visit.diagnosis || '—'}</p></div>
                <div><p className="text-sm text-gray-600">Vital Signs</p><p className="font-medium">{appointment.visit.vital_signs ? JSON.stringify(appointment.visit.vital_signs) : '—'}</p></div>
                <div><p className="text-sm text-gray-600">Consultation Fee</p><p className="font-medium">Tshs {Number(appointment.visit.consultation_fee).toLocaleString()}</p></div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lab Orders */}
        {appointment.lab_orders && appointment.lab_orders.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FlaskConical size={20} /> Lab Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointment.lab_orders.map((lo: any) => (
                  <div key={lo.id} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <p className="font-medium">{lo.test_name}</p>
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 capitalize">{lo.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">Cost: Tshs {Number(lo.cost).toLocaleString()}</p>
                    {lo.lab_result && (
                      <div className="mt-2 text-sm bg-green-50 p-2 rounded">
                        <strong>Result:</strong> {lo.lab_result.results || 'File uploaded'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoices */}
        {appointment.invoices && appointment.invoices.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard size={20} /> Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointment.invoices.map((inv: any) => (
                  <div key={inv.id} className="border rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{inv.invoice_number}</p>
                      <p className="text-sm text-gray-600">Date: {inv.invoice_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">Tshs {Number(inv.total).toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${inv.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>{inv.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prescriptions */}
        {appointment.prescriptions && appointment.prescriptions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Pill size={20} /> Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {appointment.prescriptions.map((pr: any) => (
                  <div key={pr.id} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <p className="font-medium">Prescription #{pr.id}</p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${pr.status === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{pr.status}</span>
                    </div>
                    <ul className="mt-2 text-sm list-disc list-inside">
                      {(pr.medications || []).map((med: any, i: number) => (
                        <li key={i}>{med.name} — {med.dosage} ({med.frequency}) {med.price ? `— Tshs ${Number(med.price).toLocaleString()}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Generate Invoice</h2>
                <button onClick={() => setShowInvoiceModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Description</th>
                        <th className="text-left py-2">Qty</th>
                        <th className="text-left py-2">Unit Price</th>
                        <th className="text-left py-2">Total</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 pr-2">
                            <input
                              className="w-full px-2 py-1 border rounded"
                              value={item.description}
                              onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              className="w-16 px-2 py-1 border rounded"
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(idx, 'quantity', e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              className="w-24 px-2 py-1 border rounded"
                              value={item.unit_price}
                              onChange={(e) => updateInvoiceItem(idx, 'unit_price', e.target.value)}
                            />
                          </td>
                          <td className="py-2 pr-2 font-medium">{Number(item.total).toLocaleString()}</td>
                          <td className="py-2">
                            <Button type="button" variant="danger" size="sm" onClick={() => removeInvoiceItem(idx)}>
                              <Trash2 size={14} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addInvoiceItem}>
                  <Plus size={16} className="mr-1" />
                  Add Item
                </Button>
                <div className="flex justify-between items-center border-t pt-4">
                  <p className="text-gray-600">Subtotal</p>
                  <p className="text-xl font-bold text-gray-900">Tshs {invoiceSubtotal.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</Button>
                <Button variant="primary" isLoading={invoiceLoading} onClick={submitInvoice}>Create Invoice</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}
