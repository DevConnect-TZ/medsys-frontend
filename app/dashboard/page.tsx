'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient, type ApiListResponse } from '@/lib/api';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Button } from '@/components/Button';
import { Alert } from '@/components/Alert';
import { usePermission } from '@/hooks/usePermission';
import { ROLE_PERMISSIONS } from '@/lib/roles';
import { Users, Calendar, TrendingUp, Activity, Clock, FlaskConical, Package, CreditCard, Stethoscope, Eye } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalPatients: number;
  totalAppointments: number;
  pendingAppointments: number;
  totalInvoices: number;
  totalLabs?: number;
  totalPrescriptions?: number;
  totalInventory?: number;
}

interface AppointmentSummary {
  status: string;
}

interface VisitSummary {
  id: number;
  patient_name: string;
  doctor_name: string;
  visit_date: string;
  status: string;
  chief_complaint?: string;
}

const emptyListResponse = <T,>(withData = false): ApiListResponse<T> => ({
  data: withData ? [] : undefined,
  meta: { total: 0 },
});

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuthStore();
  const { can } = usePermission();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Queue data for doctors
  const [queueTab, setQueueTab] = useState<'appointments' | 'visits'>('appointments');
  const [appointmentsQueue, setAppointmentsQueue] = useState<AppointmentSummary[]>([]);
  const [visitsQueue, setVisitsQueue] = useState<VisitSummary[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);

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
          // fetchStats will be called again when user state updates
        } catch (err) {
          console.error('Failed to load user:', err);
          router.push('/login');
        }
      };
      fetchUser();
      return; // Wait for user to be loaded before fetching stats
    }

    // Only fetch stats if user is loaded
    if (!user) {
      return;
    }

    // Fetch dashboard data based on role
    const fetchStats = async () => {
      try {
        const requests = [];

        // Everyone can see some data
        if (can('view_patients')) {
          requests.push(apiClient.getPatients(1).catch(() => emptyListResponse()));
        }
        if (can('view_appointments')) {
          requests.push(apiClient.getAppointments(1).catch(() => emptyListResponse<AppointmentSummary>(true)));
        }
        if (can('view_invoices')) {
          requests.push(apiClient.getInvoices(1).catch(() => emptyListResponse()));
        }
        if (can('view_labs')) {
          requests.push(apiClient.getLabOrders(1).catch(() => emptyListResponse()));
        }
        if (can('view_prescriptions')) {
          requests.push(apiClient.getPrescriptions(1).catch(() => emptyListResponse()));
        }

        // Fetch queue data for doctors in parallel
        const queueRequests = [];
        if (user?.role === 'doctor') {
          queueRequests.push(
            apiClient.getAppointments(1, { my_queue: true, per_page: 10 }).catch(() => emptyListResponse<AppointmentSummary>(true))
          );
          queueRequests.push(
            apiClient.getVisits(1, { doctor_id: user.id, date: new Date().toISOString().split('T')[0], per_page: 10 }).catch(() => emptyListResponse<VisitSummary>(true))
          );
        }

        const [results, queueResults] = await Promise.all([
          Promise.all(requests),
          Promise.all(queueRequests),
        ]);
        let resultsIndex = 0;

        const newStats: DashboardStats = {
          totalPatients: 0,
          totalAppointments: 0,
          pendingAppointments: 0,
          totalInvoices: 0,
        };

        if (can('view_patients')) {
          newStats.totalPatients = results[resultsIndex++]?.meta?.total || 0;
        }
        if (can('view_appointments')) {
          const appts = (results[resultsIndex++] || emptyListResponse<AppointmentSummary>(true)) as ApiListResponse<AppointmentSummary>;
          newStats.totalAppointments = appts.meta?.total || 0;
          newStats.pendingAppointments = appts.data?.filter((appointment) => appointment.status === 'scheduled').length || 0;
        }
        if (can('view_invoices')) {
          newStats.totalInvoices = results[resultsIndex++]?.meta?.total || 0;
        }
        if (can('view_labs')) {
          newStats.totalLabs = results[resultsIndex++]?.meta?.total || 0;
        }
        if (can('view_prescriptions')) {
          newStats.totalPrescriptions = results[resultsIndex++]?.meta?.total || 0;
        }

        setStats(newStats);

        // Set queue data
        if (user?.role === 'doctor') {
          const apptsRes = queueResults[0] as ApiListResponse<AppointmentSummary>;
          const visitsRes = queueResults[1] as ApiListResponse<VisitSummary>;
          setAppointmentsQueue(apptsRes.data || []);
          setVisitsQueue(visitsRes.data || []);
        }
      } catch (err) {
        console.error('Failed to load stats:', err);
        setStats({
          totalPatients: 0,
          totalAppointments: 0,
          pendingAppointments: 0,
          totalInvoices: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    if (token || storedToken) {
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Dynamic dashboard cards based on permissions
  const getDashboardCards = () => {
    const cards = [];

    if (can('view_patients')) {
      cards.push({
        title: 'Total Patients',
        value: stats?.totalPatients || 0,
        icon: Users,
        color: 'blue',
        href: '/patients',
      });
    }

    if (can('view_appointments')) {
      cards.push(
        {
          title: 'Appointments',
          value: stats?.totalAppointments || 0,
          icon: Calendar,
          color: 'purple',
          href: '/appointments',
        },
        {
          title: 'Pending Appointments',
          value: stats?.pendingAppointments || 0,
          icon: Clock,
          color: 'orange',
          href: '/appointments',
        }
      );
    }

    if (can('view_labs')) {
      cards.push({
        title: 'Lab Orders',
        value: stats?.totalLabs || 0,
        icon: FlaskConical,
        color: 'indigo',
        href: '/labs',
      });
    }

    if (can('view_prescriptions')) {
      cards.push({
        title: 'Prescriptions',
        value: stats?.totalPrescriptions || 0,
        icon: Package,
        color: 'pink',
        href: '/prescriptions',
      });
    }

    if (can('view_invoices')) {
      cards.push({
        title: 'Invoices',
        value: stats?.totalInvoices || 0,
        icon: CreditCard,
        color: 'green',
        href: '/invoices',
      });
    }

    return cards;
  };

  const dashboardCards = getDashboardCards();

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    purple: 'bg-purple-100 text-purple-700 border-purple-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    green: 'bg-green-100 text-green-700 border-green-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    pink: 'bg-pink-100 text-pink-700 border-pink-200',
  };

  // Get quick actions based on role
  const getQuickActions = () => {
    const actions = [];

    if (can('create_patients')) {
      actions.push({
        label: 'Register New Patient',
        href: '/patients/new',
        color: 'blue',
      });
    }

    if (can('create_appointments')) {
      actions.push({
        label: 'Schedule Appointment',
        href: '/appointments/new',
        color: 'purple',
      });
    }

    if (can('create_visits')) {
      actions.push({
        label: 'Record Visit',
        href: '/visits/new',
        color: 'emerald',
      });
    }

    if (can('create_lab_orders')) {
      actions.push({
        label: 'Order Lab Test',
        href: '/labs/new',
        color: 'indigo',
      });
    }

    if (can('create_prescriptions')) {
      actions.push({
        label: 'Create Prescription',
        href: '/prescriptions/new',
        color: 'pink',
      });
    }

    if (can('create_invoices')) {
      actions.push({
        label: 'Create Invoice',
        href: '/invoices/new',
        color: 'green',
      });
    }

    if (can('invite_users')) {
      actions.push({
        label: 'Invite Staff Member',
        href: '/users',
        color: 'gray',
      });
    }

    return actions;
  };

  const quickActions = getQuickActions();
  const roleInfo = user ? ROLE_PERMISSIONS[user.role] : null;

  return (
    <Layout>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'User'}
            </h1>
            <p className="text-slate-500 mt-1 sm:mt-2 text-base sm:text-lg">Here&apos;s what&apos;s happening at AFYA Medical Center today.</p>
          </div>
          {roleInfo && (
            <div className="inline-flex self-start md:self-auto items-center gap-2 bg-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-slate-200 shadow-sm mt-2 md:mt-0">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 uppercase tracking-wider">
                {roleInfo.label}
              </span>
            </div>
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

        {/* Stats Cards */}
        {dashboardCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {dashboardCards.map((card, index) => {
              const Icon = card.icon;
              const colorClass = colorClasses[card.color as keyof typeof colorClasses];

              return (
                <Link key={`${card.title}-${index}`} href={card.href}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 font-medium">{card.title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                          {loading ? '-' : card.value}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg border ${colorClass}`}>
                        <Icon size={24} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="h-full">
                <CardContent className="flex items-center justify-between p-6">
                  <div className="space-y-3 w-1/2">
                    <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-slate-200 rounded animate-pulse w-3/4"></div>
                  </div>
                  <div className="w-12 h-12 bg-slate-200 rounded-lg animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-slate-600 font-medium">No dashboard data available. Check your permissions.</p>
          </div>
        )}

        {/* Doctor Queue */}
        {user?.role === 'doctor' && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                  onClick={() => setQueueTab('appointments')}
                  className={`pb-3 text-sm font-semibold flex items-center gap-2 ${queueTab === 'appointments' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Calendar size={18} />
                  Appointments Queue
                  <span className="ml-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {appointmentsQueue.length}
                  </span>
                </button>
                <button
                  onClick={() => setQueueTab('visits')}
                  className={`pb-3 text-sm font-semibold flex items-center gap-2 ${queueTab === 'visits' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Stethoscope size={18} />
                  Visits Queue
                  <span className="ml-1 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {visitsQueue.length}
                  </span>
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {queueLoading ? (
                <p className="text-gray-600 text-center py-8">Loading queue...</p>
              ) : queueTab === 'appointments' ? (
                appointmentsQueue.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">No appointments in your queue</p>
                ) : (
                  <div className="space-y-3">
                    {appointmentsQueue.slice(0, 5).map((appt: any) => (
                      <div key={appt.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                        <div>
                          <p className="font-medium text-gray-900">{appt.patient_name || `Patient #${appt.patient_id}`}</p>
                          <p className="text-sm text-gray-500">{appt.appointment_date} • {appt.appointment_time}</p>
                        </div>
                        <Link href={`/appointments/${appt.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye size={16} className="mr-1" />
                            View
                          </Button>
                        </Link>
                      </div>
                    ))}
                    {appointmentsQueue.length > 5 && (
                      <div className="text-center">
                        <Link href="/appointments" className="text-sm text-blue-600 hover:underline font-medium">
                          View all appointments →
                        </Link>
                      </div>
                    )}
                  </div>
                )
              ) : visitsQueue.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No visits scheduled for today</p>
              ) : (
                <div className="space-y-3">
                  {visitsQueue.slice(0, 5).map((visit) => (
                    <div key={visit.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">{visit.patient_name}</p>
                        <p className="text-sm text-gray-500">{visit.visit_date} • {visit.chief_complaint || 'No complaint recorded'}</p>
                      </div>
                      <Link href={`/visits/${visit.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye size={16} className="mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  ))}
                  {visitsQueue.length > 5 && (
                    <div className="text-center">
                      <Link href="/visits" className="text-sm text-blue-600 hover:underline font-medium">
                        View all visits →
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions & User Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Quick Actions */}
          {quickActions.length > 0 && (
            <Card>
              <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <TrendingUp size={18} className="sm:w-5 sm:h-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {quickActions.map((action) => {
                    const actionColorClasses = {
                      blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
                      purple: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200',
                      emerald: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border-teal-200',
                      indigo: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200',
                      pink: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200',
                      green: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
                      gray: 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200',
                    };

                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className={`flex items-center p-3 sm:p-4 rounded-xl border transition-all duration-200 font-medium shadow-sm hover:shadow text-sm sm:text-base ${actionColorClasses[action.color as keyof typeof actionColorClasses]}`}
                      >
                        <span className="text-lg mr-2 font-bold">+</span> {action.label}
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User Info & Permissions */}
          <Card>
            <CardHeader className="pb-3 sm:pb-4 p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Activity size={18} className="sm:w-5 sm:h-5" />
                Your Profile & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5">
                <div className="border-b pb-2 sm:pb-3">
                  <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5 sm:mb-1 uppercase tracking-wider font-medium">Name</p>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">{user?.name}</p>
                </div>
                <div className="border-b pb-2 sm:pb-3">
                  <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5 sm:mb-1 uppercase tracking-wider font-medium">Email</p>
                  <p className="text-sm sm:text-base font-semibold text-slate-900 truncate">{user?.email}</p>
                </div>
                <div className="border-b pb-2 sm:pb-3">
                  <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5 sm:mb-1 uppercase tracking-wider font-medium">Role</p>
                  <p className="text-sm sm:text-base font-semibold text-blue-700 capitalize">{roleInfo?.label}</p>
                </div>
                <div className="border-b pb-2 sm:pb-3">
                  <p className="text-[11px] sm:text-sm text-slate-500 mb-0.5 sm:mb-1 uppercase tracking-wider font-medium">Status</p>
                  <p className="text-sm sm:text-base font-semibold text-emerald-600">
                    {user?.is_active ? '✓ Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {/* Show role permissions */}
              {roleInfo && roleInfo.permissions.length > 0 && (
                <div className="pt-1 sm:pt-2">
                  <p className="text-[11px] sm:text-sm text-slate-500 mb-2 sm:mb-3 uppercase tracking-wider font-medium">Your Permissions</p>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {roleInfo.permissions.slice(0, 8).map((perm) => (
                      <span
                        key={perm}
                        className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-[10px] sm:text-xs rounded border border-slate-200 font-semibold shadow-sm capitalize"
                      >
                        {perm.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {roleInfo.permissions.length > 8 && (
                      <span className="inline-block px-2 py-1 bg-white text-slate-500 text-[10px] sm:text-xs rounded border border-dashed border-slate-300 font-semibold shadow-sm">
                        +{roleInfo.permissions.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </Layout>
  );
}
