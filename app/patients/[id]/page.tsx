'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Edit, User, Phone, Mail, Calendar, MapPin, Heart, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: number;
  patient_number: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  blood_group: string;
  allergies: string[];
  medical_history: string;
  created_at: string;
  updated_at: string;
}

export default function PatientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = params?.id as string;
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPatient = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPatient<Patient>(Number(patientId));
      setPatient(response.patient || response.data || null);
      setError('');
    } catch (err) {
      setError('Failed to load patient details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (patientId) {
      fetchPatient();
    }
  }, [fetchPatient, patientId, router]);

  if (loading) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading patient details...</p>
          </div>
        </main>
      </Layout>
    );
  }

  if (error || !patient) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto p-6">
          <Alert
            type="error"
            message={error || 'Patient not found'}
            onClose={() => router.push('/patients')}
          />
          <div className="mt-4">
            <Link href="/patients">
              <Button variant="outline">
                <ArrowLeft size={18} className="mr-2" />
                Back to Patients
              </Button>
            </Link>
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/patients">
              <Button variant="outline" size="sm">
                <ArrowLeft size={18} />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{patient.full_name}</h1>
              <p className="text-gray-600 mt-1">Patient ID: {patient.patient_id || patient.patient_number}</p>
            </div>
          </div>
          <Link href={`/patients/${patient.id}/edit`}>
            <Button variant="primary">
              <Edit size={18} className="mr-2" />
              Edit Patient
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <User size={20} />
                    Personal Information
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">First Name</label>
                    <p className="mt-1 text-gray-900">{patient.first_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Name</label>
                    <p className="mt-1 text-gray-900">{patient.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Calendar size={16} />
                      Date of Birth
                    </label>
                    <p className="mt-1 text-gray-900">
                      {new Date(patient.date_of_birth).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="mt-1 text-gray-900 capitalize">{patient.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Phone size={16} />
                      Phone
                    </label>
                    <p className="mt-1 text-gray-900">{patient.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Mail size={16} />
                      Email
                    </label>
                    <p className="mt-1 text-gray-900">{patient.email || 'N/A'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <MapPin size={16} />
                      Address
                    </label>
                    <p className="mt-1 text-gray-900">{patient.address || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Heart size={20} />
                    Medical Information
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Blood Group</label>
                    <p className="mt-1 text-gray-900">{patient.blood_group || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <AlertCircle size={16} />
                      Allergies
                    </label>
                    {patient.allergies && patient.allergies.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {patient.allergies.map((allergy, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-gray-900">No known allergies</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Medical History</label>
                    <p className="mt-1 text-gray-900 whitespace-pre-wrap">
                      {patient.medical_history || 'No medical history recorded'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Emergency Contact & Additional Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Phone size={20} />
                    Emergency Contact
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="mt-1 text-gray-900">
                      {patient.emergency_contact_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Phone</label>
                    <p className="mt-1 text-gray-900">
                      {patient.emergency_contact_phone || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Relationship</label>
                    <p className="mt-1 text-gray-900">
                      {patient.emergency_contact_relationship || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Record Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created</label>
                    <p className="mt-1 text-gray-900 text-sm">
                      {new Date(patient.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="mt-1 text-gray-900 text-sm">
                      {new Date(patient.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Layout>
  );
}
