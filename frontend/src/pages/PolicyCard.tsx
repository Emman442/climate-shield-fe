import React from "react";
import { MapPin, ChevronRight } from "lucide-react";
import type { Policy, Pool } from "../lib/contract/types";
import {
  useFetchConsecutiveDroughtDays,
  useFetchWeatherReading,
} from "../hooks/ClimateShield";

function getIndexDotColor(index?: string) {
  switch (index) {
    case "normal":
      return "bg-[#16a34a]";
    case "watch":
      return "bg-[#ca8a04]";
    case "warning":
      return "bg-[#d97706]";
    case "severe":
      return "bg-[#dc2626]";
    default:
      return "bg-[#374151]";
  }
}

export default function PolicyCard({
  policy,
  pool,
  cancellingPolicyId,
  setCancellingPolicyId,
  onViewPool,
  onCancel,
}: {
  policy: Policy;
  pool?: Pool;
  cancellingPolicyId: string | null;
  setCancellingPolicyId: (id: string | null) => void;
  onViewPool: (poolId: string) => void;
  onCancel: (policy: Policy) => void;
}) {
  const lastDay = pool?.reading_days?.at(-1) ?? "";
  const { data: consecutiveDroughtDays } = useFetchConsecutiveDroughtDays(
    pool?.pool_id ?? ""
  );
  const { data: weatherReading } = useFetchWeatherReading(
    pool?.pool_id ?? "",
    lastDay
  );

  if (!pool) return null;

  const daysRemaining = Math.max(
    0,
    Number(pool.consecutive_days_required) - Number(consecutiveDroughtDays ?? 0)
  );

  return (
    <div className="bg-[#0f0f0f] border-l-4 border-l-[#16a34a] border border-[#1e1e1e] p-5 rounded-[6px] flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h3 className="text-white text-sm font-bold leading-tight">
              {pool.name}
            </h3>
            <div className="flex items-center gap-1 text-[11px] text-[#6b7280] mt-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{pool.region_name}</span>
            </div>
          </div>
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
              policy.active
                ? "border-[#16a34a] text-[#16a34a]"
                : policy.claimed
                  ? "border-[#6b7280] text-[#6b7280]"
                  : "border-red-900 text-[#dc2626]"
            }`}
          >
            {policy.active ? "active" : policy.claimed ? "claimed" : "inactive"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 bg-[#141414] rounded-[4px] text-xs">
          <div>
            <span className="text-[#6b7280] block text-[10px] uppercase">
              Policy ID
            </span>
            <span className="font-mono text-white break-all">
              {policy.policy_id}
            </span>
          </div>
          <div>
            <span className="text-[#6b7280] block text-[10px] uppercase">
              Premium Paid
            </span>
            <span className="font-mono text-white font-bold">
              {policy.premium_paid} GEN
            </span>
          </div>
          <div className="mt-1">
            <span className="text-[#6b7280] block text-[10px] uppercase">
              Member Since
            </span>
            <span className="font-mono text-white">{policy.joined_at}</span>
          </div>
          <div className="mt-1">
            <span className="text-[#6b7280] block text-[10px] uppercase">
              Target Coverage
            </span>
            <span className="font-mono text-[#22c55e] font-bold">
              {policy.coverage_amount} GEN
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center text-xs pt-1 border-t border-[#1e1e1e]">
          <span className="text-[#6b7280] flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${getIndexDotColor(
                weatherReading?.drought_index
              )}`}
            />
            Drought status:{" "}
            <strong className="text-white font-normal">
              {weatherReading?.drought_index ?? "—"}
            </strong>
          </span>

          {policy.active && (
            <span className="text-[11px] font-mono text-white">
              {daysRemaining === 0 ? (
                <strong className="text-[#22c55e] font-semibold">
                  Conditions Met
                </strong>
              ) : (
                <span>{daysRemaining} streak days remaining</span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => onViewPool(pool.pool_id)}
          className="text-xs font-bold text-[#16a34a] hover:text-[#22c55e] flex items-center gap-1 cursor-pointer transition-colors"
        >
          View Pool Page
          <ChevronRight className="w-4 h-4" />
        </button>

        {policy.active &&
          (cancellingPolicyId === policy.policy_id ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCancel(policy)}
                className="px-2 py-1 bg-[#dc2626] hover:bg-red-700 text-white text-[10px] font-bold rounded-[3px] cursor-pointer"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setCancellingPolicyId(null)}
                className="px-2 py-1 bg-[#1e1e1e] text-[#6b7280] text-[10px] font-bold rounded-[3px] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCancellingPolicyId(policy.policy_id)}
              className="text-[10px] text-[#6b7280] hover:text-[#dc2626] cursor-pointer transition-colors"
            >
              Cancel policy (50% refund)
            </button>
          ))}
      </div>
    </div>
  );
}