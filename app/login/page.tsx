'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { apiClient, getErrorMessage } from '@/lib/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Alert } from '@/components/Alert';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Activity } from 'lucide-react';

const demoAccounts = [
  { label: 'Admin', email: 'admin@hospital.com', password: 'AdminPass123!@', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
  { label: 'Doctor', email: 'doctor@hospital.com', password: 'DemoPass123!@', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { label: 'Nurse', email: 'nurse@hospital.com', password: 'DemoPass123!@', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { label: 'Receptionist', email: 'receptionist@hospital.com', password: 'DemoPass123!@', color: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' },
  { label: 'Cashier', email: 'cashier@hospital.com', password: 'DemoPass123!@', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { label: 'Lab Tech', email: 'lab@hospital.com', password: 'DemoPass123!@', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { label: 'Pharmacist', email: 'pharmacist@hospital.com', password: 'DemoPass123!@', color: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100' },
];

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [email, setEmail] = useState('admin@hospital.com');
  const [password, setPassword] = useState('AdminPass123!@');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.login(email, password);

      if (response.token && response.user) {
        setToken(response.token);
        setUser(response.user);
        router.push('/dashboard');
      } else {
        setError('Invalid response from server');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (acc: typeof demoAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
  };

  return (
    <div className="min-h-screen flex text-slate-900 bg-white">
      {/* Left panel: Branding / visual */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-slate-900 text-white relative overflow-hidden p-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-blue-600/30 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-teal-600/20 to-transparent"></div>
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-[pulse_8s_ease-in-out_infinite]"></div>
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-[pulse_8s_ease-in-out_infinite_2s]"></div>
        </div>

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-white/20 shadow-xl bg-white">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" priority />
            </div>
            <span className="text-3xl font-bold tracking-tight">AFYA <span className="font-light text-white/70">Medical</span></span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight mb-6">
            Empowering Healthcare Professionals.
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed mb-8 border-l-2 border-blue-500 pl-4">
            Access patient records, schedule appointments, and manage clinical operations through our secure unified platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
              <ShieldCheck className="text-teal-400" size={20} />
              <span className="text-sm font-medium tracking-wide">Enterprise-grade Security</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10 backdrop-blur-sm">
              <Activity className="text-blue-400" size={20} />
              <span className="text-sm font-medium tracking-wide">Real-time Clinical Operations</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex gap-4 text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} AFYA Medical Center</p>
        </div>
      </div>

      {/* Right panel: Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-slate-50 lg:bg-white relative">
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 shadow-sm bg-white">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" priority />
            </div>
            <span className="text-xl font-bold tracking-tight">AFYA</span>
          </Link>
        </div>

        <div className="w-full max-w-md space-y-8 bg-white p-8 lg:p-10 rounded-2xl shadow-xl lg:shadow-none border border-slate-100 lg:border-transparent">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
            <p className="text-slate-500 mt-2">Enter your credentials to access the system.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError('')}
              />
            )}

            <div className="space-y-1">
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@afya.center"
                required
              />
            </div>

            <div className="space-y-1">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500" />
                <span className="text-slate-600 group-hover:text-slate-900 transition-colors">Remember device</span>
              </label>
              <Link href="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold shadow-md mt-6"
            >
              Sign in to Dashboard
            </Button>
          </form>

          <div className="pt-8 mt-8 border-t border-slate-100">
            <div className="bg-slate-50 rounded-xl p-5 text-sm border border-slate-200 shadow-sm inner-shadow">
              <p className="text-slate-700 font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck size={18} className="text-teal-600" />
                Demo Accounts — Click to autofill:
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillCredentials(acc)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${acc.color}`}
                  >
                    {acc.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs font-mono bg-white p-3 rounded border border-slate-100">
                <span className="text-slate-500">Email:</span> <span className="text-slate-900 font-medium">{email}</span>
                <span className="text-slate-500">Pass:</span> <span className="text-slate-900 font-medium">{password}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
