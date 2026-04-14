'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { ProtectedPage } from '@/components/ProtectedElement';
import { getRoleLabel } from '@/lib/roles';
import { Users, Mail, Plus } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'receptionist', label: 'Receptionist' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'nurse', label: 'Nurse' },
  { value: 'lab_technician', label: 'Lab Technician' },
  { value: 'pharmacist', label: 'Pharmacist' },
];

export default function UsersPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationOpen, setInvitationOpen] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    role: 'doctor',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check authentication and load user if needed
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token && !storedToken) {
      router.push('/login');
      return;
    }

    // If token exists but user is not loaded, fetch it
    if (!user && (token || storedToken)) {
      const fetchUser = async () => {
        try {
          const userData = await apiClient.getCurrentUser();
          setUser(userData.user);
        } catch (err) {
          console.error('Failed to load user:', err);
          router.push('/login');
        }
      };
      fetchUser();
      return;
    }

    // Fetch users
    const fetchUsers = async () => {
      try {
        const response = await apiClient.get<{ data?: User[] }>('/users');
        setUsers(response.data || []);
      } catch (err) {
        setError('Failed to load users');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, setUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Send invitation
      await apiClient.post('/invitations', {
        email: formData.email,
        role: formData.role,
      });

      setSuccess(`Invitation sent to ${formData.email}. They will receive an email with instructions to complete their registration.`);
      setFormData({ email: '', role: 'doctor' });
      setInvitationOpen(false);

      // Refresh users list
      const updatedUsers = await apiClient.get<{ data?: User[] }>('/users');
      setUsers(updatedUsers.data || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send invitation'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedPage requiredRoles={['admin']}>
      <Layout>
        <main className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-2">Invite and manage staff members (Admin Only)</p>
            </div>
            <Button
              variant="primary"
              onClick={() => setInvitationOpen(!invitationOpen)}
              className="flex items-center gap-2"
            >
              <Plus size={20} />
              Invite User
            </Button>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError('')}
            />
          )}

          {/* Success Alert */}
          {success && (
            <Alert
              type="success"
              message={success}
              onClose={() => setSuccess('')}
            />
          )}

          {/* Invitation Form */}
          {invitationOpen && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail size={20} />
                  Invite New User
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email Address"
                      type="email"
                      placeholder="user@hospital.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) =>
                          setFormData({ ...formData, role: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {ROLES.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button variant="primary" type="submit" disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setInvitationOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={20} />
                Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-600 text-center py-8">Loading users...</p>
              ) : users.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No users found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Email
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Role
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">
                          Joined
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="border-b border-gray-200 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 text-gray-900 font-medium">{user.name}</td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-sm font-medium capitalize">
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${user.is_active ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-900'}`}>
                              {user.is_active ? '✓ Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {new Date(user.created_at).toLocaleDateString()}
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
    </ProtectedPage>
  );
}
