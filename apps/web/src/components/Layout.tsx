import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { useUIStore } from '../store/ui.store';

export default function Layout() {
  const { sidebarCollapsed, mobileSidebarOpen, closeMobileSidebar } = useUIStore();
  const desktopOffset = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60';

  return (
    <div className="min-h-screen flex transition-all duration-200" style={{ background: 'var(--bg)' }}>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <Sidebar />

      <div className={`flex flex-col flex-1 ${desktopOffset} transition-all duration-200 min-w-0`}>
        <Header />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
