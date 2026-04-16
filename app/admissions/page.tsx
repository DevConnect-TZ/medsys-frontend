'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { BedDouble, Stethoscope, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

interface Admission {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_identifier: string;
  doctor_id: number;
  doctor_name: string;
  type: 'admission' | 'referral';
  status: 'active' | 'discharged' | 'completed';
  location: string;
  notes: string;
  discharged_at: string;
  created_at: string;
}

export default function AdmissionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'admission' | 'referral'>('admission');
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchAdmissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAdmissions<Admission>(page, { type: activeTab });
      setAdmissions(response.data || []);
      setTotalPages(response.meta?.last_page || 1);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load admissions'));
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchAdmissions();
  }, [fetchAdmissions, router]);

  const handleDischarge = async (id: number) => {
    if (!confirm('Discharge this patient?')) return;
    setError('');
    setSuccess('');
    try {
      await apiClient.dischargeAdmission(id);
      setSuccess('Patient discharged successfully');
      fetchAdmissions();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to discharge patient'));
    }
  };

  const handleCompleteReferral = async (id: number) => {
    if (!confirm('Mark this referral as completed?')) return;
    setError('');
    setSuccess('');
    try {
      await apiClient.completeReferral(id);
      setSuccess('Referral completed successfully');
      fetchAdmissions();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to complete referral'));
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock size={12} /> Active</span>;
    }
    if (status === 'discharged') {
      return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle size={12} /> Discharged</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><CheckCircle size={12} /> Completed</span>;
  };

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BedDouble size={32} />
              Admissions & Referrals
            </h1>
            <p className="text-gray-600 mt-1">Manage patient admissions and referrals</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-gray-200 mb-6">
          <button
            onClick={() => { setActiveTab('admission'); setPage(1); }}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 ${activeTab === 'admission' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <BedDouble size={18} />
            Admissions
          </button>
          <button
            onClick={() => { setActiveTab('referral'); setPage(1); }}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 ${activeTab === 'referral' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Stethoscope size={18} />
            Referrals
          </button>
        </div>

        {error && <div className="mb-4"><Alert type="error" message={error} onClose={() => setError('')} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onClose={() => setSuccess('')} /></div>}

        <Card>
          <CardHeader>
            <CardTitle>{activeTab === 'admission' ? 'Admitted Patients' : 'Patient Referrals'}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : admissions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                No {activeTab === 'admission' ? 'admissions' : 'referrals'} found
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Patient</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Doctor</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">{activeTab === 'admission' ? 'Ward / Bed' : 'Referred To'}</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admissions.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {item.patient_name}
                            <div className="text-xs text-gray-500">ID: {item.patient_identifier}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">Dr. {item.doctor_name}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{item.location || '—'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm">{getStatusBadge(item.status)}</td>
                          <td className="px-4 py-3 text-right">
                            {activeTab === 'admission' && item.status === 'active' && (
                              <Button variant="primary" size="sm" onClick={() => handleDischarge(item.id)}>
                                Discharge
                              </Button>
                            )}
                            {activeTab === 'referral' && item.status === 'active' && (
                              <Button variant="primary" size="sm" onClick={() => handleCompleteReferral(item.id)}>
                                Complete
                              </Button>
                            )}
                            {item.status !== 'active' && (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex justify-between items-center border-t pt-6">
                    <Button variant="outline" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>Previous</Button>
                    <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
                    <Button variant="outline" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>Next</Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
