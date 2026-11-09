/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { WalletProvider } from './context/WalletContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { ExplorePage } from './pages/ExplorePage.tsx';
import { CharitiesPage } from './pages/CharitiesPage.tsx';
import { AdminPage } from './pages/AdminPage.tsx';
import { LegalPage } from './pages/LegalPage.tsx';
import { CreateLaunchModal } from './components/CreateLaunchModal.tsx';
import { TokenDetailModal } from './components/TokenDetailModal.tsx';
import { DirectDonationModal } from './components/DirectDonationModal.tsx';
import { Launch, Charity, Donation } from './types.ts';

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<'explore' | 'launch' | 'charities' | 'admin' | 'terms' | 'privacy'>('explore');
  const [launches, setLaunches] = useState<Launch[]>([]);
  const [charities, setCharities] = useState<Charity[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Launch | null>(null);
  const [selectedCharityForDonate, setSelectedCharityForDonate] = useState<Charity | null>(null);

  // Fetch all initial data
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

  // Support URL search params (e.g. ?token=... or ?tab=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenMint = params.get('token');
    const tabParam = params.get('tab') as any;

    if (tokenMint && launches.length > 0) {
      const match = launches.find((l) => l.mint === tokenMint);
      if (match) setSelectedToken(match);
    }

    if (['explore', 'charities', 'admin', 'terms', 'privacy'].includes(tabParam)) {
      setCurrentTab(tabParam);
    }
  }, [launches]);

  const handleLaunchSuccess = (newLaunch: Launch) => {
    setLaunches((prev) => [newLaunch, ...prev]);
    fetchData();
  };

  const handleDonationSuccess = (_amount: number) => {
    fetchData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0e14] text-slate-100 selection:bg-amber-500 selection:text-black">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          if (tab === 'launch') {
            setIsLaunchModalOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
        openLaunchModal={() => setIsLaunchModalOpen(true)}
      />

      {/* Main Page Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-xs font-mono text-slate-400">Loading CatPad on Solana...</p>
          </div>
        ) : (
          <>
            {currentTab === 'explore' && (
              <ExplorePage
                launches={launches}
                charities={charities}
                onSelectToken={(token) => setSelectedToken(token)}
                openLaunchModal={() => setIsLaunchModalOpen(true)}
              />
            )}

            {currentTab === 'charities' && (
              <CharitiesPage
                charities={charities}
                launches={launches}
                onOpenDonate={(charity) => setSelectedCharityForDonate(charity)}
                onSelectToken={(token) => setSelectedToken(token)}
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

            {(currentTab === 'terms' || currentTab === 'privacy') && (
              <LegalPage page={currentTab} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <Footer setCurrentTab={setCurrentTab} />

      {/* Create Token Launch Modal */}
      <CreateLaunchModal
        charities={charities}
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        onLaunchSuccess={handleLaunchSuccess}
      />

      {/* Token Details & Sharing Modal */}
      <TokenDetailModal
        launch={selectedToken}
        charity={charities.find((c) => c.id === selectedToken?.charity_id)}
        onClose={() => setSelectedToken(null)}
      />

      {/* Direct Charity Donation Modal */}
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
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  );
}
