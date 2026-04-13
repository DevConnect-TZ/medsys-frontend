'use client';

import { Sidebar } from './Sidebar';
import { ReactNode, useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';

interface LayoutProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Layout({ children, className }: LayoutProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  useEffect(() => {
    const handleStorageChange = () => {
      const expanded = localStorage.getItem('sidebarExpanded');
      setIsSidebarExpanded(expanded !== 'false');
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const toggleMobileSidebar = () => {
    window.dispatchEvent(new Event('toggleMobileSidebar'));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <div
        className={clsx(
          "transition-all duration-300 ease-in-out min-h-screen flex flex-col",
          isSidebarExpanded ? "md:ml-64" : "md:ml-20",
          className
        )}
      >
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 p-4 sticky top-0 z-40 shadow-sm">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="relative w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-lg overflow-hidden shadow-sm border border-slate-200 bg-white">
              <Image src="/logo.png" alt="AFYA Logo" fill className="object-cover" priority />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">AFYA</span>
          </Link>
          <button onClick={toggleMobileSidebar} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
