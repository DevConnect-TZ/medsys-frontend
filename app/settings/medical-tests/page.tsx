'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { Plus, Edit, Trash2, FlaskConical } from 'lucide-react';

interface MedicalTest {
  id: number;
  test_name: string;
  test_code?: string;
  category?: string;
  description?: string;
  cost: number;
  is_active: boolean;
}

export default function MedicalTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<MedicalTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    test_name: '',
    test_code: '',
    category: '',
    description: '',
    cost: '',
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTests();
  }, [router]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res: any = await apiClient.getMedicalTests({ active_only: false, per_page: 100 });
      setTests(res.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load medical tests');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ test_name: '', test_code: '', category: '', description: '', cost: '' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (test: MedicalTest) => {
    setFormData({
      test_name: test.test_name,
      test_code: test.test_code || '',
      category: test.category || '',
      description: test.description || '',
      cost: String(test.cost),
    });
    setEditingId(test.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const payload = {
      test_name: formData.test_name,
      test_code: formData.test_code || null,
      category: formData.category || null,
      description: formData.description || null,
      cost: Number(formData.cost) || 0,
    };

    try {
      if (editingId) {
        await apiClient.updateMedicalTest(editingId, payload);
      } else {
        await apiClient.createMedicalTest(payload);
      }
      resetForm();
      fetchTests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save medical test');
    }
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm('Deactivate this medical test?')) return;
    try {
      await apiClient.deleteMedicalTest(id);
      fetchTests();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to deactivate');
    }
  };

  return (
    <Layout>
      <main className="max-w-5xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical size={32} />
              Medical Tests
            </h1>
            <p className="text-gray-600 mt-1">Manage hospital lab tests and their costs</p>
          </div>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            <Plus size={18} className="mr-2" />
            Add Test
          </Button>
        </div>

        {error && <div className="mb-6"><Alert type="error" message={error} onClose={() => setError('')} /></div>}

        {showForm && (
          <Card className="mb-6">
            <CardHeader><CardTitle>{editingId ? 'Edit Test' : 'New Test'}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label="Test Name" value={formData.test_name} onChange={(e) => setFormData({ ...formData, test_name: e.target.value })} required />
                  <Input label="Test Code" value={formData.test_code} onChange={(e) => setFormData({ ...formData, test_code: e.target.value })} />
                  <Input label="Category" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                  <Input label="Cost (Tshs)" type="number" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
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
          <CardHeader><CardTitle>All Tests ({tests.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-600 text-center py-8">Loading...</p>
            ) : tests.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No tests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Code</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Cost</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((test) => (
                      <tr key={test.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{test.test_name}</td>
                        <td className="py-3 px-4">{test.test_code || '—'}</td>
                        <td className="py-3 px-4">{test.category || '—'}</td>
                        <td className="py-3 px-4">Tshs {Number(test.cost).toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${test.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            {test.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(test)}><Edit size={14} /></Button>
                            {test.is_active && (
                              <Button variant="danger" size="sm" onClick={() => handleDeactivate(test.id)}><Trash2 size={14} /></Button>
                            )}
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
