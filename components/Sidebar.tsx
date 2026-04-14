'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LogOut,
  Home,
  Users,
  Calendar,
  FileText,
  Settings,
  Stethoscope,
  FlaskConical,
  Package,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import clsx from 'clsx';
import { usePermission } from '@/hooks/usePermission';
import Image from 'next/image';

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { can } = usePermission();
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    return localStorage.getItem('sidebarExpanded') !== 'false';
  });
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleMobileToggle = () => setIsMobileOpen(prev => !prev);
    window.addEventListener('toggleMobileSidebar', handleMobileToggle);
    return () => window.removeEventListener('toggleMobileSidebar', handleMobileToggle);
  }, []);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarExpanded', String(newState));
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsMobileOpen(false);
    }
  };

  const allMenuItems = [
    { label: 'Dashboard', href: '/dashboard', icon: Home, permission: 'view_patients' },
    { label: 'Patients', href: '/patients', icon: Users, permission: 'view_patients' },
    { label: 'Appointments', href: '/appointments', icon: Calendar, permission: 'view_appointments' },
    { label: 'Visits', href: '/visits', icon: Stethoscope, permission: 'view_visits' },
    { label: 'Labs', href: '/labs', icon: FlaskConical, permission: 'view_labs' },
    { label: 'Prescriptions', href: '/prescriptions', icon: Package, permission: 'view_prescriptions' },
    { label: 'Inventory', href: '/pharmacy/inventory', icon: Package, permission: 'view_inventory' },
    { label: 'Invoices', href: '/invoices', icon: FileText, permission: 'view_invoices' },
    { label: 'Users', href: '/users', icon: Users, permission: 'view_users' },
    { label: 'Settings', href: '/settings', icon: Settings, permission: null },
  ];

  const visibleMenuItems = allMenuItems.filter(
    item => !item.permission || can(item.permission)
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <div
        className={clsx(
          'fixed left-0 top-0 h-[100dvh] bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 ease-in-out z-50 flex flex-col',
          // Desktop horizontal sizing
          isExpanded ? 'md:w-64' : 'md:w-20',
          // Mobile state (always full 64 width, but translated on/off screen)
          'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
            <div className="relative w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" priority />
            </div>
            <span className={clsx("text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap transition-opacity duration-300", isExpanded ? "opacity-100" : "md:opacity-0 md:w-0 md:hidden")}>
              AFYA
            </span>
          </Link>
          <button
            onClick={() => {
              if (window.innerWidth < 768) {
                setIsMobileOpen(false);
              } else {
                toggleSidebar();
              }
            }}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <span className="hidden md:block">
              {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </span>
            <span className="md:hidden block">
              <X size={20} />
            </span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto py-6">
          <div className="space-y-1.5 px-3">
            {visibleMenuItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={handleNavClick}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                  isActive(href)
                    ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-100/50'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
                title={!isExpanded ? label : undefined}
              >
                <Icon size={20} className={clsx("flex-shrink-0 transition-colors group-hover:text-blue-600", isActive(href) ? "text-blue-600" : "text-slate-400")} />
                <span className={clsx("text-sm font-medium", !isExpanded && "md:hidden")}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </nav>

        {/* User Info & Logout */}
        <div className="border-t border-slate-100 p-4 bg-slate-50/50 mt-auto">
          {user && (
            <>
              <div className={clsx("mb-4 px-2", !isExpanded && "md:hidden")}>
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-[11px] font-medium tracking-wide uppercase mt-1 text-teal-600">
                  {user.role.replace('_', ' ')}
                </p>
              </div>
              <div className={clsx("mb-4 flex justify-center hidden", !isExpanded && "md:flex")}>
                <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-sm font-bold text-blue-700">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 w-full group',
                  !isExpanded && 'md:justify-center md:p-2'
                )}
                title={!isExpanded ? 'Logout' : undefined}
              >
                <LogOut size={20} className="flex-shrink-0 group-hover:text-red-500" />
                <span className={clsx("text-sm font-medium", !isExpanded && "md:hidden")}>Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
