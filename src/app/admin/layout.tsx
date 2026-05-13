"use client";

import Sidebar from "@/components/Sidebar";
import FloatingSearch from "@/components/FloatingSearch";
import MobileHeader from "@/components/MobileHeader";
import MobileNav from "@/components/MobileNav";
import MobileMenuDrawer from "@/components/MobileMenuDrawer";
import LiveChat from "@/components/LiveChat";
import AdminProviders from "@/components/AdminProviders";
import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <AdminProviders>
      <div className="admin-layout-container">
        <Sidebar />
        <div className="glass-card admin-main-card">
          <MobileHeader />
          <main className="admin-content-area">
            <div className="animate-fade-in-up" style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
              {children}
            </div>
          </main>
          <FloatingSearch />
          <MobileNav onOpenMenu={() => setIsMenuOpen(true)} />
          <LiveChat />
        </div>
      </div>
      <MobileMenuDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </AdminProviders>
  );
}
