/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import ToastNotification from './components/ToastNotification';
import LandingPage from './pages/LandingPage';
import ExplorePoolsPage from './pages/ExplorePoolsPage';
import PoolDetailPage from './pages/PoolDetailPage';
import MyCoveragePage from './pages/MyCoveragePage';
import HowItWorksPage from './pages/HowItWorksPage';
import AdminPage from './pages/AdminPage';
import { Pool, Policy, PayoutRecord } from './lib/contract/types';
import { useWallet, WalletProvider } from './lib/genlayer/wallet';
import { useFetchPool, useFetchPools } from './hooks/ClimateShield';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 30000, // 30 seconds refetch interval as requested
      refetchOnWindowFocus: false,
    },
  },
});

function MainAppLayout() {
  const { address } = useWallet();
  const queryClientRef = useQueryClient();
  const [currentTab, setCurrentTab] = useState<string>('landing');
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  useEffect(() => {
    if (currentTab.startsWith('pool-')) {
      const id = currentTab.replace('pool-', '');
      setSelectedPoolId(id);
    }
  }, [currentTab]);

  const {data: pools, isFetching: isLoadingPools} = useFetchPools()
  // Query detailed data of selected pool
  const {
    data: poolDetail,
    isLoading: isLoadingPoolDetail,
  } = useFetchPool(selectedPoolId)

  // Query global active policies (to show badges/numbers in explore page etc)
  const {
    data: allPolicies = []
  } = useQuery<Policy[]>({
    queryKey: ['allPolicies', address],
    queryFn: async () => {
      if (!address) return [];
      const res = await fetch(`/api/policies/farmer/${address}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!address,
  });

  
  return (
    <div className="bg-black min-h-screen text-white flex flex-col font-sans selection:bg-[#16a34a] selection:text-white">
      {/* Navigation */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Primary Page Content */}
      <main className="flex-grow">
        {currentTab === 'landing' && (
          <LandingPage
            pools={pools || []}
            isLoadingPools={isLoadingPools}
            setCurrentTab={setCurrentTab}
            setSelectedPoolId={setSelectedPoolId}
          />
        )}

        {currentTab === 'pools' && (
          <ExplorePoolsPage
            pools={pools || []}
            isLoading={isLoadingPools}
            setCurrentTab={setCurrentTab}
            setSelectedPoolId={setSelectedPoolId}
            policies={allPolicies}
          />
        )}

        {currentTab.startsWith('pool-') && selectedPoolId && (
          isLoadingPoolDetail || !poolDetail ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-sm text-[#6b7280] animate-pulse">
                Loading pool details from contract...
              </div>
            </div>
          ) : (
            <PoolDetailPage
              poolId={selectedPoolId}
              onBack={() => {
                setCurrentTab('pools');
                setSelectedPoolId('');
              }}
              poolData={poolDetail}
              isLoading={isLoadingPoolDetail}
            />
          )
        )}

        
        {currentTab === 'coverage' && (
          <MyCoveragePage
            pools={pools || []}
            setCurrentTab={setCurrentTab}
            setSelectedPoolId={setSelectedPoolId}
          />
        )}

        {currentTab === 'how-it-works' && (
          <HowItWorksPage />
        )}

        {currentTab === 'admin' && (
          <AdminPage
            pools={pools ||[]}
            isLoadingPools={isLoadingPools}
            setCurrentTab={setCurrentTab}
            setSelectedPoolId={setSelectedPoolId}
          />
        )}
      </main>

      {/* Global Overlays */}
      <ToastNotification />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <AppProvider>
          <MainAppLayout />
    </AppProvider>
    </WalletProvider>
    </QueryClientProvider >
  );
}
