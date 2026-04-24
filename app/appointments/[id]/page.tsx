'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { usePermission } from '@/hooks/usePermission';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Calendar, User, Stethoscope, CreditCard, FlaskConical, Pill, CheckCircle, Plus, Trash2, X, BedDouble } from 'lucide-react';
import Link from 'next/link';

interface VisitRecord {
  id?: number;
  chief_complaint?: string;
  diagnosis?: string;
  vital_signs?: Record<string, string | number | null>;
  consultation_fee?: number | string;
}

interface LabOrderResult {
  results?: string;
}

interface LabOrder {
  id: number;
  test_name: string;
  status: string;
  cost: number | string;
  lab_result?: LabOrderResult | null;
}

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  quantity?: number | string;
  price?: number | string;
  unit_price?: number | string;
}

interface Prescription {
  id: number;
  status: string;
  medications?: Medication[];
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  total: number | string;
  status: string;
}

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
  visit?: VisitRecord;
  lab_orders?: LabOrder[];
  prescriptions?: Prescription[];
  invoices?: Invoice[];
}

const workflowSteps = [
  { key: 'scheduled', label: 'Scheduled', icon: Calendar },
  { key: 'awaiting_payment', label: 'Payment', icon: CreditCard },
  { key: 'paid', label: 'Lab Pending', icon: FlaskConical },
  { key: 'lab_completed', label: 'Lab Done', icon: CheckCircle },
  { key: 'pharmacy_awaiting_payment', label: 'Rx Payment', icon: CreditCard },
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

  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionType, setAdmissionType] = useState<'admission' | 'referral'>('admission');
  const [admissionLocation, setAdmissionLocation] = useState('');
  const [admissionNotes, setAdmissionNotes] = useState('');
  const [admissionLoading, setAdmissionLoading] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<{ id: number; ward_name: string; bed_number: string }[]>([]);
  const [selectedBedId, setSelectedBedId] = useState<string>('');

  const { can } = usePermission();
  const role = user?.role || '';

  const fetchAppointment = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAppointment<Appointment>(Number(id));
      const appointment = response.appointment || response.data;
      if (!appointment) {
        throw new Error('Appointment data not found');
      }
      setAppointment(appointment);
      setError('');
    } catch (err) {
      setError('Failed to load appointment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    if (id) {
      fetchAppointment();
    }
  }, [fetchAppointment, id, router]);

  const handleMarkPaid = async () => {
    if (!appointment) return;
    if (!confirm('Confirm payment received?')) return;
    try {
      await apiClient.markAppointmentPaid(appointment.id);
      fetchAppointment();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to mark as paid'));
    }
  };

  const handleConfirmPharmacyPayment = async () => {
    if (!appointment) return;
    if (!confirm('Confirm prescription payment received?')) return;
    try {
      await apiClient.confirmPharmacyPaymentAppointment(appointment.id);
      fetchAppointment();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to confirm payment'));
    }
  };

  const handleDispense = async () => {
    if (!appointment) return;
    if (!confirm('Confirm medicines dispensed?')) return;
    try {
      await apiClient.dispenseAppointment(appointment.id);
      fetchAppointment();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to dispense'));
    }
  };

  const openAdmissionModal = async (type: 'admission' | 'referral') => {
    setAdmissionType(type);
    if (type === 'admission') {
      try {
        const res = await apiClient.getBeds<{ id: number; ward_name: string; bed_number: string }>({ available: true });
        setAvailableBeds(res.data || []);
      } catch {
        setAvailableBeds([]);
      }
    }
    setShowAdmissionModal(true);
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

    (appointment.lab_orders || []).forEach((lo) => {
      if (Number(lo.cost) > 0) {
        items.push({
          description: `Lab Test: ${lo.test_name}`,
          quantity: 1,
          unit_price: Number(lo.cost),
          total: Number(lo.cost),
        });
      }
    });

    (appointment.prescriptions || []).forEach((pr) => {
      (pr.medications || []).forEach((med) => {
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

  const submitAdmission = async () => {
    if (!appointment) return;
    setAdmissionLoading(true);
    try {
      await apiClient.createAdmission({
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        appointment_id: appointment.id,
        type: admissionType,
        bed_id: admissionType === 'admission' && selectedBedId ? parseInt(selectedBedId) : undefined,
        location: admissionLocation,
        notes: admissionNotes,
      });
      setShowAdmissionModal(false);
      setAdmissionLocation('');
      setAdmissionNotes('');
      setSelectedBedId('');
      fetchAppointment();
    } catch (err: unknown) {
      setError(getErrorMessage(err, `Failed to ${admissionType} patient`));
    } finally {
      setAdmissionLoading(false);
    }
  };

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
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create invoice'));
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
      pharmacy_awaiting_payment: 4,
      pharmacy_pending: 5,
      completed: 6,
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
            {appointment.workflow_status === 'scheduled' && role === 'doctor' && (
              <Link href={`/appointments/${id}/review`}>
                <Button variant="primary">
                  <Stethoscope size={18} className="mr-2" />
                  Review & Add Labs
                </Button>
              </Link>
            )}
            {appointment.workflow_status === 'awaiting_payment' && role === 'cashier' && (
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
            {appointment.workflow_status === 'paid' && role === 'lab_technician' && (
              <Link href={`/labs?appointment_id=${appointment.id}`}>
                <Button variant="primary">
                  <FlaskConical size={18} className="mr-2" />
                  Run Tests
                </Button>
              </Link>
            )}
            {appointment.workflow_status === 'lab_completed' && role === 'doctor' && (
              <Link href={`/appointments/${id}/prescribe`}>
                <Button variant="primary">
                  <Stethoscope size={18} className="mr-2" />
                  Prescribe
                </Button>
              </Link>
            )}
            {appointment.workflow_status === 'pharmacy_awaiting_payment' && role === 'cashier' && (
              <Button variant="primary" onClick={handleConfirmPharmacyPayment}>
                <CreditCard size={18} className="mr-2" />
                Confirm Rx Payment
              </Button>
            )}
            {appointment.workflow_status === 'pharmacy_pending' && role === 'pharmacist' && (
              <Button variant="primary" onClick={handleDispense}>
                <Pill size={18} className="mr-2" />
                Dispense
              </Button>
            )}
            {role === 'doctor' && !['cancelled', 'completed'].includes(appointment.workflow_status) && (
              <>
                <Button variant="secondary" onClick={() => openAdmissionModal('admission')}>
                  <BedDouble size={18} className="mr-2" />
                  Admit
                </Button>
                <Button variant="secondary" onClick={() => openAdmissionModal('referral')}>
                  <Stethoscope size={18} className="mr-2" />
                  Refer
                </Button>
              </>
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
                <p className="font-semibold text-gray-900 capitalize">{appointment.workflow_status?.replace(/_/g, ' ') || appointment.workflow_status}</p>
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
                {appointment.lab_orders.map((lo) => (
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
                {appointment.invoices.map((inv) => (
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
                {appointment.prescriptions.map((pr) => (
                  <div key={pr.id} className="border rounded-lg p-3">
                    <div className="flex justify-between">
                      <p className="font-medium">Prescription #{pr.id}</p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${pr.status === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{pr.status}</span>
                    </div>
                    <ul className="mt-2 text-sm list-disc list-inside">
                      {(pr.medications || []).map((med, i: number) => (
                        <li key={i}>{med.name} — {med.dosage} ({med.frequency}) {med.price ? `— Tshs ${Number(med.price).toLocaleString()}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admission / Referral Modal */}
        {showAdmissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 capitalize">{admissionType} Patient</h2>
                <button onClick={() => setShowAdmissionModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {admissionType === 'admission' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Bed</label>
                    <select
                      value={selectedBedId}
                      onChange={(e) => {
                        setSelectedBedId(e.target.value);
                        const bed = availableBeds.find((b) => String(b.id) === e.target.value);
                        if (bed) {
                          setAdmissionLocation(`${bed.ward_name} - Bed ${bed.bed_number}`);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an available bed</option>
                      {availableBeds.map((bed) => (
                        <option key={bed.id} value={bed.id}>
                          {bed.ward_name} - Bed {bed.bed_number}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {admissionType === 'admission' ? 'Location / Notes' : 'Referred To'}
                  </label>
                  <input
                    type="text"
                    value={admissionLocation}
                    onChange={(e) => setAdmissionLocation(e.target.value)}
                    placeholder={admissionType === 'admission' ? 'e.g., Ward A - Bed 12' : 'e.g., City Hospital - Cardiology'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={admissionNotes}
                    onChange={(e) => setAdmissionNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="p-6 border-t flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setShowAdmissionModal(false)}>Cancel</Button>
                <Button variant="primary" isLoading={admissionLoading} onClick={submitAdmission}>
                  Confirm {admissionType === 'admission' ? 'Admission' : 'Referral'}
                </Button>
              </div>
            </div>
          </div>
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
