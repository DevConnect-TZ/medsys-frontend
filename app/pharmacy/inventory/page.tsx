'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { Plus, Edit, Trash2, Package, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: number;
  medication_name: string;
  generic_name?: string;
  dosage?: string;
  form?: string;
  manufacturer?: string;
  quantity: number;
  reorder_level: number;
  unit_price: number;
  expiry_date?: string;
  batch_number?: string;
  is_low_stock?: boolean;
  is_expired?: boolean;
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
    manufacturer: candidate.manufacturer ? String(candidate.manufacturer) : undefined,
    quantity: Number(candidate.quantity || 0) || 0,
    reorder_level: Number(candidate.reorder_level || 0) || 0,
    unit_price: Number(candidate.unit_price || 0) || 0,
    expiry_date: candidate.expiry_date ? String(candidate.expiry_date) : undefined,
    batch_number: candidate.batch_number ? String(candidate.batch_number) : undefined,
    is_low_stock: Boolean(candidate.is_low_stock),
    is_expired: Boolean(candidate.is_expired),
  };
}

export default function PharmacyInventoryPage() {
  const router = useRouter();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    medication_name: '',
    generic_name: '',
    dosage: '',
    form: '',
    manufacturer: '',
    quantity: '',
    reorder_level: '10',
    unit_price: '',
    expiry_date: '',
    batch_number: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchInventory();
  }, [router]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await apiClient.getPharmacyInventory<InventoryItem>({ per_page: 100, hide_expired: false });
      const normalizedItems = (res.data || [])
        .map((item) => normalizeInventoryItem(item))
        .filter((item): item is InventoryItem => item !== null);
      setItems(normalizedItems);
      setError('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load inventory'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ medication_name: '', generic_name: '', dosage: '', form: '', manufacturer: '', quantity: '', reorder_level: '10', unit_price: '', expiry_date: '', batch_number: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      medication_name: item.medication_name,
      generic_name: item.generic_name || '',
      dosage: item.dosage || '',
      form: item.form || '',
      manufacturer: item.manufacturer || '',
      quantity: String(item.quantity),
      reorder_level: String(item.reorder_level),
      unit_price: String(item.unit_price),
      expiry_date: item.expiry_date || '',
      batch_number: item.batch_number || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      medication_name: formData.medication_name,
      generic_name: formData.generic_name || null,
      dosage: formData.dosage || null,
      form: formData.form || null,
      manufacturer: formData.manufacturer || null,
      quantity: Number(formData.quantity) || 0,
      reorder_level: Number(formData.reorder_level) || 0,
      unit_price: Number(formData.unit_price) || 0,
      expiry_date: formData.expiry_date || null,
      batch_number: formData.batch_number || null,
    };

    try {
      if (editingId) {
        await apiClient.updatePharmacyInventory(editingId, payload);
      } else {
        await apiClient.createPharmacyInventory(payload);
      }
      resetForm();
      fetchInventory();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save inventory item'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this inventory item?')) return;
    try {
      await apiClient.delete(`/pharmacy/inventory/${id}`);
      fetchInventory();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete'));
    }
  };

  return (
    <Layout>
      <main className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package size={32} />
              Pharmacy Inventory
            </h1>
            <p className="text-gray-600 mt-1">Manage available medicines, stock levels, and costs</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={18} className="mr-2" />
            Add Medicine
          </Button>
        </div>

        {error && (
          <div className="mb-6 space-y-3">
            <Alert type="error" message={error} onClose={() => setError('')} />
            <Button variant="outline" size="sm" onClick={fetchInventory}>
              Retry Loading Inventory
            </Button>
          </div>
        )}

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle>{editingId ? 'Edit Medicine' : 'New Medicine'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input label="Medication Name" value={formData.medication_name} onChange={(e) => setFormData({ ...formData, medication_name: e.target.value })} required />
                  <Input label="Generic Name" value={formData.generic_name} onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })} />
                  <Input label="Dosage" value={formData.dosage} onChange={(e) => setFormData({ ...formData, dosage: e.target.value })} />
                  <Input label="Form" value={formData.form} onChange={(e) => setFormData({ ...formData, form: e.target.value })} placeholder="Tablet, Syrup, Injection..." />
                  <Input label="Manufacturer" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} />
                  <Input label="Batch Number" value={formData.batch_number} onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })} />
                  <Input label="Quantity" type="number" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} required />
                  <Input label="Reorder Level" type="number" value={formData.reorder_level} onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })} />
                  <Input label="Unit Price (Tshs)" type="number" value={formData.unit_price} onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })} required />
                  <Input label="Expiry Date" type="date" value={formData.expiry_date} onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={resetForm} type="button">Cancel</Button>
                  <Button type="submit" variant="primary">{editingId ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Inventory ({items.length} items)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : items.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No inventory items found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Dosage</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Form</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Stock</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Price</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Expiry</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="font-medium">{item.medication_name}</div>
                          {item.generic_name && <div className="text-xs text-gray-500">{item.generic_name}</div>}
                        </td>
                        <td className="py-3 px-4">{item.dosage || '—'}</td>
                        <td className="py-3 px-4">{item.form || '—'}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className={item.is_low_stock ? 'text-red-600 font-semibold' : ''}>{item.quantity}</span>
                            {item.is_low_stock && <AlertCircle size={14} className="text-red-600" />}
                          </div>
                        </td>
                        <td className="py-3 px-4">Tshs {Number(item.unit_price).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={item.is_expired ? 'text-red-600 text-sm' : 'text-sm'}>
                            {item.expiry_date || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(item)}><Edit size={14} /></Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}><Trash2 size={14} /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
