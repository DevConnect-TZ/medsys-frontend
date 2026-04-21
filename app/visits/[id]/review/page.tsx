'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Plus, Trash2, Stethoscope } from 'lucide-react';
import Link from 'next/link';

interface LabTest {
  test_name: string;
  test_type: string;
  cost: string;
  priority: 'normal' | 'urgent';
  notes: string;
}

interface MedicalTest {
  id: number;
  test_name: string;
  category?: string;
  cost: number;
}

interface VisitSummary {
  patient_id: number;
  patient_name?: string;
  doctor_id?: number;
  doctor_name?: string;
  chief_complaint?: string;
  diagnosis?: string;
  medical_notes?: string;
  vital_signs?: Record<string, string | number | null>;
  consultation_fee?: number;
}

export default function VisitReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientName, setPatientName] = useState('');
  const [medicalTests, setMedicalTests] = useState<MedicalTest[]>([]);

  const [visitData, setVisitData] = useState({
    chief_complaint: '',
    diagnosis: '',
    medical_notes: '',
    bp: '',
    temp: '',
    pulse: '',
    weight: '',
    consultation_fee: '',
  });

  const [labTests, setLabTests] = useState<LabTest[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [visitRes, testsRes] = await Promise.all([
          apiClient.getVisit<VisitSummary>(Number(id)),
          apiClient.getMedicalTests<MedicalTest>(),
        ]);
        const visit = visitRes.visit || visitRes.data;
        if (!visit) {
          throw new Error('Visit data not found');
        }
        setPatientName(visit.patient_name || `Patient #${visit.patient_id}`);
        setMedicalTests(testsRes.data || []);
        setVisitData({
          chief_complaint: visit.chief_complaint || '',
          diagnosis: visit.diagnosis || '',
          medical_notes: visit.medical_notes || '',
          bp: String(visit.vital_signs?.bp || ''),
          temp: String(visit.vital_signs?.temp || ''),
          pulse: String(visit.vital_signs?.pulse || ''),
          weight: String(visit.vital_signs?.weight || ''),
          consultation_fee: String(visit.consultation_fee || ''),
        });
      } catch {
        setError('Failed to load visit or medical tests');
      }
    };
    fetchData();
  }, [id]);

  const addLabTest = () => {
    setLabTests([...labTests, { test_name: '', test_type: '', cost: '', priority: 'normal', notes: '' }]);
  };

  const removeLabTest = (idx: number) => {
    setLabTests(labTests.filter((_, i) => i !== idx));
  };

  const updateLabTest = (idx: number, field: keyof LabTest, value: string) => {
    const copy = [...labTests];
    copy[idx] = { ...copy[idx], [field]: value };
    setLabTests(copy);
  };

  const handleSelectCatalogTest = (idx: number, testId: string) => {
    const test = medicalTests.find((t) => String(t.id) === testId);
    if (!test) return;
    const copy = [...labTests];
    copy[idx] = {
      ...copy[idx],
      test_name: test.test_name,
      test_type: test.category || '',
      cost: String(test.cost),
    };
    setLabTests(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      chief_complaint: visitData.chief_complaint || null,
      diagnosis: visitData.diagnosis || null,
      medical_notes: visitData.medical_notes || null,
      vital_signs: {
        bp: visitData.bp || null,
        temp: visitData.temp || null,
        pulse: visitData.pulse || null,
        weight: visitData.weight || null,
      },
      consultation_fee: visitData.consultation_fee ? Number(visitData.consultation_fee) : 0,
      lab_tests: labTests
        .filter((t) => t.test_name.trim() !== '')
        .map((t) => ({
          test_name: t.test_name,
          test_type: t.test_type || null,
          cost: t.cost ? Number(t.cost) : 0,
          priority: t.priority,
          notes: t.notes || null,
        })),
    };

    try {
      await apiClient.doctorReviewVisit(Number(id), payload);
      router.push(`/visits/${id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to submit review'));
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href={`/visits/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Stethoscope size={28} />
              Doctor Review
            </h1>
            <p className="text-gray-600">Patient: {patientName}</p>
          </div>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} /></div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Visit Record</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="Chief Complaint" value={visitData.chief_complaint} onChange={(e) => setVisitData({ ...visitData, chief_complaint: e.target.value })} />
              <Input label="Diagnosis" value={visitData.diagnosis} onChange={(e) => setVisitData({ ...visitData, diagnosis: e.target.value })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Medical Notes</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={visitData.medical_notes}
                  onChange={(e) => setVisitData({ ...visitData, medical_notes: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Input label="BP" value={visitData.bp} onChange={(e) => setVisitData({ ...visitData, bp: e.target.value })} placeholder="e.g. 120/80" />
                <Input label="Temp (°C)" value={visitData.temp} onChange={(e) => setVisitData({ ...visitData, temp: e.target.value })} />
                <Input label="Pulse" value={visitData.pulse} onChange={(e) => setVisitData({ ...visitData, pulse: e.target.value })} />
                <Input label="Weight (kg)" value={visitData.weight} onChange={(e) => setVisitData({ ...visitData, weight: e.target.value })} />
              </div>
              <Input label="Consultation Fee (Tshs)" type="number" value={visitData.consultation_fee} onChange={(e) => setVisitData({ ...visitData, consultation_fee: e.target.value })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Lab Tests</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addLabTest}>
                <Plus size={16} className="mr-1" />
                Add Test
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {labTests.length === 0 && <p className="text-gray-600 text-sm">No lab tests added.</p>}
              {labTests.map((test, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">Test #{idx + 1}</span>
                    <Button type="button" variant="danger" size="sm" onClick={() => removeLabTest(idx)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select from Catalog</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value=""
                        onChange={(e) => handleSelectCatalogTest(idx, e.target.value)}
                      >
                        <option value="">— Choose a test —</option>
                        {medicalTests.map((mt) => (
                          <option key={mt.id} value={mt.id}>
                            {mt.test_name} {mt.category ? `(${mt.category})` : ''} — Tshs {Number(mt.cost).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input label="Test Name" value={test.test_name} onChange={(e) => updateLabTest(idx, 'test_name', e.target.value)} required />
                    <Input label="Test Type" value={test.test_type} onChange={(e) => updateLabTest(idx, 'test_type', e.target.value)} />
                    <Input label="Cost (Tshs)" type="number" value={test.cost} onChange={(e) => updateLabTest(idx, 'cost', e.target.value)} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={test.priority}
                        onChange={(e) => updateLabTest(idx, 'priority', e.target.value)}
                      >
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>
                  <Input label="Notes" value={test.notes} onChange={(e) => updateLabTest(idx, 'notes', e.target.value)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Link href={`/visits/${id}`}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
            <Button type="submit" variant="primary" isLoading={loading}>
              Forward to Cashier
            </Button>
          </div>
        </form>
      </main>
    </Layout>
  );
}
