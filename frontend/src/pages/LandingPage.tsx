import React from 'react';
import { Pool } from '../lib/contract/types';
import { ArrowRight, MapPin } from 'lucide-react';
import { useFetchConsecutiveDroughtDays, useFetchWeatherReading } from '../hooks/ClimateShield';

interface LandingPageProps {
  pools: Pool[];
  isLoadingPools: boolean;
  setCurrentTab: (tab: string) => void;
  setSelectedPoolId: (id: string) => void;
}

export default function LandingPage({ pools, isLoadingPools, setCurrentTab, setSelectedPoolId }: LandingPageProps) {
  
  const activePools = pools
    .filter(p => p.status === 'open' || p.status === 'active' || p.status === 'triggered')
    .slice(0, 3);

  const handleViewPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setCurrentTab(`pool-${poolId}`);
  };

  return (
    <div className="bg-[#000000] text-white min-h-screen flex flex-col justify-between selection:bg-[#16a34a]">
      
      {/* Main Split Layout */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          
          {/* Left Column: Hero branding */}
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 animate-slide-in">
            <h1 className="text-5xl sm:text-6xl font-bold leading-[1.1] tracking-tight">
              Emergency<br/>
              Liquidity for<br/>
              <span className="text-[#16a34a]">Farmers.</span>
            </h1>
            
            <p className="text-[#6b7280] text-base sm:text-lg max-w-md leading-relaxed">
              ClimateShield pays out automatically when satellite data confirms drought conditions in your region. No adjusters. No paperwork. Just funds when you need them most.
            </p>
            
            <div className="flex flex-wrap gap-4 pt-2">
              <button
                id="hero-find-region-btn"
                onClick={() => setCurrentTab('pools')}
                className="bg-[#16a34a] hover:bg-[#22c55e] text-white px-6 py-3 font-semibold rounded-[4px] transition-colors cursor-pointer flex items-center gap-2 text-sm"
              >
                Find Your Region
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                id="hero-how-it-works-btn"
                onClick={() => setCurrentTab('how-it-works')}
                className="border border-[#16a34a] text-[#16a34a] px-6 py-3 font-semibold rounded-[4px] hover:bg-[#14532d]/40 transition-colors cursor-pointer text-sm"
              >
                How It Works
              </button>
            </div>
            
            <div className="text-[#6b7280] text-xs mt-4 uppercase tracking-widest font-mono">
              Backed by GenLayer Parametric Smart Contracts
            </div>
          </div>

          {/* Right Column: Active Pools scrolling panel */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-white tracking-tight">Active Coverage Pools</h2>
              <button
                id="view-all-pools-link"
                onClick={() => setCurrentTab('pools')}
                className="text-[#16a34a] text-sm font-medium hover:underline cursor-pointer flex items-center gap-1"
              >
                View All Pools
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingPools ? (
              <div className="flex-1 flex flex-col gap-4 min-h-[350px]">
                <div className="h-[140px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] animate-pulse"></div>
                <div className="h-[140px] bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] animate-pulse"></div>
              </div>
            ) : activePools.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-center p-8 border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px] min-h-[300px]">
                <p className="text-[#6b7280] text-xs">No active coverage pools available at this time.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col gap-4 max-h-[480px] overflow-y-auto pr-1">
                {activePools.map((pool) => (
                  <PoolCard 
                    key={pool.pool_id} 
                    pool={pool} 
                    onViewDetails={handleViewPool} 
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Horizontal Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="border-t border-[#1e1e1e]"></div>
      </div>

      {/* Specification: How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white tracking-tight border-l-2 border-l-[#16a34a] pl-3">How ClimateShield Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="space-y-3 p-5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]">
            <div className="text-2xl font-bold text-[#16a34a]">01</div>
            <h3 className="text-white font-bold text-base">Find a Pool</h3>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              Browse coverage pools for your farming region. Each pool covers a specific geographic area with defined trigger conditions.
            </p>
          </div>

          <div className="space-y-3 p-5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]">
            <div className="text-2xl font-bold text-[#16a34a]">02</div>
            <h3 className="text-white font-bold text-base">Buy a Policy</h3>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              Pay the premium in GEN tokens. Your funds lock in a vault shared by all farmers in the pool.
            </p>
          </div>

          <div className="space-y-3 p-5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]">
            <div className="text-2xl font-bold text-[#16a34a]">03</div>
            <h3 className="text-white font-bold text-base">Weather is Monitored</h3>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              Soil moisture data is fetched daily from satellite sources. Every reading is recorded permanently on-chain.
            </p>
          </div>

          <div className="space-y-3 p-5 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]">
            <div className="text-2xl font-bold text-[#16a34a]">04</div>
            <h3 className="text-white font-bold text-base">Automatic Payout</h3>
            <p className="text-xs text-[#6b7280] leading-relaxed">
              If drought conditions persist past the threshold, the vault unlocks and funds flow to every covered farmer instantly.
            </p>
          </div>
        </div>
      </section>

      {/* Horizontal Divider */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="border-t border-[#1e1e1e]"></div>
      </div>

      {/* High-fidelity Elegant Dark Footer */}
      <footer className="border-t border-[#1e1e1e] bg-[#0f0f0f] py-8 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          
          <div className="flex flex-col gap-1.5 self-start">
            <div className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Drought Index Legend</div>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-[#14532d] text-[#22c55e] text-[9px] font-bold rounded uppercase">Normal</div>
                <span className="text-[10px] text-[#6b7280]">Stable conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-[#78350f] text-[#fbbf24] text-[9px] font-bold rounded uppercase">Watch</div>
                <span className="text-[10px] text-[#6b7280]">Soil moisture declining</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-[#92400e] text-[#f59e0b] text-[9px] font-bold rounded uppercase">Warning</div>
                <span className="text-[10px] text-[#6b7280]">Critical moisture loss</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-2 py-0.5 bg-[#7f1d1d] text-[#ef4444] text-[9px] font-bold rounded uppercase">Severe</div>
                <span className="text-[10px] text-[#6b7280]">Trigger threshold reached</span>
              </div>
            </div>
          </div>

          <div className="text-[#6b7280] text-[10px] text-right space-y-1 self-end md:self-center">
            <div>System Health: <span className="text-[#22c55e] font-semibold">Operational</span></div>
            <div>Satellite Sync: <span className="text-white">4m ago</span></div>
          </div>

        </div>
      </footer>
    </div>
  );
}

{/* Sub-component to ensure React Hook compliance inside the list */}
interface PoolCardProps {
  pool: Pool;
  onViewDetails: (id: string) => void;
}

function PoolCard({ pool, onViewDetails }: PoolCardProps) {
  // Safe execution of custom hook inside separate component scope
  const { data: dynamicConsecutiveDays } = useFetchConsecutiveDroughtDays(pool.pool_id);
  const {data: weatherReading} = useFetchWeatherReading(pool.pool_id, new Date().toISOString().split('T')[0]);
  
  // Use custom contract hook value fallback to static object property if loading
  const visualStreakDays = dynamicConsecutiveDays  ?? 0;

  let statusBg = 'bg-[#1e1e1e] text-[#6b7280]';
  if (pool.status === 'open') statusBg = 'bg-[#16a34a] text-black font-bold';
  else if (pool.status === 'active') statusBg = 'border border-[#16a34a] text-[#16a34a] bg-transparent';
  else if (pool.status === 'triggered') statusBg = 'bg-[#dc2626] text-white font-bold';

  let droughtDot = 'bg-gray-400';
  let droughtIndexLabel = weatherReading?.drought_index;
  if (weatherReading?.drought_index === 'normal') droughtDot = 'bg-[#16a34a]';
  else if (weatherReading?.drought_index === 'watch') droughtDot = 'bg-[#ca8a04]';
  else if (weatherReading?.drought_index === 'warning') droughtDot = 'bg-[#d97706]';
  else if (weatherReading?.drought_index === 'severe') droughtDot = 'bg-[#dc2626]';

  return (
    <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-5 flex flex-col gap-4 hover:border-[#16a34a]/60 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-bold text-lg text-white">{pool.name}</div>
          <div className="text-[#6b7280] text-sm flex items-center gap-1 mt-1">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#6b7280]" />
            {pool.region_name}
          </div>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${statusBg}`}>
          {pool.status}
        </div>
      </div>

      <div className="grid grid-cols-3 border-y border-[#1e1e1e] py-3 text-center text-xs">
        <div className="border-r border-[#1e1e1e]">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Premium</div>
          <div className="font-mono mt-0.5 text-white">{pool.premium_per_policy} GEN</div>
        </div>
        <div className="border-r border-[#1e1e1e]">
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Coverage</div>
          <div className="font-mono mt-0.5 text-[#22c55e] font-semibold">{pool.coverage_per_policy} GEN</div>
        </div>
        <div>
          <div className="text-[10px] text-[#6b7280] uppercase tracking-wider">Required</div>
          <div className="font-mono mt-0.5 text-white">{Number(dynamicConsecutiveDays)} Days</div>
        </div>
      </div>

      {pool.status === 'active' ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[11px] font-medium text-[#6b7280]">
            <span>Drought Streak progress:</span>
            <span className="text-[#d97706] font-mono">{dynamicConsecutiveDays?.toString()} of {pool.consecutive_days_required} Days</span>
          </div>
          <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#d97706]" 
              style={{ width: `${Math.min(100, (Number(dynamicConsecutiveDays) / pool.consecutive_days_required) * 100)}%` }}
            ></div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${droughtDot}`}></span> 
            <span className="text-[#6b7280]">{droughtIndexLabel} Status</span>
          </div>
          <div className="text-[#6b7280] font-mono">Vault: {pool.vault_balance} GEN</div>
        </div>
      )}

      <button 
        id={`landing-view-pool-${pool.pool_id}`}
        onClick={() => onViewDetails(pool.pool_id)}
        className="w-full border border-white text-white py-2 text-sm font-medium rounded-[4px] hover:bg-white hover:text-black transition-colors cursor-pointer text-center"
      >
        View Pool Details
      </button>
    </div>
  );
}