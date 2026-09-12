import { useFetchConsecutiveDroughtDays} from '../hooks/ClimateShield';
import { Pool } from '../lib/contract/types';


export default function PoolRegistryRow({
  pool,
  onManage,
}: {
  pool: Pool;
  onManage: (id: string) => void;
}) {
  const { data: droughtDays } = useFetchConsecutiveDroughtDays(pool.pool_id);
  return (
    <tr className="hover:bg-[#141414]/40">
      <td className="p-3 text-white font-bold font-sans">{pool.name}</td>
      <td className="p-3 text-[#6b7280] font-sans">{pool.region_name}</td>
      <td className="p-3">
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-sans ${
          pool.status === "open"
            ? "bg-[#14532d] text-[#22c55e]"
            : pool.status === "active"
              ? "border border-[#16a34a] text-[#16a34a]"
              : pool.status === "triggered"
                ? "bg-[#dc2626] text-white"
                : "bg-gray-700 text-gray-300"
        }`}>
          {pool.status}
        </span>
      </td>
      <td className="p-3 text-white">
        {Number(droughtDays ?? 0)} / {pool.consecutive_days_required} days
      </td>
      <td className="p-3 text-[#22c55e] font-bold">{pool.vault_balance} GEN</td>
      <td className="p-3 text-right font-sans">
        <button
          type="button"
          onClick={() => onManage(pool.pool_id)}
          className="text-xs font-semibold text-[#16a34a] hover:text-[#22c55e] cursor-pointer"
        >
          Manage
        </button>
      </td>
    </tr>
  );
}