'use client';

import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, LogOut, Home, Users, Calendar, FileText, Settings, Stethoscope, FlaskConical, Package } from 'lucide-react';
import { useState } from 'react';
import { usePermission } from '@/hooks/usePermission';

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { can, getMenuItems } = usePermission();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };

  // All available menu items with required permissions
  const allMenuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, permission: 'view_patients' },
    { label: 'Patients', href: '/patients', icon: Users, permission: 'view_patients' },
    { label: 'Appointments', href: '/appointments', icon: Calendar, permission: 'view_appointments' },
    { label: 'Visits', href: '/visits', icon: Stethoscope, permission: 'view_visits' },
    { label: 'Labs', href: '/labs', icon: FlaskConical, permission: 'view_labs' },
    { label: 'Prescriptions', href: '/prescriptions', icon: Package, permission: 'view_prescriptions' },
    { label: 'Invoices', href: '/invoices', icon: FileText, permission: 'view_invoices' },
    { label: 'Users', href: '/users', icon: Users, permission: 'view_users' },
    { label: 'Settings', href: '/settings', icon: Settings, permission: null },
  ];

  const roleMenuItems = getMenuItems();

  // Filter menu items based on user permissions and role menu items
  const visibleMenuItems = allMenuItems.filter(
    item => (!item.permission || can(item.permission)) && roleMenuItems.includes(item.label.toLowerCase())
  );

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" priority />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">AFYA</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            {visibleMenuItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
              >
                <Icon size={18} />
                <span className="text-sm">{label}</span>
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            {user && (
              <>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs font-medium capitalize bg-blue-100 text-blue-700 px-2 py-1 rounded">{user.role?.replace('_', ' ') || 'User'}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-700 hover:text-red-600 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-gray-700"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200">
            {visibleMenuItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}
            {user && (
              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
