'use client';

import { Suspense, useEffect, useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileBottomNav from '@/components/MobileBottomNav';
import ScrollToTop from '@/components/ScrollToTop';
import ErrorBoundary from '@/components/ErrorBoundary';
import NavigationProgress from '@/components/NavigationProgress';
import CookieConsent from '@/components/CookieConsent';
import { CMSProvider } from '@/context/CMSContext';
import { supabase } from '@/lib/supabase';

// Lazy-load non-critical components
import dynamic from 'next/dynamic';
const SessionTimeoutWarning = dynamic(() => import('@/components/SessionTimeoutWarning'), { ssr: false });
const PWAPrompt = dynamic(() => import('@/components/PWAPrompt'), { ssr: false });
const PWAInstaller = dynamic(() => import('@/components/PWAInstaller'), { ssr: false });
const PWASplash = dynamic(() => import('@/components/PWASplash'), { ssr: false });
const PushNotificationManager = dynamic(() => import('@/components/PushNotificationManager'), { ssr: false });
const OfflineIndicator = dynamic(() => import('@/components/OfflineIndicator'), { ssr: false });
const NetworkStatusMonitor = dynamic(() => import('@/components/NetworkStatusMonitor'), { ssr: false });
const UpdatePrompt = dynamic(() => import('@/components/UpdatePrompt'), { ssr: false });
const LiveSalesNotification = dynamic(() => import('@/components/LiveSalesNotification'), { ssr: false });
const ChatWidget = dynamic(() => import('@/components/ChatWidget'), { ssr: false });

// Feature flag: control chat widget via env
const CHAT_ENABLED =
  typeof process.env.NEXT_PUBLIC_CHAT_ENABLED === 'undefined' ||
  process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true' ||
  process.env.NEXT_PUBLIC_CHAT_ENABLED === '1';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatModuleEnabled, setChatModuleEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchChatModule() {
      try {
        const { data, error } = await supabase
          .from('store_modules')
          .select('id, enabled')
          .eq('id', 'ai-chat');

        if (!isMounted) return;

        if (error || !data || data.length === 0) {
          // If we can’t read the module row, fall back to environment flag only
          setChatModuleEnabled(null);
        } else {
          setChatModuleEnabled(!!data[0].enabled);
        }
      } catch {
        if (isMounted) {
          setChatModuleEnabled(null);
        }
      }
    }

    fetchChatModule();

    return () => {
      isMounted = false;
    };
  }, []);

  const shouldShowChat = CHAT_ENABLED && chatModuleEnabled !== false;

  return (
    <CMSProvider>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <ScrollToTop />
      <div className="min-h-screen bg-gray-50">
        <PWASplash />
        <PWAInstaller />
        <Header />
        <ErrorBoundary>
          <div className="pwa-page-enter">
            {children}
          </div>
        </ErrorBoundary>
        <Footer />
        <MobileBottomNav />
        <SessionTimeoutWarning />
        <PWAPrompt />
        <PushNotificationManager />
        <OfflineIndicator />
        <NetworkStatusMonitor />
        <UpdatePrompt />
        <LiveSalesNotification />
        <CookieConsent />
        {shouldShowChat && <ChatWidget />}
      </div>
    </CMSProvider>
  );
}
