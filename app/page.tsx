'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/Button';
import { Heart, Users, Calendar, FileText, Activity, Shield, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Patient Management',
    description: 'Complete patient records, medical history, and contact information accessible instantly.',
  },
  {
    icon: Calendar,
    title: 'Smart Appointments',
    description: 'Schedule and manage appointments with our specialists with minimal friction.',
  },
  {
    icon: FileText,
    title: 'Electronic Records',
    description: 'Digital storage of patient visits, diagnoses, and treatments ensuring continuity of care.',
  },
  {
    icon: Activity,
    title: 'Integrated Labs',
    description: 'Order and track laboratory tests and results directly from the physician dashboard.',
  },
  {
    icon: Heart,
    title: 'e-Prescriptions',
    description: 'Manage prescriptions and medication records securely linked to the pharmacy.',
  },
  {
    icon: Shield,
    title: 'Secure Billing',
    description: 'Frictionless invoice generation, insurance processing, and payment tracking.',
  },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden border border-slate-200 bg-white">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" priority />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              AFYA <span className="font-light text-slate-500 hidden sm:inline">Medical Center</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="hidden md:block">
              <Button variant="outline" className="border-slate-300 hover:bg-slate-100">
                Staff Portal
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="primary" className="bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-3 py-1.5 sm:px-4 sm:py-2">
                Sign In <ArrowRight size={16} className="hidden sm:block" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/hospital.jpg"
            alt="AFYA Medical Center facility"
            fill
            className="object-cover object-center"
            priority
          />
          {/* Create a gradient overlay so text is readable on the left, but image is clear on the right */}
          <div className="absolute inset-0 bg-white/75 sm:bg-transparent sm:bg-gradient-to-r sm:from-white/95 sm:via-white/60 sm:to-transparent"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[pulse_8s_ease-in-out_infinite]"></div>
          <div className="absolute top-20 -left-40 w-96 h-96 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-[pulse_8s_ease-in-out_infinite_2s]"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/90 backdrop-blur-sm border border-blue-200 text-blue-700 text-sm font-semibold mb-8 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            Next-generation Hospital Management
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight leading-tight">
            Healthcare Operations, <br className="hidden md:block" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600">Beautifully Streamlined.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-800 sm:text-slate-700 mb-10 max-w-2xl sm:mx-0 leading-relaxed font-medium">
            AFYA Medical Center's complete digital ecosystem for managing patients, appointments, medical records, and billing with uncompromising efficiency.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center sm:justify-start items-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 shadow-xl shadow-blue-600/20 hover:scale-105 transition-all">
                Access System
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 border-2 border-slate-300 hover:bg-slate-50 bg-white/80 backdrop-blur-sm text-slate-800">
              View Documentation
            </Button>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-white py-24 border-y border-slate-100 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4 tracking-tight">Enterprise-Grade Architecture</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Built for modern healthcare facilities requiring robust, secure, and intuitive tools.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group bg-white rounded-2xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-teal-50 rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
                  <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                    <Icon size={28} className="text-blue-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-slate-50 py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-900 rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="relative p-12 lg:p-16 grid grid-cols-1 md:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="pt-8 md:pt-0">
                <p className="text-5xl font-extrabold text-blue-400 mb-2">46<span className="text-blue-500">+</span></p>
                <p className="text-slate-400 font-medium tracking-wide">API Endpoints</p>
              </div>
              <div className="pt-8 md:pt-0">
                <p className="text-5xl font-extrabold text-teal-400 mb-2">10</p>
                <p className="text-slate-400 font-medium tracking-wide">Database Tables</p>
              </div>
              <div className="pt-8 md:pt-0">
                <p className="text-5xl font-extrabold text-indigo-400 mb-2">7</p>
                <p className="text-slate-400 font-medium tracking-wide">User Roles</p>
              </div>
              <div className="pt-8 md:pt-0">
                <p className="text-5xl font-extrabold text-white mb-2">99<span className="text-slate-300">%</span></p>
                <p className="text-slate-400 font-medium tracking-wide">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="relative w-6 h-6 rounded overflow-hidden">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">AFYA <span className="text-slate-500 font-normal">Medical Center</span></span>
          </div>
          <p className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} AFYA Medical Center. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
