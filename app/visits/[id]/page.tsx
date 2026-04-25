'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Stethoscope, BedDouble, X, FlaskConical, CreditCard, Pill } from 'lucide-react';
import Link from 'next/link';

interface Visit {
  id: number;
  visit_number: string;
  patient_id: number;
  patient_name: string;
  doctor_id: number;
  doctor_name: string;
  visit_date: string;
  visit_time?: string;
  chief_complaint?: string;
  diagnosis?: string;
  medical_notes?: string;
  vital_signs?: Record<string, string | number | null>;
  consultation_fee?: number;
  status: string;
  workflow_status: string;
  lab_orders?: { id: number; test_name: string; status: string; result?: string }[];
  prescriptions?: { id: number; medication_name: string; dosage: string; quantity: number; status: string }[];
}

const workflowSteps = ['scheduled', 'awaiting_payment', 'paid', 'lab_pending', 'lab_completed', 'pharmacy_awaiting_payment', 'pharmacy_pending', 'completed'];

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const id = params?.id as string;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [showAdmissionModal, setShowAdmissionModal] = useState(false);
  const [admissionType, setAdmissionType] = useState<'admission' | 'referral'>('admission');
  const [admissionLocation, setAdmissionLocation] = useState('');
  const [admissionNotes, setAdmissionNotes] = useState('');
  const [admissionLoading, setAdmissionLoading] = useState(false);
  const [availableBeds, setAvailableBeds] = useState<{ id: number; ward_name: string; bed_number: string }[]>([]);
  const [selectedBedId, setSelectedBedId] = useState<string>('');

  const role = user?.role || '';

  const fetchVisit = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getVisit<Visit>(Number(id));
      const visitData = response.visit || response.data;
      if (!visitData) {
        throw new Error('Visit data not found');
      }
      setVisit(visitData);
      setError('');
    } catch (err) {
      setError('Failed to load visit details');
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
      fetchVisit();
    }
  }, [fetchVisit, id, router]);

  const submitAdmission = async () => {
    if (!visit) return;
    setAdmissionLoading(true);
    try {
      await apiClient.createAdmission({
        patient_id: visit.patient_id,
        doctor_id: visit.doctor_id,
        visit_id: visit.id,
        type: admissionType,
        bed_id: admissionType === 'admission' && selectedBedId ? parseInt(selectedBedId) : undefined,
        location: admissionLocation,
        notes: admissionNotes,
      });
      setShowAdmissionModal(false);
      setAdmissionLocation('');
      setAdmissionNotes('');
      setSelectedBedId('');
      fetchVisit();
    } catch (err: unknown) {
      setError(getErrorMessage(err, `Failed to ${admissionType} patient`));
    } finally {
      setAdmissionLoading(false);
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

  const handleMarkPaid = async () => {
    if (!visit) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/visits/${visit.id}/mark-paid`, {});
      fetchVisit();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to mark as paid'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispense = async () => {
    if (!visit) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/visits/${visit.id}/dispense`, {});
      fetchVisit();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to dispense'));
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const s = status ?? 'unknown';
    const styles: Record<string, string> = {
      scheduled: 'bg-blue-100 text-blue-800',
      awaiting_payment: 'bg-amber-100 text-amber-800',
      paid: 'bg-purple-100 text-purple-800',
      lab_pending: 'bg-indigo-100 text-indigo-800',
      lab_completed: 'bg-teal-100 text-teal-800',
      pharmacy_awaiting_payment: 'bg-orange-100 text-orange-800',
      pharmacy_pending: 'bg-pink-100 text-pink-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    const label = s.replace(/_/g, ' ');
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[s] || 'bg-gray-100 text-gray-800'}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto p-6">
          <p className="text-gray-600 text-center py-8">Loading visit details...</p>
        </main>
      </Layout>
    );
  }

  if (error || !visit) {
    return (
      <Layout>
        <main className="max-w-5xl mx-auto p-6">
          <Alert type="error" message={error || 'Visit not found'} />
          <Link href="/visits">
            <Button variant="outline" className="mt-4">
              <ArrowLeft size={18} className="mr-2" />
              Back
            </Button>
          </Link>
        </main>
      </Layout>
    );
  }

  const currentStepIndex = workflowSteps.indexOf(visit.workflow_status);

  return (
    <Layout>
      <main className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link href="/visits">
              <Button variant="outline" size="sm">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Stethoscope size={32} />
                Visit Details
              </h1>
              <p className="text-gray-600 mt-1">{visit.visit_number || `VST-${visit.id}`}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {role === 'doctor' && !['completed', 'cancelled'].includes(visit.workflow_status) && (
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
            {visit.workflow_status === 'scheduled' && role === 'doctor' && (
              <Link href={`/visits/${visit.id}/review`}>
                <Button variant="primary">
                  <Stethoscope size={18} className="mr-2" />
                  Review
                </Button>
              </Link>
            )}
            {visit.workflow_status === 'lab_completed' && role === 'doctor' && (
              <Link href={`/visits/${visit.id}/prescribe`}>
                <Button variant="primary">
                  <Pill size={18} className="mr-2" />
                  Prescribe
                </Button>
              </Link>
            )}
            {visit.workflow_status === 'awaiting_payment' && role === 'cashier' && (
              <Button variant="primary" isLoading={actionLoading} onClick={handleMarkPaid}>
                <CreditCard size={18} className="mr-2" />
                Mark Paid
              </Button>
            )}
            {visit.workflow_status === 'paid' && role === 'lab_technician' && (
              <Link href={`/labs?visit_id=${visit.id}`}>
                <Button variant="primary">
                  <FlaskConical size={18} className="mr-2" />
                  View Lab Orders
                </Button>
              </Link>
            )}
            {visit.workflow_status === 'pharmacy_pending' && role === 'pharmacist' && (
              <Button variant="primary" isLoading={actionLoading} onClick={handleDispense}>
                <Pill size={18} className="mr-2" />
                Dispense
              </Button>
            )}
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        {/* Workflow Stepper */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Workflow Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between overflow-x-auto">
              {workflowSteps.map((step, idx) => {
                const isCompleted = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <div key={step} className="flex items-center min-w-[8rem]">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'} ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                        {idx + 1}
                      </div>
                      <span className={`text-xs mt-2 capitalize text-center ${isCurrent ? 'font-semibold text-blue-700' : 'text-gray-600'}`}>
                        {step.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {idx < workflowSteps.length - 1 && (
                      <div className={`h-1 w-full min-w-[2rem] mx-2 ${idx < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">Current status:</span>
              {getStatusBadge(visit.workflow_status)}
            </div>
          </CardContent>
        </Card>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-gray-900">{visit.patient_name}</p>
              <p className="text-sm text-gray-600">ID: #{visit.patient_id}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Doctor</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-gray-900">Dr. {visit.doctor_name}</p>
              <p className="text-sm text-gray-600">ID: #{visit.doctor_id}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Visit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="font-semibold text-gray-900">{new Date(visit.visit_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <div className="mt-1">{getStatusBadge(visit.workflow_status)}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Consultation Fee</p>
                <p className="font-semibold text-gray-900">Tshs {Number(visit.consultation_fee || 0).toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-600">Chief Complaint</p>
              <p className="text-gray-900">{visit.chief_complaint || '—'}</p>
            </div>
            {visit.diagnosis && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Diagnosis</p>
                <p className="text-gray-900">{visit.diagnosis}</p>
              </div>
            )}
            {visit.medical_notes && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Medical Notes</p>
                <p className="text-gray-900">{visit.medical_notes}</p>
              </div>
            )}
            {visit.vital_signs && (
              <div className="mt-4">
                <p className="text-sm text-gray-600">Vital Signs</p>
                <div className="text-gray-900">
                  {Object.entries(visit.vital_signs).map(([key, value]) => (
                    <div key={key} className="capitalize">{key.replace('_', ' ')}: {value ?? '—'}</div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lab Orders */}
        {(visit.lab_orders && visit.lab_orders.length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Lab Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visit.lab_orders.map((lab) => (
                  <div key={lab.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-900">{lab.test_name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${lab.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{lab.status}</span>
                    </div>
                    {lab.result && <p className="text-sm text-gray-600 mt-1">Result: {lab.result}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prescriptions */}
        {(visit.prescriptions && visit.prescriptions.length > 0) && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Prescriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {visit.prescriptions.map((pres) => (
                  <div key={pres.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <p className="font-semibold text-gray-900">{pres.medication_name}</p>
                      <span className={`text-xs px-2 py-1 rounded-full capitalize ${pres.status === 'dispensed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{pres.status}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{pres.dosage} • Qty: {pres.quantity}</p>
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
      </main>
    </Layout>
  );
}
