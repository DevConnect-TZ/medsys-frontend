'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ArrowLeft, Plus, Trash2, Pill, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  price: string;
  instructions: string;
}

interface InventoryItem {
  id: number;
  medication_name: string;
  generic_name?: string;
  dosage?: string;
  form?: string;
  quantity: number;
  unit_price: number;
}

interface LabResult {
  id?: number;
  test_name: string;
  results?: string;
}

interface VisitLabOrder {
  lab_result?: LabResult | null;
}

interface VisitSummary {
  patient_id: number;
  patient_name?: string;
  lab_orders?: VisitLabOrder[];
}

function normalizeInventoryItem(raw: unknown): InventoryItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  const id = Number(candidate.id);

  if (!Number.isFinite(id) || id <= 0) {
    return null;
  }

  return {
    id,
    medication_name: String(candidate.medication_name || 'Unnamed medication'),
    generic_name: candidate.generic_name ? String(candidate.generic_name) : undefined,
    dosage: candidate.dosage ? String(candidate.dosage) : undefined,
    form: candidate.form ? String(candidate.form) : undefined,
    quantity: Number(candidate.quantity || 0) || 0,
    unit_price: Number(candidate.unit_price || 0) || 0,
  };
}

export default function VisitPrescribePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [patientName, setPatientName] = useState('');
  const [labResults, setLabResults] = useState<LabResult[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [medications, setMedications] = useState<Medication[]>([
    { name: '', dosage: '', frequency: '', duration: '', quantity: '', price: '', instructions: '' },
  ]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setError('');
      try {
        const [visitResult, inventoryResult] = await Promise.allSettled([
          apiClient.getVisit<VisitSummary>(Number(id)),
          apiClient.getPharmacyInventory<InventoryItem>({ per_page: 200 }),
        ]);

        if (visitResult.status !== 'fulfilled') {
          throw visitResult.reason;
        }

        const res = visitResult.value;
        const visit = res.visit || res.data;
        if (!visit) {
          throw new Error('Visit data not found');
        }

        setPatientName(visit.patient_name || `Patient #${visit.patient_id}`);
        const results = (visit.lab_orders || [])
          .filter((labOrder): labOrder is VisitLabOrder & { lab_result: LabResult } => Boolean(labOrder.lab_result))
          .map((labOrder) => labOrder.lab_result);
        setLabResults(results);

        if (inventoryResult.status === 'fulfilled') {
          const normalizedInventory = (inventoryResult.value.data || [])
            .map((item) => normalizeInventoryItem(item))
            .filter((item): item is InventoryItem => item !== null);
          setInventory(normalizedInventory);
        } else {
          setInventory([]);
          setError('Visit loaded, but inventory is temporarily unavailable. You can still enter medicines manually.');
        }
      } catch (err: unknown) {
        setInventory([]);
        setError(getErrorMessage(err, 'Failed to load visit details'));
      }
    };
    fetchData();
  }, [id]);

  const addMed = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', quantity: '', price: '', instructions: '' }]);
  };

  const removeMed = (idx: number) => {
    setMedications(medications.filter((_, i) => i !== idx));
  };

  const updateMed = (idx: number, field: keyof Medication, value: string) => {
    const copy = [...medications];
    copy[idx] = { ...copy[idx], [field]: value };
    setMedications(copy);
  };

  const handleSelectInventoryItem = (idx: number, itemId: string) => {
    const item = inventory.find((i) => String(i.id) === itemId);
    if (!item) return;
    const copy = [...medications];
    copy[idx] = {
      ...copy[idx],
      name: item.medication_name,
      dosage: item.dosage || '',
      price: String(item.unit_price),
    };
    setMedications(copy);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      medications: medications
        .filter((m) => m.name.trim() !== '')
        .map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
          quantity: Number(m.quantity) || 0,
          price: m.price ? Number(m.price) : 0,
          instructions: m.instructions || null,
        })),
      notes: notes || null,
    };

    try {
      await apiClient.prescribeVisit(Number(id), payload);
      router.push(`/visits/${id}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create prescription'));
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
              <Pill size={28} />
              Prescribe Medicines
            </h1>
            <p className="text-gray-600">Patient: {patientName}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 space-y-3">
            <Alert type="error" message={error} onClose={() => setError('')} />
            <Button variant="outline" size="sm" type="button" onClick={() => window.location.reload()}>
              Retry Loading Data
            </Button>
          </div>
        )}

        {labResults.length > 0 && (
          <Card className="mb-6">
            <CardHeader><CardTitle>Lab Results Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {labResults.map((res, i) => (
                <div key={i} className="bg-green-50 p-3 rounded text-sm">
                  <strong>{res.test_name}:</strong> {res.results || 'See file'}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Medications</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addMed}>
                <Plus size={16} className="mr-1" />
                Add Medicine
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {medications.map((med, idx) => {
                const selectedItem = inventory.find((i) => i.medication_name === med.name);
                return (
                  <div key={idx} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">Medicine #{idx + 1}</span>
                      {medications.length > 1 && (
                        <Button type="button" variant="danger" size="sm" onClick={() => removeMed(idx)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select from Inventory</label>
                        <select
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedItem ? selectedItem.id : ''}
                          onChange={(e) => handleSelectInventoryItem(idx, e.target.value)}
                        >
                          <option value="">— Choose medicine —</option>
                          {inventory.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.medication_name} {item.dosage ? `(${item.dosage})` : ''} — Stock: {item.quantity} — Tshs {Number(item.unit_price).toLocaleString()}
                            </option>
                          ))}
                        </select>
                        {selectedItem && selectedItem.quantity <= 0 && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle size={12} /> Out of stock
                          </p>
                        )}
                      </div>
                      <Input label="Name" value={med.name} onChange={(e) => updateMed(idx, 'name', e.target.value)} required />
                      <Input label="Dosage" value={med.dosage} onChange={(e) => updateMed(idx, 'dosage', e.target.value)} required />
                      <Input label="Frequency" value={med.frequency} onChange={(e) => updateMed(idx, 'frequency', e.target.value)} required />
                      <Input label="Duration" value={med.duration} onChange={(e) => updateMed(idx, 'duration', e.target.value)} required />
                      <Input label="Quantity" type="number" value={med.quantity} onChange={(e) => updateMed(idx, 'quantity', e.target.value)} required />
                      <Input label="Price (Tshs)" type="number" value={med.price} onChange={(e) => updateMed(idx, 'price', e.target.value)} />
                    </div>
                    <Input label="Instructions" value={med.instructions} onChange={(e) => updateMed(idx, 'instructions', e.target.value)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
            <CardContent>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for the pharmacist or patient..."
              />
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
