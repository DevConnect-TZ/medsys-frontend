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
import { Users, Mail, Plus, Power, PowerOff, Search } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

interface Invitation {
  id: number;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  used_at?: string;
  created_at: string;
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
  const [activeTab, setActiveTab] = useState<'users' | 'invitations'>('users');

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userPage, setUserPage] = useState(1);
  const [userLastPage, setUserLastPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Invitations state
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invPage, setInvPage] = useState(1);
  const [invLastPage, setInvLastPage] = useState(1);
  const [invStatusFilter, setInvStatusFilter] = useState('all');

  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [invitationOpen, setInvitationOpen] = useState(false);
  const [formData, setFormData] = useState({ email: '', role: 'doctor' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && !storedToken) {
      router.push('/login');
      return;
    }
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
  }, [user, token, setUser, router]);

  const fetchUsers = async (page = 1) => {
    try {
      setUsersLoading(true);
      const params: Record<string, string | number | boolean> = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.is_active = statusFilter === 'active';

      const response = await apiClient.getUsers<User>(page, params);
      setUsers(response.data || []);
      setUserLastPage(response.meta?.last_page || 1);
      setUserPage(response.meta?.current_page || 1);
      setError('');
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchInvitations = async (page = 1) => {
    try {
      setInvitationsLoading(true);
      const params: Record<string, string | number> = {};
      if (invStatusFilter !== 'all') params.status = invStatusFilter;

      const response = await apiClient.getInvitations<Invitation>(page, params);
      setInvitations(response.data || []);
      setInvLastPage(response.meta?.last_page || 1);
      setInvPage(response.meta?.current_page || 1);
      setError('');
    } catch (err) {
      setError('Failed to load invitations');
      console.error(err);
    } finally {
      setInvitationsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'users') {
      fetchUsers(1);
    } else {
      fetchInvitations(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeTab, search, roleFilter, statusFilter, invStatusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.post('/invitations', {
        email: formData.email,
        role: formData.role,
      });
      setSuccess(`Invitation sent to ${formData.email}. They will receive an email with instructions to complete their registration.`);
      setFormData({ email: '', role: 'doctor' });
      setInvitationOpen(false);
      if (activeTab === 'invitations') fetchInvitations(1);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to send invitation'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (userId: number, name: string) => {
    if (!confirm(`Deactivate user "${name}"? They will no longer be able to log in.`)) return;
    try {
      await apiClient.deleteUser(userId);
      setSuccess(`User "${name}" deactivated successfully`);
      fetchUsers(userPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to deactivate user'));
    }
  };

  const handleActivate = async (userId: number, name: string) => {
    if (!confirm(`Reactivate user "${name}"?`)) return;
    try {
      await apiClient.updateUser(userId, { is_active: true });
      setSuccess(`User "${name}" activated successfully`);
      fetchUsers(userPage);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to activate user'));
    }
  };

  const getInvitationStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ProtectedPage requiredRoles={['admin']}>
      <Layout>
        <main className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-2">Invite, activate, deactivate and track staff members</p>
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

          {/* Alerts */}
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}
          {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

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
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                    <Button variant="outline" type="button" onClick={() => setInvitationOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-6">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'users'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users size={18} />
                  Users
                </button>
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === 'invitations'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Mail size={18} />
                  Invitations
                </button>
              </nav>
            </div>
          </div>

          {activeTab === 'users' ? (
            <>
              {/* User Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Users List */}
              <Card>
                <CardHeader>
                  <CardTitle>Users</CardTitle>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <p className="text-gray-600 text-center py-8">Loading users...</p>
                  ) : users.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No users found</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Joined</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((u) => (
                              <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 text-gray-900 font-medium">{u.name}</td>
                                <td className="py-3 px-4 text-gray-600">{u.email}</td>
                                <td className="py-3 px-4">
                                  <span className="inline-block px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-sm font-medium capitalize">
                                    {getRoleLabel(u.role)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${u.is_active ? 'bg-green-200 text-green-900' : 'bg-gray-300 text-gray-900'}`}>
                                    {u.is_active ? '✓ Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600">
                                  {formatDate(u.created_at)}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex gap-2">
                                    {u.is_active ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDeactivate(u.id, u.name)}
                                        className="text-amber-700 border-amber-300 hover:bg-amber-50"
                                      >
                                        <PowerOff size={14} className="mr-1" />
                                        Deactivate
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleActivate(u.id, u.name)}
                                        className="text-green-700 border-green-300 hover:bg-green-50"
                                      >
                                        <Power size={14} className="mr-1" />
                                        Activate
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {userLastPage > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6">
                          <Button variant="outline" size="sm" onClick={() => fetchUsers(userPage - 1)} disabled={userPage <= 1}>Previous</Button>
                          <span className="text-sm text-gray-600">Page {userPage} of {userLastPage}</span>
                          <Button variant="outline" size="sm" onClick={() => fetchUsers(userPage + 1)} disabled={userPage >= userLastPage}>Next</Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Invitation Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <select
                  value={invStatusFilter}
                  onChange={(e) => setInvStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending (Not Accepted)</option>
                  <option value="accepted">Accepted</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Invitations List */}
              <Card>
                <CardHeader>
                  <CardTitle>Invitations</CardTitle>
                </CardHeader>
                <CardContent>
                  {invitationsLoading ? (
                    <p className="text-gray-600 text-center py-8">Loading invitations...</p>
                  ) : invitations.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No invitations found</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Sent</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Expires</th>
                              <th className="text-left py-3 px-4 font-semibold text-gray-700">Accepted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invitations.map((inv) => (
                              <tr key={inv.id} className="border-b border-gray-200 hover:bg-gray-50">
                                <td className="py-3 px-4 text-gray-900 font-medium">{inv.email}</td>
                                <td className="py-3 px-4">
                                  <span className="inline-block px-3 py-1 bg-blue-200 text-blue-900 rounded-full text-sm font-medium capitalize">
                                    {getRoleLabel(inv.role)}
                                  </span>
                                </td>
                                <td className="py-3 px-4">{getInvitationStatusBadge(inv.status)}</td>
                                <td className="py-3 px-4 text-gray-600">{formatDate(inv.created_at)}</td>
                                <td className="py-3 px-4 text-gray-600">{formatDate(inv.expires_at)}</td>
                                <td className="py-3 px-4 text-gray-600">{inv.used_at ? formatDate(inv.used_at) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {invLastPage > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-6">
                          <Button variant="outline" size="sm" onClick={() => fetchInvitations(invPage - 1)} disabled={invPage <= 1}>Previous</Button>
                          <span className="text-sm text-gray-600">Page {invPage} of {invLastPage}</span>
                          <Button variant="outline" size="sm" onClick={() => fetchInvitations(invPage + 1)} disabled={invPage >= invLastPage}>Next</Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </main>
      </Layout>
    </ProtectedPage>
  );
}
