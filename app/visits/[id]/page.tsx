'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Stethoscope, BedDouble, X } from 'lucide-react';
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
}

export default function VisitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const id = params?.id as string;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <Layout>
      <main className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
              <p className="text-gray-600 mt-1">{visit.visit_number}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {role === 'doctor' && !['admitted', 'referred', 'cancelled'].includes(visit.status) && (
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
                <p className="font-semibold text-gray-900 capitalize">{visit.status.replace('_', ' ')}</p>
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
