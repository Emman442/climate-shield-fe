import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types"
import { parseEther } from "viem";
import { TransactionReceipt, Pool, Policy, PayoutRecord, WeatherReading } from "./types";

/**
 * MemeArena contract class for interacting with the GenLayer MemeArena contract
 */

class ClimateShield {
    private contractAddress: `0x${string}`;
    private client: ReturnType<typeof createClient>;

    constructor(
        contractAddress: string,
        address?: string | null,
        studioUrl?: string
    ) {
        this.contractAddress = contractAddress as `0x${string}`;

        const config: any = {
            chain: studionet,
        };

        if (address) {
            config.account = address as `0x${string}`;
        }

        if (studioUrl) {
            config.endpoint = studioUrl;
        }

        this.client = createClient(config);
    }

    /**
     * Update the address used for transactions
     */
    updateAccount(address: string): void {
        const config: any = {
            chain: studionet,
            account: address as `0x${string}`,
        };

        this.client = createClient(config);
    }


    /**
     * Get a particular user profile from the contract
     * @returns a user profile object with all relevant details
     */

    async getPools(): Promise<Pool[]> {
        try {
            const pools = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_all_pools",
            });


            return pools as Pool[];
        } catch (error) {
            console.error("Error fetching pools: ", error);
            throw new Error("Failed to fetch pools");
        }
    }

    async getPool(poolId: string): Promise<Pool> {
        try {
            const pool = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_pool",
                args: [poolId]
            });


            return pool as Pool;
        } catch (error) {
            console.error("Error fetching pool: ", error);
            throw new Error("Failed to fetch pool");
        }
    }

    async getPoolPolicies(poolId: string): Promise<Policy[]> {
        try {
            const pool = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_pool_policies",
                args:[poolId]
            });


            return pool as Policy[];
        } catch (error) {
            console.error("Error fetching pool policies: ", error);
            throw new Error("Failed to fetch pool policies");
        }
    }

    async getConsecutiveDroughtDays(poolId: string): Promise<Number> {
        try {
            const num = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_consecutive_drought_days",
                args: [poolId]
            });

            return num as Number;
        } catch (error) {
            console.error("Error fetching consecutive drought days: ", error);
            throw new Error("Failed to fetch consecutive drought days");
        }
    }

    async getWeatherReading(poolId: string, day: string): Promise<WeatherReading> {
        try {
            const weather_reading = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_weather_reading",
                args:[poolId, day]
            });

            return weather_reading as WeatherReading;
        } catch (error) {
            console.error("Error fetching weather Reading: ", error);
            throw new Error("Failed to fetch weather reading");
        }
    }

    async getFarmerPayouts(wallet: string): Promise<PayoutRecord[]> {
        try {
            const pool = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_farmer_payouts",
                args:[wallet]
            });


            return pool as PayoutRecord[];
        } catch (error) {
            console.error("Error fetching farmer payouts: ", error);
            throw new Error("Failed to fetch farmer payouts");
        }
    }

    async hasPolicy(poolId: string, wallet: string): Promise<boolean> {
  try {
    const yes = await this.client.readContract({
      address: this.contractAddress,
      functionName: "has_policy",
      args: [poolId, wallet],
    });
    return Boolean(yes);
  } catch (error) {
    console.error("Error checking policy:", error);
    return false;
  }
}

async getFarmerPolicy(poolId: string, wallet: string): Promise<Policy> {
  try {
    const policy = await this.client.readContract({
      address: this.contractAddress,
      functionName: "get_farmer_policy",
      args: [poolId, wallet],
    });
    return policy as Policy;
  } catch (error) {
    console.error("Error fetching farmer policy:", error);
    throw new Error("Failed to fetch farmer policy");
  }
}

async getFarmerPolicies(wallet: string, poolIds: string[]): Promise<Policy[]> {
  const out: Policy[] = [];
  for (const poolId of poolIds) {
    const exists = await this.hasPolicy(poolId, wallet);
    if (!exists) continue;
    out.push(await this.getFarmerPolicy(poolId, wallet));
  }
  return out;
}


    async getRecentReadings(poolId: string, days: number): Promise<WeatherReading[]> {
        try {
            const recent_readings = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_recent_readings",
                args: [poolId, days]
            });


            return recent_readings as WeatherReading[];
        } catch (error) {
            console.error("Error fetching recent readings", error);
            throw new Error("Failed to fetch recent readings");
        }
    }


    async getPoolPayouts(poolId: string,): Promise<PayoutRecord[]> {
        try {
            const recent_readings = await this.client.readContract({
                address: this.contractAddress,
                functionName: "get_pool_payouts",
                args: [poolId]
            });


            return recent_readings as PayoutRecord[];
        } catch (error) {
            console.error("Error fetching payouts", error);
            throw new Error("Failed to fetch payouts");
        }
    }


    async CreatePool(
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
    ) {

        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "create_pool",
                args: [name, description, region_name, latitude, longitude, radius_km, drought_threshold, consecutive_days_required, premium_per_policy, coverage_per_policy, max_policies, season_end],
                value: BigInt(0)

            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error Creating Pool:", error);
            throw new Error("Failed to create pool");
        }
    }


    async CancelPolicy(
        policy_id: string
    ) {

        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "cancel_policy",
                args: [policy_id],
                value: BigInt(0)

            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error Cancelling Policy:", error);
            throw new Error("Failed to cancel policy");
        }
    }

    async FundVault(
        pool_id: string,
        amount: number
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "fund_vault",
                args: [pool_id],
                value: parseEther(amount.toString())
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error Funding Pool:", error);
            throw new Error("Failed to fund pool");
        }

    }


    async BuyPolicy(
        pool_id: string,
        amount: number
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "buy_policy",
                args: [pool_id],
                value: parseEther(amount.toString())
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error buying Policy:", error);
            throw new Error("Failed to buy policy");
        }
    }

    async ExpirePool(
        pool_id: string,
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "expire_pool",
                args: [pool_id],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error expiring pool:", error);
            throw new Error("Failed to expire pool");
        }
    }

    async CheckTrigger(
        pool_id: string,
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "check_trigger",
                args: [pool_id],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error checking trigger:", error);
            throw new Error("Failed to check trigger");
        }
    }


    async TriggerEmergencyPayout(
        pool_id: string,
        reason: string,
        evidence_url: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "admin_trigger_payout",
                args: [pool_id, reason, evidence_url],
                value: BigInt(0)
            });

            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error triggering emergency payout:", error);
            throw new Error("Failed to trigger emergency payout");
        }

    }

    async RecordDailyReading(
        pool_id: string,
        day: string
    ) {
        await this.client.connect("studionet");
        try {
            const txHash = await this.client.writeContract({
                address: this.contractAddress,
                functionName: "record_daily_reading",
                args: [pool_id, day],
                value: BigInt(0)
            });

         
            const receipt = await this.client.waitForTransactionReceipt({
                hash: txHash,
                status: TransactionStatus.ACCEPTED,
                retries: 60,
                interval: 5000,
            });

            return receipt as TransactionReceipt;
        } catch (error) {
            console.error("Error recording daily reading:", error);
            throw new Error("Failed to record daily reading");
        }

    }

  
   
}


export default ClimateShield;