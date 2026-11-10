/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { WalletProvider } from './context/WalletContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { SoundProvider } from './context/SoundContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { CharitiesPage } from './pages/CharitiesPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { LegalPage } from './pages/LegalPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { CreateLaunchModal } from './components/CreateLaunchModal.tsx';
import { TokenDetailModal } from './components/TokenDetailModal.tsx';
import { DirectDonationModal } from './components/DirectDonationModal.tsx';
import { Charity, Donation, Launch, Tab } from './types.ts';

const PATH_TO_TAB: Record<string, Tab> = {
  '/': 'explore',
  '/coins': 'explore',
  '/shelters': 'charities',
  '/charities': 'charities',
  '/admin': 'admin',
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/risk': 'risk',
};

const TAB_TO_PATH: Record<Tab, string> = {
  explore: '/',
  launch: '/',
  charities: '/shelters',
  admin: '/admin',
  terms: '/terms',
  privacy: '/privacy',
  risk: '/risk',
};

const readRoute = (): { tab: Tab; notFound: boolean } => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const tab = PATH_TO_TAB[path];
  return tab ? { tab, notFound: false } : { tab: 'explore', notFound: true };
};

export function AppContent() {
  const initialRoute = readRoute();

  const [currentTab, setCurrentTab] = useState<Tab>(initialRoute.tab);
  const [notFound, setNotFound] = useState(initialRoute.notFound);
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Launch | null>(null);
  const [selectedCharityForDonate, setSelectedCharityForDonate] = useState<Charity | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [launchesRes, charitiesRes, donationsRes] = await Promise.all([
        fetch('/api/launches'),
        fetch('/api/charities'),
        fetch('/api/donations'),
      ]);

      const [launchesData, charitiesData, donationsData] = await Promise.all([
        launchesRes.json(),
        charitiesRes.json(),
        donationsRes.json(),
      ]);

      if (launchesData.launches) setLaunches(launchesData.launches);
      if (charitiesData.charities) setCharities(charitiesData.charities);
      if (donationsData.donations) setDonations(donationsData.donations);
    } catch (err) {
      console.warn('Failed to fetch protocol data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /** Navigate without a full reload, keeping URLs shareable. */
  const navigate = useCallback((tab: Tab) => {
    if (tab === 'launch') {
      setIsLaunchModalOpen(true);
      return;
    }
    setCurrentTab(tab);
    setNotFound(false);
    const path = TAB_TO_PATH[tab] || '/';
    if (window.location.pathname !== path) {
      window.history.pushState({ tab }, '', path);
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const route = readRoute();
      setCurrentTab(route.tab);
      setNotFound(route.notFound);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Support deep links: ?token=<mint> or ?tab=<tab>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenMint = params.get('token');
    const tabParam = params.get('tab') as Tab | null;

    if (tokenMint && launches.length > 0) {
      const match = launches.find((l) => l.mint === tokenMint);
      if (match) setSelectedToken(match);
    }

    if (tabParam && tabParam in TAB_TO_PATH && tabParam !== 'launch') {
      setCurrentTab(tabParam);
      setNotFound(false);
    }
  }, [launches]);

  const handleLaunchSuccess = (newLaunch: Launch) => {
    setLaunches((prev) => [newLaunch, ...prev]);
    fetchData();
  };

  const handleDonationSuccess = () => {
    fetchData();
  };

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Navbar currentTab={currentTab} setCurrentTab={navigate} openLaunchModal={() => setIsLaunchModalOpen(true)} />

      <main className="flex-1">
        {notFound ? (
          <NotFoundPage onGoHome={() => navigate('explore')} />
        ) : (
          <>
            {currentTab === 'explore' && (
              <ExplorePage
                launches={launches}
                charities={charities}
                isLoading={isLoading}
                onSelectToken={setSelectedToken}
                openLaunchModal={() => setIsLaunchModalOpen(true)}
              />
            )}

            {currentTab === 'charities' && (
              <CharitiesPage
                charities={charities}
                launches={launches}
                isLoading={isLoading}
                onOpenDonate={setSelectedCharityForDonate}
                onSelectToken={setSelectedToken}
                openLaunchModal={() => setIsLaunchModalOpen(true)}
              />
            )}

            {currentTab === 'admin' && (
              <AdminPage
                charities={charities}
                launches={launches}
                donations={donations}
                onRefreshData={fetchData}
              />
            )}

            {(currentTab === 'terms' || currentTab === 'privacy' || currentTab === 'risk') && (
              <LegalPage page={currentTab} />
            )}
          </>
        )}
      </main>

      <Footer setCurrentTab={navigate} />

      <CreateLaunchModal
        charities={charities}
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        onLaunchSuccess={handleLaunchSuccess}
      />

      <TokenDetailModal
        launch={selectedToken}
        charity={charities.find((c) => c.id === selectedToken?.charity_id)}
        onClose={() => setSelectedToken(null)}
      />

      <DirectDonationModal
        charity={selectedCharityForDonate}
        isOpen={!!selectedCharityForDonate}
        onClose={() => setSelectedCharityForDonate(null)}
        onDonationSuccess={handleDonationSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SoundProvider>
        <WalletProvider>
          <AppContent />
        </WalletProvider>
      </SoundProvider>
    </ToastProvider>
  );
}
