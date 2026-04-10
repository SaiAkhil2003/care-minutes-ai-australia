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
  Stethoscope,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/rn-coverage',  label: 'RN Coverage', icon: Stethoscope     },
  { href: '/shifts',       label: 'Shifts',      icon: Clock           },
  { href: '/staff',       label: 'Staff',      icon: Users           },
  { href: '/forecast',    label: 'Forecast',   icon: TrendingUp      },
  { href: '/alerts',      label: 'Alerts',     icon: Bell            },
  { href: '/reports',     label: 'Reports',    icon: FileText        },
  { href: '/settings',    label: 'Settings',   icon: Settings        },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#1e293b] text-white fixed left-0 top-0 z-40 shadow-xl">
      {/* Logo / Facility Name */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-lg bg-[#22c55e]/20 flex items-center justify-center">
            <Activity className="w-4.5 h-4.5 text-[#22c55e]" style={{ width: '18px', height: '18px' }} />
          </div>
          <span className="font-bold text-base tracking-tight text-white">CareMinutes.ai</span>
        </div>
        <p className="text-xs text-slate-400 truncate ml-0.5 mt-1">Sunrise Aged Care</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'bg-[#22c55e] text-white shadow-sm shadow-green-900/20'
                  : 'text-slate-400 hover:bg-white/8 hover:text-white'
              }`}
              style={!active ? { '--tw-bg-opacity': 1 } : {}}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${active ? '' : 'group-hover:scale-110'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-3 border-t border-white/10" />

      {/* Admin link */}
      <div className="px-3 pb-2 pt-3">
        <Link
          href="/admin"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
            pathname === '/admin'
              ? 'bg-[#22c55e] text-white'
              : 'text-slate-500 hover:bg-white/8 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform duration-150" />
          Admin
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-white/10" />

      {/* User avatar */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#22c55e] to-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
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
