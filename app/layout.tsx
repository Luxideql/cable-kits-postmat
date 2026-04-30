import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import ThemeProvider from '@/components/ThemeProvider';
import ThemeToggle from '@/components/ThemeToggle';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cable CRM',
  description: 'Система обліку виробництва кабелю',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Prevent flash: apply saved theme before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var t = localStorage.getItem('theme');
            if(t === 'light') document.documentElement.classList.remove('dark');
            else document.documentElement.classList.add('dark');
          })();
        `}} />
      </head>
      <body className="bg-cbg text-c1 antialiased font-sans" suppressHydrationWarning>
        <ThemeProvider>
          <Sidebar />

          <div className="md:ml-56 flex flex-col min-h-screen">
            {/* ── Topbar ── */}
            <header
              className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6"
              style={{
                height: '56px',
                backgroundColor: 'var(--cbg)',
                borderBottom: '1px solid var(--cbrd)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {/* Mobile logo (hidden on desktop — sidebar has it) */}
              <div className="md:hidden flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0
                                bg-gradient-to-br from-indigo-500 to-purple-600
                                shadow-[0_0_12px_rgba(99,102,241,0.3)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </div>
                <span className="text-[16px] font-semibold tracking-tight text-c1">Cable CRM</span>
              </div>
              <div className="hidden md:block" />

              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <ThemeToggle />

                {/* Sheets link */}
                <a
                  href="https://docs.google.com/spreadsheets/d/1_M6Gp13wPXGKgp6diKq3vJNWZQBb5d_DNfGUuSMy4a0/edit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  <span className="hidden sm:inline">Таблиця</span>
                </a>

                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                                flex items-center justify-center text-[11px] font-bold text-white
                                ring-2 ring-white/[0.08]">
                  А
                </div>
              </div>
            </header>

            {/* ── Page content ── */}
            <main className="flex-1 px-4 sm:px-6 py-5 sm:py-6 pb-24 md:pb-6 dot-grid">
              <div className="max-w-7xl mx-auto w-full">
                {children}
              </div>
            </main>

            {/* ── Footer ── */}
            <footer className="px-6 py-3 flex items-center justify-between"
                    style={{ borderTop: '1px solid var(--cbrd)' }}>
              <span className="text-[10px] font-medium uppercase tracking-wide text-c4">Cable CRM</span>
              <span className="text-[10px] text-c4">Система обліку виробництва</span>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
