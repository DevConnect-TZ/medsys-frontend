'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermission } from '@/hooks/usePermission';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: number;
  patient_id: string;
  patient_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  created_at: string;
}

export default function PatientsPage() {
  const router = useRouter();
  const { can } = usePermission();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getPatients<Patient>(page, searchTerm);
      setPatients(response.data || []);
      setTotalPages(response.meta?.last_page || 1);
      setError('');
    } catch (err) {
      setError('Failed to load patients');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  // Debounce search input to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const handleDelete = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this patient?')) return;

    try {
      await apiClient.deletePatient(id);
      setPatients(patients.filter((p) => p.id !== id));
    } catch {
      setError('Failed to delete patient');
    }
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
            <p className="text-gray-600 mt-1">Manage patient records and information</p>
          </div>
          {can('create_patients') && (
            <Link href="/patients/new">
              <Button variant="primary">
                <Plus size={18} className="mr-2" />
                New Patient
              </Button>
            </Link>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError('')}
          />
        )}

        {/* Search */}
        <Card className="mb-6">
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search patients by name or patient ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Patients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Patient List</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading patients...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No patients found</p>
                {can('create_patients') && (
                  <Link href="/patients/new">
                    <Button variant="primary">Create First Patient</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Patient ID</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Gender</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">DOB</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient, index) => (
                      <tr key={patient.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {patient.patient_id || patient.patient_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {patient.first_name} {patient.last_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{patient.phone}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 capitalize">{patient.gender}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(patient.date_of_birth).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/patients/${patient.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye size={16} />
                              </Button>
                            </Link>
                            {can('edit_patients') && (
                              <Link href={`/patients/${patient.id}/edit`}>
                                <Button variant="outline" size="sm">
                                  <Edit size={16} />
                                </Button>
                              </Link>
                            )}
                            {can('delete_patients') && (
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(patient.id)}
                              >
                                <Trash2 size={16} />
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-between items-center border-t pt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
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
