'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Clock,
  Users,
  TrendingUp,
  Bell,
  FileText,
  Settings,
  Shield,
  Activity,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/shifts',      label: 'Shifts',     icon: Clock           },
  { href: '/staff',       label: 'Staff',      icon: Users           },
  { href: '/forecast',    label: 'Forecast',   icon: TrendingUp      },
  { href: '/alerts',      label: 'Alerts',     icon: Bell            },
  { href: '/reports',     label: 'Reports',    icon: FileText        },
  { href: '/settings',    label: 'Settings',   icon: Settings        },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#1e293b] text-white fixed left-0 top-0 z-40">
      {/* Logo / Facility Name */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5 text-[#22c55e]" />
          <span className="font-bold text-base tracking-tight">CareMinutes.ai</span>
        </div>
        <p className="text-xs text-slate-400 truncate">Sunrise Aged Care</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-[#22c55e] text-white shadow-sm'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Admin link */}
      <div className="px-3 pb-2 border-t border-white/10 pt-3">
        <Link
          href="/admin"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
            pathname === '/admin'
              ? 'bg-[#22c55e] text-white'
              : 'text-slate-400 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0" />
          Admin
        </Link>
      </div>

      {/* User avatar */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#22c55e] flex items-center justify-center text-white text-xs font-bold shrink-0">
            JR
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">Jennifer Roberts</p>
            <p className="text-xs text-slate-400 truncate">Director of Nursing</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
