
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { getContractAddress } from "../lib/genlayer/client";
import type { PayoutRecord, Policy, Pool, WeatherReading } from "../lib/contract/types";
import { toast } from "sonner";
import { useWallet } from '../lib/genlayer/wallet';
import MemeArena from "../lib/contract/ClimateShield";


export function useClimateShieldContract(): MemeArena | null {
    const { address } = useWallet()
    const contractAddress = getContractAddress();
    return useMemo(() => {
        if (!contractAddress || !address) {
            return null;
        }
        return new MemeArena(contractAddress, address);
    }, [contractAddress, address]);
}




export function useFetchPools() {
    const contract = useClimateShieldContract();

    return useQuery<Pool[], Error>({
        queryKey: ["pools"],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getPools();
        },
        enabled: !!contract,
    });
}


export function useFetchFarmerPolicies(wallet: string | undefined, poolIds: string[]) {
  const contract = useClimateShieldContract();

  return useQuery<Policy[], Error>({
    queryKey: ["farmer_policies", wallet, poolIds],
    queryFn: () => {
      if (!contract || !wallet) throw new Error("Contract not initialized");
      return contract.getFarmerPolicies(wallet, poolIds);
    },
    enabled: !!contract && !!wallet && poolIds.length > 0,
  });
}

export function useFetchWeatherReading(poolId: string, day: string) {
  const contract = useClimateShieldContract();

  return useQuery<WeatherReading, Error>({
    queryKey: ["weather_reading", poolId, day],
    queryFn: () => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.getWeatherReading(poolId, day);
    },
    enabled: !!contract && !!poolId && !!day,
  });
}

export function useFetchConsecutiveDroughtDays(poolId: string) {
  const contract = useClimateShieldContract();

  return useQuery<Number, Error>({
    queryKey: ["drought_days", poolId],
    queryFn: () => {
      if (!contract) throw new Error("Contract not initialized");
      return contract.getConsecutiveDroughtDays(poolId);
    },
    enabled: !!contract && !!poolId,
  });
}



export function useFetchRecentReading(poolId: string, days: number) {
    const contract = useClimateShieldContract();

    return useQuery<WeatherReading[], Error>({
        queryKey: ["get_recent_readings", poolId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getRecentReadings(poolId, days);
        },
        enabled: !!contract,
    });
}



export function useFetchPool(poolId: string) {
    const contract = useClimateShieldContract();

    return useQuery<Pool, Error>({
        queryKey: ["pool", poolId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getPool(poolId);
        },
        enabled: !!contract,
    });
}


export function useFetchPoolPolicies(poolId: string) {
    const contract = useClimateShieldContract();

    return useQuery<Policy[], Error>({
        queryKey: ["submissions", poolId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getPoolPolicies(poolId);
        },
        enabled: !!contract,
    });
}

export function useFetchFarmerPayouts(wallet: string) {
    const contract = useClimateShieldContract();

    return useQuery<PayoutRecord[], Error>({
        queryKey: ["farmer_payouts", wallet],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getFarmerPayouts(wallet);
        },
        enabled: !!contract,
    });
}

export function useFetchPoolPayouts(poolId: string) {
    const contract = useClimateShieldContract();

    return useQuery<PayoutRecord[], Error>({
        queryKey: ["farmer_payouts", poolId],
        queryFn: () => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }
            return contract.getPoolPayouts(poolId);
        },
        enabled: !!contract,
    });
}




export function useCreatePool() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            name, description, region_name, latitude, longitude, radius_km, drought_threshold, consecutive_days_required, premium_per_policy, coverage_per_policy, max_policies, season_end
        }: {
            name: string,
            description: string,
            region_name: string,
            latitude: string,
            longitude: string,
            radius_km: string,
            drought_threshold: string,
            consecutive_days_required: number,
            premium_per_policy: number,
            coverage_per_policy: number,
            max_policies: number,
            season_end: number
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.CreatePool(name, description, region_name, latitude, longitude, radius_km, drought_threshold, consecutive_days_required, premium_per_policy, coverage_per_policy, max_policies, season_end);
            console.log("Challenge creation transaction receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["pools"],
            });
        },
        onError: async (error) => {
            console.error("Error creating pool:", error);
            toast.error("Failed to create pool.");
        }
    });
}


export function useFundVault() {
    const contract = useClimateShieldContract();

    return useMutation({

        mutationFn: async ({
            pool_id, amount
        }: {
            pool_id: string,
            amount: number
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.FundVault(pool_id, amount);
            console.log("Fund vault transaction receipt:", receipt);
            return receipt;
        },

        onSuccess: async () => {

            toast.success("Vault funded successfully.");
        },
    });
}

export function useCancelPolicy() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            policyId
        }: {
            policyId: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.CancelPolicy(policyId);
            console.log("Challenge cancellation tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["policy", variables.policyId],
            });
        },
        onError: async (error) => {
            console.error("Error creating cancel policy:", error);
            toast.error("Failed to cancel policy.");
        }
    });
}

export function useBuyPolicy() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            poolId,
            amount
        }: {
            poolId: string
            amount: number
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.BuyPolicy(poolId, amount);
            console.log("Buy policy tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["policy", variables.poolId],
            });
        },
        onError: async (error) => {
            console.error("Error creating buy policy:", error);
            toast.error("Failed to buy policy.");
        }
    });
}


export function useRecordDailyReading() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            poolId,
            day
        }: {
            poolId: string
            day: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.RecordDailyReading(poolId, day);
            console.log("Record daily reading tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["policy", variables.poolId],
            });
        },
        onError: async (error) => {
            console.error("Error recording daily reading:", error);
            toast.error("Failed to record daily reading.");
        }
    });
}


export function useTriggerEmergencyPayout() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            poolId,
            reason,
            evidence_url
        }: {
            poolId: string
            reason: string,
            evidence_url: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.TriggerEmergencyPayout(poolId, reason, evidence_url);
            console.log("Trigger emergency payout tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["policy", variables.poolId],
            });
        },
        onError: async (error) => {
            console.error("Error triggering emergency payout:", error);
            toast.error("Failed to trigger emergency payout.");
        }
    });
}

export function useExpirePool() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            poolId,
        }: {
            poolId: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.ExpirePool(poolId);
            console.log("Expire pool tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["policy", variables.poolId],
            });
        },
        onError: async (error) => {
            console.error("Error expiring pool:", error);
            toast.error("Failed to expire pool.");
        }
    });
}

export function useCheckTrigger() {
    const contract = useClimateShieldContract();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            poolId,
        }: {
            poolId: string
        }) => {
            if (!contract) {
                throw new Error("Contract not initialized");
            }

            const receipt = await contract.CheckTrigger(poolId);
            console.log("Check trigger tx receipt:", receipt);
            return receipt;
        },

        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({
                queryKey: ["policy", variables.poolId],
            });
        },
        onError: async (error) => {
            console.error("Error checking trigger:", error);
            toast.error("Failed to check trigger.");
        }
    });
}

