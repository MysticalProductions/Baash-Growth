import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-baash-black flex flex-col justify-between relative overflow-hidden selection:bg-baash-purple selection:text-white">
      {/* Ambient background glow matching baash.in */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-baash-subtle-glow pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 px-8 py-6 flex items-center justify-between border-b border-baash-cardBorder/40">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="BAASH"
            className="h-10 w-auto object-contain"
            onError={(e) => {
              // Fallback text if image cannot be loaded
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              BAASH <span className="text-transparent bg-clip-text bg-gradient-to-r from-baash-pink to-baash-purple font-extrabold text-sm px-2 py-0.5 rounded-md bg-white/5 border border-white/10">GROWTH</span>
            </span>
            <span className="text-[11px] text-baash-textMuted tracking-wider uppercase font-medium">Communication CRM</span>
          </div>
        </Link>

        <a
          href="https://baash.in"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-baash-textMuted hover:text-white transition-colors"
        >
          baash.in ↗
        </a>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-baash-textMuted border-t border-baash-cardBorder/40">
        <p>© {new Date().getFullYear()} BAASH Ecosystem. All rights reserved. Multi-tenant Communication CRM.</p>
      </footer>
    </div>
  );
};
