'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard',  label: '📊 Дашборд'   },
  { href: '/positions',  label: '📋 Позиції'    },
  { href: '/employees',  label: '👷 Працівники' },
  { href: '/kits',       label: '🧮 Комплекти'  },
  { href: '/analytics',  label: '📈 Аналітика'  },
];

export default function Navbar() {
  const path = usePathname();
  return (
    <nav className="bg-blue-700 text-white shadow">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-14 overflow-x-auto">
        <span className="font-bold text-lg mr-4 whitespace-nowrap">🔌 Cable CRM</span>
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-1.5 rounded text-sm whitespace-nowrap transition-colors ${
              path.startsWith(n.href)
                ? 'bg-white text-blue-700 font-semibold'
                : 'hover:bg-blue-600'
            }`}
          >
            {n.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
