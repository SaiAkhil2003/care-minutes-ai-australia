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
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/shifts',    label: 'Shifts',    icon: Clock           },
  { href: '/staff',     label: 'Staff',     icon: Users           },
  { href: '/forecast',  label: 'Forecast',  icon: TrendingUp      },
  { href: '/alerts',    label: 'Alerts',    icon: Bell            },
  { href: '/reports',   label: 'Reports',   icon: FileText        },
  { href: '/settings',  label: 'Settings',  icon: Settings        },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1e293b] border-t border-white/10 safe-area-bottom">
      <div className="flex items-stretch overflow-x-auto scrollbar-hide">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[52px] flex-1 transition-all duration-150 ${
                active ? 'text-[#22c55e]' : 'text-slate-400 active:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 transition-transform duration-150 ${active ? 'scale-110' : ''}`} />
              <span className={`text-[9px] font-medium whitespace-nowrap transition-all duration-150 ${active ? 'opacity-100' : 'opacity-70'}`}>
                {label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-[#22c55e] rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
