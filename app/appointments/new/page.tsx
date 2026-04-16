'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Calendar } from 'lucide-react';
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

export default function NewAppointmentPage() {
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
    appointment_date: '',
    appointment_time: '',
    appointment_type: 'consultation',
    reason: '',
    notes: '',
  });

  const [availability, setAvailability] = useState<{ available?: boolean; message?: string; schedule?: { start_time: string; end_time: string; day_name: string } }>({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);

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

  // Check doctor availability when doctor, date, or time changes
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.doctor_id || !formData.appointment_date || !formData.appointment_time) {
        setAvailability({});
        return;
      }
      try {
        setCheckingAvailability(true);
        const result = await apiClient.checkDoctorAvailability({
          doctor_id: parseInt(formData.doctor_id),
          date: formData.appointment_date,
          time: formData.appointment_time,
        });
        setAvailability(result);
      } catch {
        setAvailability({ available: false, message: 'Unable to check availability' });
      } finally {
        setCheckingAvailability(false);
      }
    };

    const timer = setTimeout(checkAvailability, 300);
    return () => clearTimeout(timer);
  }, [formData.doctor_id, formData.appointment_date, formData.appointment_time]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await apiClient.post('/appointments', {
        ...formData,
        patient_id: parseInt(formData.patient_id),
        doctor_id: parseInt(formData.doctor_id),
      });
      router.push('/appointments');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create appointment'));
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout>
      <main className="max-w-3xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/appointments">
            <Button variant="outline" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar size={32} />
              Schedule New Appointment
            </h1>
            <p className="text-gray-600 mt-1">Book a new appointment for a patient</p>
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
            <CardTitle>Appointment Details</CardTitle>
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

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Appointment Date"
                    name="appointment_date"
                    type="date"
                    value={formData.appointment_date}
                    onChange={handleChange}
                    min={today}
                    required
                  />
                  <Input
                    label="Appointment Time"
                    name="appointment_time"
                    type="time"
                    value={formData.appointment_time}
                    onChange={handleChange}
                    required
                  />
                </div>

                {checkingAvailability && (
                  <p className="text-sm text-gray-500">Checking doctor availability...</p>
                )}
                {!checkingAvailability && availability.message && (
                  <div className={`p-3 rounded-lg text-sm ${availability.available ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {availability.available ? (
                      <span>
                        ✅ {availability.message} ({availability.schedule?.start_time} - {availability.schedule?.end_time})
                      </span>
                    ) : (
                      <span>
                        ❌ {availability.message}
                        {availability.schedule && (
                          <span className="block mt-1 text-xs">
                            Scheduled hours: {availability.schedule.start_time} - {availability.schedule.end_time} on {availability.schedule.day_name}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                )}

                {/* Appointment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Appointment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="appointment_type"
                    value={formData.appointment_type}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="consultation">Consultation</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="checkup">Check-up</option>
                    <option value="emergency">Emergency</option>
                    <option value="procedure">Procedure</option>
                  </select>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Visit <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the reason for this appointment..."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any additional information or special requirements..."
                  />
                </div>

                <CardFooter>
                  <Link href="/appointments">
                    <Button variant="secondary">Cancel</Button>
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={loading}
                  >
                    Schedule Appointment
                  </Button>
                </CardFooter>
              </form>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Appointment Guidelines</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Appointments should be scheduled at least 24 hours in advance</li>
              <li>• Emergency appointments can be scheduled for the same day</li>
              <li>• Patients will receive a confirmation notification</li>
              <li>• Please arrive 15 minutes before the scheduled time</li>
              <li>• Cancellations should be made at least 2 hours in advance</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
