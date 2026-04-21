'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ArrowLeft, FileText, Plus, Trash2, CreditCard, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface Patient {
  id: number;
  patient_number: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [tax, setTax] = useState('');
  const [discount, setDiscount] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', quantity: 1, unit_price: 0, total: 0 },
  ]);

  const fetchPatients = useCallback(async () => {
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
  }, [patientSearch]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
  }, [router]);

  const addItem = (preset?: { description: string; unit_price: number }) => {
    setItems([
      ...items,
      {
        description: preset?.description || '',
        quantity: 1,
        unit_price: preset?.unit_price || 0,
        total: preset?.unit_price || 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const copy = [...items];
    const item = { ...copy[idx], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      item.total = Number(item.quantity || 0) * Number(item.unit_price || 0);
    }
    copy[idx] = item;
    setItems(copy);
  };

  const subtotal = items.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  const taxAmount = tax ? (subtotal * Number(tax)) / 100 : 0;
  const discountAmount = discount ? (subtotal * Number(discount)) / 100 : 0;
  const total = subtotal + taxAmount - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError('Please select a patient');
      return;
    }
    const validItems = items.filter((i) => i.description.trim() !== '');
    if (validItems.length === 0) {
      setError('Please add at least one line item');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.createInvoice({
        patient_id: selectedPatient.id,
        invoice_date: invoiceDate,
        items: JSON.stringify(validItems),
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(taxAmount.toFixed(2)),
        discount: Number(discountAmount.toFixed(2)),
        total: Number(total.toFixed(2)),
      });
      router.push('/invoices');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create invoice'));
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/invoices">
            <Button variant="outline" size="sm">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileText size={32} />
              Create Invoice
            </h1>
            <p className="text-gray-600 mt-1">Create a new billing invoice for a patient</p>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Alert type="error" message={error} onClose={() => setError('')} />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
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

              <Input
                label="Invoice Date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />

              {/* Quick-add fee buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quick Add Items</label>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem({ description: 'Registration Fee', unit_price: 5000 })}>
                    <UserPlus size={14} className="mr-1" />
                    Registration Fee
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem({ description: 'Patient Card Fee', unit_price: 2000 })}>
                    <CreditCard size={14} className="mr-1" />
                    Card Fee
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => addItem()}>
                    <Plus size={14} className="mr-1" />
                    Custom Item
                  </Button>
                </div>
              </div>

              {/* Line Items */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-left py-2">Qty</th>
                      <th className="text-left py-2">Unit Price (Tshs)</th>
                      <th className="text-left py-2">Total</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 pr-2">
                          <input
                            className="w-full px-2 py-1 border rounded"
                            value={item.description}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            placeholder="Item description"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="1"
                            className="w-16 px-2 py-1 border rounded"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            className="w-28 px-2 py-1 border rounded"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                          />
                        </td>
                        <td className="py-2 pr-2 font-medium">
                          {Number(item.total).toLocaleString()}
                        </td>
                        <td className="py-2">
                          {items.length > 1 && (
                            <Button type="button" variant="danger" size="sm" onClick={() => removeItem(idx)}>
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Tax (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Discount (%)"
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>Tshs {subtotal.toLocaleString()}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax ({tax}%)</span>
                    <span>Tshs {taxAmount.toLocaleString()}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount ({discount}%)</span>
                    <span>- Tshs {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">Tshs {total.toLocaleString()}</span>
                </div>
              </div>

              <CardFooter>
                <Link href="/invoices">
                  <Button variant="secondary" type="button">Cancel</Button>
                </Link>
                <Button type="submit" variant="primary" isLoading={loading}>
                  Create Invoice
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
