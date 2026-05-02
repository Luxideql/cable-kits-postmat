'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = {
  Dashboard: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  List: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <circle cx="3" cy="6" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="3" cy="18" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Users: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Box: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Trend: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
  Calendar: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  Calculator: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <line x1="8" y1="6" x2="16" y2="6"/>
      <line x1="8" y1="10" x2="10" y2="10"/><line x1="14" y1="10" x2="16" y2="10"/>
      <line x1="8" y1="14" x2="10" y2="14"/><line x1="14" y1="14" x2="16" y2="14"/>
      <line x1="8" y1="18" x2="10" y2="18"/><line x1="14" y1="18" x2="16" y2="18"/>
    </svg>
  ),
  Layers: ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  Bolt: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
  ),
  Chat: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
};

const NAV = [
  { href: '/dashboard',  label: 'Дашборд',    icon: Icon.Dashboard  },
  { href: '/positions',  label: 'Позиції',     icon: Icon.List       },
  { href: '/employees',  label: 'Працівники',  icon: Icon.Users      },
  { href: '/kits',       label: 'Комплекти',   icon: Icon.Box        },
  { href: '/production', label: 'Виробіток',   icon: Icon.Layers     },
  { href: '/planning',   label: 'Планування',  icon: Icon.Calendar   },
  { href: '/analytics',  label: 'Аналітика',   icon: Icon.Trend      },
  { href: '/forecast',   label: 'Прогноз',     icon: Icon.Calculator },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const path = usePathname();

  return (
    <>
      {/* ═══ Desktop Sidebar (md+) ═══ */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 w-56 z-40 flex-col"
        style={{
          backgroundColor: 'var(--csdb)',
          borderRight: '1px solid var(--csdb-brd)',
        }}
      >
        {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-5 py-4"
             style={{ borderBottom: '1px solid var(--csdb-brd)' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0
                          bg-gradient-to-br from-indigo-500 to-purple-600
                          shadow-[0_0_16px_rgba(99,102,241,0.3)]">
            <Icon.Bolt />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-none tracking-tight text-c1">Cable CRM</p>
            <p className="text-[10px] mt-0.5 leading-none text-c4">Виробництво</p>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-3 pt-5 pb-2 overflow-y-auto">
          <p className="px-3 mb-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-c4 select-none">
            Навігація
          </p>

          <div className="space-y-0.5">
            {NAV.map(({ href, label, icon: NavIcon }) => {
              const active = path === href || (href !== '/' && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`
                    relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium
                    transition-all duration-150 outline-none
                    ${active ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : ''}
                  `}
                  style={!active ? { color: 'var(--c3)' } : {}}
                  onMouseEnter={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--chov)';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--c1)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
                      (e.currentTarget as HTMLAnchorElement).style.color = 'var(--c3)';
                    }
                  }}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5
                                     bg-indigo-500 rounded-r-full" />
                  )}
                  <span className={`shrink-0 transition-colors duration-150
                    ${active ? 'text-indigo-500 dark:text-indigo-400' : 'text-c4'}`}>
                    <NavIcon size={15} />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ── Bottom ── */}
        <div className="px-3 pb-4 pt-3 space-y-0.5"
             style={{ borderTop: '1px solid var(--csdb-brd)' }}>
          <a
            href="https://t.me/CableKitsBot"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium
                       transition-all duration-150"
            style={{ color: 'var(--c4)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'var(--chov)';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--c2)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '';
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--c4)';
            }}
          >
            <span className="text-c4"><Icon.Chat /></span>
            Telegram Bot
          </a>

          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-default">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                            flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              А
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium truncate leading-none text-c2">Адмін</p>
              <p className="text-[10px] truncate mt-0.5 leading-none text-c4">Система обліку</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ Mobile Bottom Nav (< md) ═══ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex overflow-x-auto"
        style={{
          backgroundColor: 'var(--csdb)',
          borderTop: '1px solid var(--csdb-brd)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
        }}
      >
        {NAV.map(({ href, label, icon: NavIcon }) => {
          const active = path === href || (href !== '/' && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`relative shrink-0 flex-1 flex flex-col items-center justify-center gap-1 py-2
                transition-colors duration-150
                ${active ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
              style={{ minWidth: '72px', color: active ? undefined : 'var(--c4)' }}
            >
              {/* Active top line */}
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px]
                                 bg-indigo-500 rounded-b-full" />
              )}
              <NavIcon size={20} />
              <span className="text-[11px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
