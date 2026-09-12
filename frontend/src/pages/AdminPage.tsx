import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Pool, Policy } from '../lib/contract/types';
import { AlertTriangle, Plus, Database, ShieldAlert, Settings, RefreshCw, Layers } from 'lucide-react';
import { useWallet } from '../lib/genlayer/wallet';
import { useCreatePool, useFetchConsecutiveDroughtDays, useFundVault, useTriggerEmergencyPayout } from '../hooks/ClimateShield';
import  PoolRegistryRow  from './PoolRegistry';

interface AdminPageProps {
  pools: Pool[];
  isLoadingPools: boolean;
  setCurrentTab: (tab: string) => void;
  setSelectedPoolId: (id: string) => void;
}

export default function AdminPage({ pools, isLoadingPools, setCurrentTab, setSelectedPoolId }: AdminPageProps) {
  const { address } = useWallet();
  const { showToast } = useApp()
  const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS
  const seasonEnd = Date.now() + (21 * 24 * 60 * 60 * 1000)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [regionName, setRegionName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radiusKm, setRadiusKm] = useState('20');
  const [droughtThreshold, setDroughtThreshold] = useState('0.15');
  const [consecutiveDaysRequired, setConsecutiveDaysRequired] = useState('21');
  const [premium, setPremium] = useState('50');
  const [coverage, setCoverage] = useState('400');
  const [maxPolicies, setMaxPolicies] = useState('100');
  const [fundPoolId, setFundPoolId] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [triggerPoolId, setTriggerPoolId] = useState('');
  const [triggerReason, setTriggerReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showTriggerConfirm, setShowTriggerConfirm] = useState(false);
  const { isPending: isCreatingPool, mutate: createPool } = useCreatePool()
  const { isPending: isFundingVault, mutate: fundVault } = useFundVault()
  const { isPending: isTriggeringEmergencyPayout, mutate: triggerEmergencyPayout } = useTriggerEmergencyPayout()

  // Load initial select box values
  useEffect(() => {
    if (pools.length > 0) {
      setFundPoolId(pools[0].pool_id);
      setTriggerPoolId(pools[0].pool_id);
    }
  }, [pools]);

  const handleFindCoordinates = async () => {
    if (!regionName.trim()) return;

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          regionName
        )}&count=1&language=en&format=json`
      );

      const data = await response.json();

      if (!data.results?.length) {
        showToast("Location not found", "error");
        return;
      }

      const location = data.results[0];

      setLatitude(String(location.latitude));
      setLongitude(String(location.longitude));

      showToast(
        `Coordinates found for ${location.name}`,
        "success"
      );
    } catch (error) {
      showToast("Failed to find coordinates", "error");
    }
  };

  // Handle access restriction
  const isAuthorized = address?.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  if (!address || !isAuthorized) {
    return (
      <div className="bg-[#000000] text-white min-h-[85vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#0f0f0f] border border-[#1e1e1e] p-8 rounded-[6px] text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-[#dc2626] mx-auto animate-bounce" />
          <h2 className="text-xl font-bold tracking-tight text-white">Access Denied</h2>
          <p className="text-xs text-[#6b7280] leading-relaxed">
            The connected wallet address (<span className="font-mono text-white text-[11px] break-all">{address || 'No Wallet'}</span>) does not match the ClimateShield Platform Administrator credentials.
          </p>
          <div className="pt-2">
            <span className="text-[10px] text-[#6b7280] font-mono uppercase block">AUTHORIZED ADMIN ADDRESS</span>
            <span className="text-xs text-[#22c55e] font-mono break-all">{ADMIN_ADDRESS}</span>
          </div>
        </div>
      </div>
    );
  }

  // Live multiplier calculation
  const calculatedMultiplier = parseFloat(premium) > 0
    ? (parseFloat(coverage) / parseFloat(premium)).toFixed(1)
    : '0.0';

  // Create Pool Handler
  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !regionName || !latitude || !longitude || !droughtThreshold || !consecutiveDaysRequired || !premium || !coverage) {
      showToast("Please fill in all required pool variables.", "error");
      return;
    }

    createPool({
      name,
      description: description,
      region_name: regionName,
      latitude: latitude,
      longitude: longitude,
      radius_km: radiusKm,
      drought_threshold: droughtThreshold,
      consecutive_days_required: Number(consecutiveDaysRequired),
      premium_per_policy: Number(premium),
      coverage_per_policy: Number(coverage),
      max_policies: Number(maxPolicies),
      season_end: seasonEnd
    }, {
      onSuccess: () => {
        showToast("Pool Created Successfully!", "success")
      },
      onError: () => {
        showToast("Failed to create pool", "error")
      }
    })
  };

  // Fund Vault Handler
  const handleFundVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fundPoolId || !fundAmount || isNaN(parseInt(fundAmount)) || parseInt(fundAmount) <= 0) {
      showToast("Please specify a valid funding amount.", "error");
      return;
    }
    fundVault({
      pool_id: fundPoolId,
      amount: Number(fundAmount)
    }, {
      onSuccess: () => {
        showToast("Vault Funded Successfully!", "success")
      },
      onError: () => {
        showToast("Failed to fund vault", "error")
      }
    })
  };

  // Admin Override Trigger Handler
  const handleAdminTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'CONFIRM') {
      showToast("Security override failed. You must type CONFIRM.", "error");
      return;
    }

    triggerEmergencyPayout({
      poolId: triggerPoolId,
      reason: triggerReason,
      evidence_url: evidenceUrl
    }, {
      onSuccess: () => {
        showToast("Emergency Payout Triggered Successfully!", "success")
      },
      onError: () => {
        showToast("Failed to trigger emergency payout", "error")
      }
    })
  };


  const handleViewPool = (poolId: string) => {
    setSelectedPoolId(poolId);
    setCurrentTab(`pool-${poolId}`);
  };

  return (
    <div className="bg-[#000000] text-white min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Settings className="w-7 h-7 text-[#16a34a]" />
              Platform Admin Panel
            </h1>
            <p className="text-xs text-[#6b7280]">
              Create geographic coverage pools, monitor active vaults, and issue emergency manual override payouts.
            </p>
          </div>

        </div>

        {/* Top forms split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Create Coverage Pool Column (2/3 width) */}
          <div className="lg:col-span-2 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-[#1e1e1e] pb-3">
              <Plus className="w-5 h-5 text-[#16a34a]" />
              <h2 className="text-white text-base font-bold">Create Coverage Pool</h2>
            </div>

            <form onSubmit={handleCreatePool} className="space-y-4 text-xs">

              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Pool Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Nakuru Maize Pool"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Farming Region (State/Country) *</label>
                  <input
                    type="text"
                    placeholder="e.g. Nakuru County, Kenya"
                    value={regionName}
                    onChange={(e) => setRegionName(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    className="mt-1 text-[10px] text-[#6b7280] hover:text-[#22c55e] font-semibold transition-colors cursor-pointer"
                    onClick={handleFindCoordinates}
                  >
                    Find Coordinates
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[#6b7280] font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Describe the target crop types, satellite resolution, and telemetry variables monitored by this pool."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white focus:border-[#16a34a] focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Row 2 Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Latitude (Decimal) *</label>
                  <input
                    type="text"
                    placeholder="e.g. -0.303"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Longitude (Decimal) *</label>
                  <input
                    type="text"
                    placeholder="e.g. 36.080"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Radius (Kilometers) *</label>
                  <input
                    type="number"
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Row 3 Variables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Drought Threshold (m³/m³) *</label>
                  <input
                    type="text"
                    value={droughtThreshold}
                    onChange={(e) => setDroughtThreshold(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-[#6b7280] block mt-0.5 leading-tight">Soil moisture below this value classifies drought.</span>
                </div>
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Consecutive Days Required *</label>
                  <input
                    type="number"
                    value={consecutiveDaysRequired}
                    onChange={(e) => setConsecutiveDaysRequired(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Max Allowable Policies *</label>
                  <input
                    type="number"
                    value={maxPolicies}
                    onChange={(e) => setMaxPolicies(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Row 4 Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Premium per Policy (GEN) *</label>
                  <input
                    type="number"
                    value={premium}
                    onChange={(e) => setPremium(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Coverage per Policy (GEN) *</label>
                  <input
                    type="number"
                    value={coverage}
                    onChange={(e) => setCoverage(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white font-mono focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Multiplier text */}
              <div className="p-3 bg-[#141414] border border-[#1e1e1e] text-xs flex justify-between items-center rounded-[4px]">
                <span className="text-[#6b7280]">Parametric Leverage Multiplier:</span>
                <span className="text-white font-bold font-mono">
                  Coverage is <span className="text-[#22c55e]">{calculatedMultiplier}x</span> the premium paid
                </span>
              </div>

              <button
                disabled={isCreatingPool}
                type="submit"
                className="w-full py-2.5 bg-[#16a34a] hover:bg-[#22c55e] text-white font-bold text-sm rounded-[4px] tracking-tight cursor-pointer transition-colors"
              >
                {isCreatingPool ? "Creating Coverage Pool..." : "Create pool "}
              </button>

            </form>
          </div>

          {/* RIGHT COLUMN: Fund Vault & Admin trigger */}
          <div className="space-y-6">

            {/* FUND VAULT CARD */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1e1e1e] pb-3">
                <Database className="w-5 h-5 text-[#16a34a]" />
                <h3 className="text-white text-base font-bold">Fund Pool Vault</h3>
              </div>

              <form onSubmit={handleFundVault} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Target Pool</label>
                  <select
                    value={fundPoolId}
                    onChange={(e) => setFundPoolId(e.target.value)}
                    className="w-full p-2.5 bg-[#141414] border border-[#1e1e1e] text-white rounded-[4px] focus:outline-none focus:border-[#16a34a]"
                  >
                    {pools.map(p => (
                      <option key={p.pool_id} value={p.pool_id}>{p.name} ({p.status})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Funding Amount (GEN)</label>
                  <input
                    type="number"
                    placeholder="e.g. 5000"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] text-white font-mono rounded-[4px] focus:border-[#16a34a] focus:outline-none"
                    required
                  />
                  <span className="text-[10px] text-[#6b7280] block mt-0.5 leading-tight">Add GEN to ensure vault can cover all policy exposures.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-[#16a34a] hover:bg-[#22c55e] text-white font-bold rounded-[4px] transition-colors cursor-pointer"
                >
                  {isFundingVault ? "Funding..." : "Fund Vault"}
                </button>
              </form>
            </div>

            {/* ADMIN EMERGENCY TRIGGER OVERRIDE CARD */}
            <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px] p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#1e1e1e] pb-3">
                <AlertTriangle className="w-5 h-5 text-[#dc2626]" />
                <h3 className="text-white text-base font-bold">Admin Trigger Override</h3>
              </div>

              <form onSubmit={handleAdminTrigger} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Target Pool</label>
                  <select
                    value={triggerPoolId}
                    onChange={(e) => setTriggerPoolId(e.target.value)}
                    className="w-full p-2.5 bg-[#141414] border border-[#1e1e1e] text-white rounded-[4px] focus:outline-none focus:border-[#16a34a]"
                  >
                    {pools.filter(p => p.status !== 'triggered').map(p => (
                      <option key={p.pool_id} value={p.pool_id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Override Reason</label>
                  <textarea
                    placeholder="State the force majeure, regional anomaly, or severe meteorological justification."
                    value={triggerReason}
                    onChange={(e) => setTriggerReason(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white h-16 resize-none focus:outline-none focus:border-[#dc2626]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#6b7280] font-semibold mb-1">Evidence URL</label>
                  <input
                    placeholder="Provide a link to the evidence supporting the override."
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                    className="w-full p-2 bg-[#141414] border border-[#1e1e1e] rounded-[4px] text-white resize-none focus:outline-none focus:border-[#dc2626]"
                    required
                  />
                </div>

                {showTriggerConfirm ? (
                  <div className="space-y-3 p-3 border border-red-900/40 bg-red-950/20 rounded-[4px]">
                    <p className="text-[10px] text-[#dc2626] leading-normal font-semibold">
                      SECURITY PROTOCOL: Type "CONFIRM" in the field below to verify this override. This will instantly release locked vault collateral to covered addresses.
                    </p>
                    <input
                      type="text"
                      placeholder="CONFIRM"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full p-2 bg-[#141414] border border-[#1e1e1e] text-white font-mono text-center rounded-[4px] focus:border-[#dc2626] focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={confirmText !== 'CONFIRM'}
                        
                        className="flex-1 py-1.5 bg-[#dc2626] hover:bg-red-700 disabled:bg-[#1e1e1e] text-white text-[11px] font-bold rounded-[3px] transition-colors cursor-pointer"
                      >
                        {isTriggeringEmergencyPayout ? 'Submitting Payout...' : 'Submit Payout'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTriggerConfirm(false);
                          setConfirmText('');
                        }}
                        className="flex-1 py-1.5 bg-[#1e1e1e] text-[#6b7280] text-[11px] font-bold rounded-[3px] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTriggerConfirm(true)}
                    className="w-full py-2 bg-[#dc2626] hover:bg-red-700 text-white font-bold rounded-[4px] transition-colors cursor-pointer"
                  >
                    Trigger Emergency Payout
                  </button>
                )}
              </form>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: OVERVIEW TABLE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#16a34a]" />
            <h2 className="text-xl font-bold tracking-tight text-white">Active Pools Master Registry</h2>
          </div>

          {isLoadingPools ? (
            <div className="h-48 bg-[#0f0f0f] border border-[#1e1e1e] rounded-[6px]" />
          ) : (
            <div className="border border-[#1e1e1e] bg-[#0f0f0f] rounded-[6px] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e1e1e] bg-[#141414] text-[#6b7280] font-bold">
                      <th className="p-3">Pool Name</th>
                      <th className="p-3">Region Name</th>
                      <th className="p-3">Contract Status</th>
                      <th className="p-3">Consecutive Days Trigger</th>
                      <th className="p-3">Vault Balance</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e]/50 font-mono">
                    {pools.map((pool) => (
                      <PoolRegistryRow
                        key={pool.pool_id}
                        pool={pool}
                        onManage={handleViewPool}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
