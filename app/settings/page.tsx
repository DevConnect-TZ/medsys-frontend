'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import { Settings, User, Lock, Bell, FlaskConical, CalendarDays } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    appointment_reminders: true,
    lab_result_alerts: true,
  });

  // Doctor schedules state (admin only)
  interface Schedule {
    id: number;
    doctor_id: number;
    doctor_name: string;
    day_of_week: number;
    day_name: string;
    start_time: string;
    end_time: string;
    is_active: boolean;
  }

  interface Doctor {
    id: number;
    name: string;
  }

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    doctor_id: '',
    day_of_week: '1',
    start_time: '08:00',
    end_time: '17:00',
    is_active: true,
  });

  const fetchSchedules = useCallback(async () => {
    try {
      setSchedulesLoading(true);
      const [schedulesRes, doctorsRes] = await Promise.all([
        apiClient.getDoctorSchedules<Schedule>(),
        apiClient.get<{ data?: Doctor[] }>('/doctors'),
      ]);
      setSchedules(schedulesRes.data || []);
      setDoctors(doctorsRes.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load doctor schedules'));
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin && activeTab === 'doctor_schedules') {
      fetchSchedules();
    }
  }, [activeTab, isAdmin, fetchSchedules]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiClient.createDoctorSchedule({
        ...scheduleForm,
        doctor_id: parseInt(scheduleForm.doctor_id),
        day_of_week: parseInt(scheduleForm.day_of_week),
      });
      setSuccess('Schedule added successfully');
      setScheduleForm({ doctor_id: '', day_of_week: '1', start_time: '08:00', end_time: '17:00', is_active: true });
      fetchSchedules();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to add schedule'));
    }
  };

  const toggleScheduleStatus = async (schedule: Schedule) => {
    setError('');
    setSuccess('');
    try {
      await apiClient.updateDoctorSchedule(schedule.id, { is_active: !schedule.is_active });
      setSuccess('Schedule updated successfully');
      fetchSchedules();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update schedule'));
    }
  };

  const deleteSchedule = async (id: number) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    setError('');
    setSuccess('');
    try {
      await apiClient.deleteDoctorSchedule(id);
      setSuccess('Schedule deleted successfully');
      fetchSchedules();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete schedule'));
    }
  };

  const dayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user, router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // API call to update profile
      // await apiClient.updateProfile(profileData);
      setSuccess('Profile updated successfully');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update profile'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      // API call to change password
      // await apiClient.changePassword(passwordData);
      setSuccess('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to change password'));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // API call to update notification settings
      // await apiClient.updateNotificationSettings(notificationSettings);
      setSuccess('Notification settings updated successfully');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update settings'));
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    ...(isAdmin ? [
      { id: 'medical_tests', label: 'Medical Tests', icon: FlaskConical },
      { id: 'doctor_schedules', label: 'Doctor Schedules', icon: CalendarDays },
    ] : []),
  ];

  return (
    <Layout>
      <main className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Settings size={32} />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
        </div>

        {/* Error/Success Alerts */}
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError('')}
          />
        )}
        {success && (
          <Alert
            type="success"
            message={success}
            onClose={() => setSuccess('')}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-600'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <Input
                      label="Full Name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({ ...profileData, email: e.target.value })
                      }
                      required
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) =>
                        setProfileData({ ...profileData, phone: e.target.value })
                      }
                    />
                    <div className="pt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={loading}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      value={passwordData.current_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          current_password: e.target.value,
                        })
                      }
                      required
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={passwordData.new_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          new_password: e.target.value,
                        })
                      }
                      required
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={passwordData.confirm_password}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirm_password: e.target.value,
                        })
                      }
                      required
                    />
                    <div className="pt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        isLoading={loading}
                      >
                        Update Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Medical Tests Admin Link Tab */}
            {activeTab === 'medical_tests' && isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Medical Tests Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Manage the list of hospital lab tests, categories, and costs that doctors can select from during appointment reviews.
                  </p>
                  <a href="/settings/medical-tests">
                    <Button variant="primary">Open Medical Tests</Button>
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Doctor Schedules Tab */}
            {activeTab === 'doctor_schedules' && isAdmin && (
              <Card>
                <CardHeader>
                  <CardTitle>Doctor Schedules</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Manage doctor working hours. The system will use these schedules to check availability when creating appointments.
                  </p>

                  {/* Add Schedule Form */}
                  <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                      <select
                        value={scheduleForm.doctor_id}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, doctor_id: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select doctor</option>
                        {doctors.map((doc) => (
                          <option key={doc.id} value={doc.id}>Dr. {doc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
                      <select
                        value={scheduleForm.day_of_week}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {dayOptions.map((d) => (
                          <option key={d.value} value={d.value}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                      <input
                        type="time"
                        value={scheduleForm.start_time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                      <input
                        type="time"
                        value={scheduleForm.end_time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <Button type="submit" variant="primary">Add Schedule</Button>
                    </div>
                  </form>

                  {/* Schedules Table */}
                  {schedulesLoading ? (
                    <p className="text-gray-600 text-center py-8">Loading schedules...</p>
                  ) : schedules.length === 0 ? (
                    <p className="text-gray-600 text-center py-8">No schedules found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Doctor</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Day</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Start</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">End</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedules.map((s) => (
                            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">Dr. {s.doctor_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{s.day_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{s.start_time}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">{s.end_time}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                  {s.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleScheduleStatus(s)}
                                  >
                                    {s.is_active ? 'Deactivate' : 'Activate'}
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => deleteSchedule(s.id)}
                                  >
                                    Delete
                                  </Button>
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
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium text-gray-900">Email Notifications</p>
                        <p className="text-sm text-gray-600">
                          Receive notifications via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.email_notifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              email_notifications: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium text-gray-900">SMS Notifications</p>
                        <p className="text-sm text-gray-600">
                          Receive notifications via SMS
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.sms_notifications}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              sms_notifications: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b">
                      <div>
                        <p className="font-medium text-gray-900">Appointment Reminders</p>
                        <p className="text-sm text-gray-600">
                          Get reminders for upcoming appointments
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.appointment_reminders}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              appointment_reminders: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-900">Lab Result Alerts</p>
                        <p className="text-sm text-gray-600">
                          Get notified when lab results are ready
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.lab_result_alerts}
                          onChange={(e) =>
                            setNotificationSettings({
                              ...notificationSettings,
                              lab_result_alerts: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="pt-4">
                      <Button
                        variant="primary"
                        onClick={handleNotificationUpdate}
                        isLoading={loading}
                      >
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </Layout>
  );
}
