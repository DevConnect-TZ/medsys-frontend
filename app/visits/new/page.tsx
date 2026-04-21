'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Stethoscope } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: number;
  patient_number: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface Doctor {
  id: number;
  name: string;
  role: string;
}

export default function NewVisitPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    visit_date: '',
    visit_time: '',
    chief_complaint: '',
    diagnosis: '',
    medical_notes: '',
    consultation_fee: '',
  });

  const fetchDoctors = useCallback(async () => {
    try {
      setLoadingData(true);
      const doctorsResponse = await apiClient.get<{ data?: Doctor[] }>('/doctors');
      setDoctors(doctorsResponse.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load doctors');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchDoctors();
  }, [fetchDoctors, router]);

  // Search patients by ID or name
  useEffect(() => {
    const searchPatients = async () => {
      if (!patientSearch.trim()) {
        setPatientResults([]);
        return;
      }
      try {
        const res = await apiClient.getPatients<Patient>(1, patientSearch.trim());
        setPatientResults(res.data || []);
      } catch {
        setPatientResults([]);
      }
    };
    const timer = setTimeout(searchPatients, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.createVisit({
        ...formData,
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id),
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : undefined,
      });
      router.push('/visits');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create visit'));
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout>
      <main className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/visits">
            <Button variant="outline" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope size={32} />
              Record New Visit
            </h1>
            <p className="text-gray-600 mt-1">Create a new patient visit record</p>
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

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Visit Details</CardTitle>
          </CardHeader>

          <CardContent>
            {loadingData ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Patient Selection */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient <span className="text-red-500">*</span>
                  </label>
                  {selectedPatient ? (
                    <div className="flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
                      <span className="text-gray-900">
                        {selectedPatient.full_name} ({selectedPatient.patient_id || selectedPatient.patient_number})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPatient(null);
                          setFormData((prev) => ({ ...prev, patient_id: '' }));
                          setPatientSearch('');
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          setShowPatientDropdown(true);
                        }}
                        onFocus={() => setShowPatientDropdown(true)}
                        placeholder="Search by patient name or ID..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showPatientDropdown && patientResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {patientResults.map((patient) => (
                            <button
                              key={patient.id}
                              type="button"
                              onClick={() => {
                                setSelectedPatient(patient);
                                setFormData((prev) => ({ ...prev, patient_id: String(patient.id) }));
                                setShowPatientDropdown(false);
                                setPatientSearch('');
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-50 border-b last:border-b-0"
                            >
                              <div className="text-sm font-medium text-gray-900">{patient.full_name}</div>
                              <div className="text-xs text-gray-500">ID: {patient.patient_id || patient.patient_number}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {showPatientDropdown && patientSearch && patientResults.length === 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                          No patients found
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Doctor <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="doctor_id"
                    value={formData.doctor_id}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visit Date & Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Visit Date"
                    name="visit_date"
                    type="date"
                    value={formData.visit_date}
                    onChange={handleChange}
                    max={today}
                    required
                  />
                  <Input
                    label="Visit Time"
                    name="visit_time"
                    type="time"
                    value={formData.visit_time}
                    onChange={handleChange}
                  />
                </div>

                {/* Chief Complaint */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chief Complaint
                  </label>
                  <textarea
                    name="chief_complaint"
                    value={formData.chief_complaint}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Reason for visit..."
                  />
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Diagnosis
                  </label>
                  <textarea
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Doctor's diagnosis..."
                  />
                </div>

                {/* Medical Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Medical Notes
                  </label>
                  <textarea
                    name="medical_notes"
                    value={formData.medical_notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Consultation Fee */}
                <Input
                  label="Consultation Fee"
                  name="consultation_fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.consultation_fee}
                  onChange={handleChange}
                  placeholder="0.00"
                />

                <CardFooter>
                  <Link href="/visits">
                    <Button variant="secondary">Cancel</Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                  >
                    Create Visit
                  </Button>
                </CardFooter>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
