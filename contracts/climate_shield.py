# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
from dataclasses import dataclass
from datetime import datetime, timezone
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass
    class Write:
        pass


@allow_storage
@dataclass
class Policy:
    policy_id: str
    pool_id: str
    farmer: str
    premium_paid: i32
    coverage_amount: i32
    active: bool
    claimed: bool
    joined_at: str


@allow_storage
@dataclass
class WeatherReading:
    day: str                # ISO date string e.g. "2026-07-09"
    soil_moisture: str      # raw value as string e.g. "0.12"
    drought_index: str      # "normal" | "watch" | "warning" | "severe"
    recorded_at: str
    recorded_by: str


@allow_storage
@dataclass
class PayoutRecord:
    payout_id: str
    pool_id: str
    farmer: str
    amount: i32
    trigger_reason: str
    paid_at: str


@allow_storage
@dataclass
class Pool:
    pool_id: str
    name: str
    description: str
    region_name: str
    latitude: str           
    longitude: str   
    radius_km: str   
    drought_threshold: str 
    consecutive_days_required: i32 
    premium_per_policy: i32
    coverage_per_policy: i32
    max_policies: i32
    total_policies: i32
    vault_balance: i32
    status: str             # "open" | "active" | "triggered" | "closed"
    created_at: str
    created_by: str
    trigger_activated_at: str
    policy_ids: DynArray[str]
    reading_days: DynArray[str]
    season_end: i64
    admin_override_reason: str
    admin_override_at: str


class ClimateShield(gl.Contract):

    # Pools — each pool covers a geographic region
    pools: TreeMap[str, Pool]
    pool_ids: DynArray[str]
    pool_counter: i32

    # Policies — keyed by policy_id
    policies: TreeMap[str, Policy]
    policy_counter: i32

    # Weather readings — keyed by pool_id + "|" + day
    readings: TreeMap[str, WeatherReading]

    # Payout records — keyed by payout_id
    payouts: TreeMap[str, PayoutRecord]
    payout_counter: i32

    
    farmer_pool_policy: TreeMap[str, str]

    # Admin
    admin: str

    def __init__(self, admin_address: str):
        self.admin = admin_address
        self.pool_counter = i32(0)
        self.policy_counter = i32(0)
        self.payout_counter = i32(0)

    # ─── Helpers ──────────────────────────────────────────────

    def _only_admin(self) -> None:
        assert str(gl.message.sender_address) == self.admin, "Only admin"

    def _reading_key(self, pool_id: str, day: str) -> str:
        return pool_id + "|" + day

    def _farmer_pool_key(self, pool_id: str, wallet: str) -> str:
        return pool_id + "|" + wallet

    def _classify_drought(self, moisture: float, threshold: float) -> str:
        if moisture >= threshold:
            return "normal"
        ratio = moisture / threshold
        if ratio >= 0.75:
            return "watch"
        elif ratio >= 0.50:
            return "warning"
        else:
            return "severe"

    def _tx_day(self) -> str:
        raw = str(gl.message_raw["datetime"])
        return raw[:10]


    @gl.public.write
    def create_pool(
        self,
        name: str,
        description: str,
        region_name: str,
        latitude: str,
        longitude: str,
        radius_km: str,
        drought_threshold: str,
        consecutive_days_required: i32,
        premium_per_policy: i32,
        coverage_per_policy: i32,
        max_policies: i32,
        season_end: i64
    ) -> str:
        self._only_admin()

        assert len(name) >= 3, "Name too short"
        assert len(region_name) >= 2, "Region name too short"
        assert len(latitude) > 0, "Latitude required"
        assert len(longitude) > 0, "Longitude required"
        assert len(drought_threshold) > 0, "Drought threshold required"
        assert int(consecutive_days_required) >= 1, "Consecutive days must be at least 1"
        assert int(premium_per_policy) > 0, "Premium must be greater than 0"
        assert int(coverage_per_policy) > int(premium_per_policy), "Coverage must exceed premium"
        assert int(max_policies) >= 1, "Max policies must be at least 1"

        self.pool_counter += i32(1)
        pool_id = f"pool_{self.pool_counter}"

        self.pools[pool_id] = Pool(
            pool_id=pool_id,
            name=name,
            description=description,
            region_name=region_name,
            latitude=latitude,
            longitude=longitude,
            radius_km=radius_km,
            drought_threshold=drought_threshold,
            consecutive_days_required=consecutive_days_required,
            premium_per_policy=premium_per_policy,
            coverage_per_policy=coverage_per_policy,
            max_policies=max_policies,
            total_policies=i32(0),
            vault_balance=i32(0),
            status="open",
            created_at=gl.message_raw["datetime"],
            created_by=str(gl.message.sender_address),
            trigger_activated_at="",
            policy_ids=[],
            reading_days=[],
            season_end=season_end
        )

        self.pool_ids.append(pool_id)
        return pool_id

    @gl.public.write
    def close_pool(self, pool_id: str) -> None:
        self._only_admin()
        assert pool_id in self.pools, "Pool not found"
        assert self.pools[pool_id].status == "open", "Pool not open"
        self.pools[pool_id].status = "closed"


    @gl.public.write.payable
    def buy_policy(self, pool_id: str) -> str:
        """
        Any wallet can buy a policy. No registration required.
        Just pay the premium in GEN and you are covered.
        One policy per wallet per pool.
        """
        farmer = str(gl.message.sender_address)

        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status in ["open", "active"], "Pool not accepting new policies"
        assert int(p.total_policies) < int(p.max_policies), "Pool is full"

        farmer_key = self._farmer_pool_key(pool_id, farmer)
        assert farmer_key not in self.farmer_pool_policy, "Already have a policy in this pool"

        expected_wei = u256(p.premium_per_policy) * u256(10**18)
        assert gl.message.value == expected_wei, "Must send exact premium amount in GEN"

        self.policy_counter += i32(1)
        policy_id = f"policy_{self.policy_counter}"

        self.policies[policy_id] = Policy(
            policy_id=policy_id,
            pool_id=pool_id,
            farmer=farmer,
            premium_paid=p.premium_per_policy,
            coverage_amount=p.coverage_per_policy,
            active=True,
            claimed=False,
            joined_at=gl.message_raw["datetime"]
        )

        self.pools[pool_id].total_policies += i32(1)
        self.pools[pool_id].vault_balance += p.premium_per_policy
        self.pools[pool_id].policy_ids.append(policy_id)
        self.farmer_pool_policy[farmer_key] = policy_id

        # Activate pool once it has at least 1 policy
        if p.status == "open":
            self.pools[pool_id].status = "active"

        return policy_id

    # ─── Admin Fund Vault ─────────────────────────────────────

    @gl.public.write.payable
    def fund_vault(self, pool_id: str) -> None:
        """
        Admin or sponsors can top up the vault to ensure
        sufficient funds for payouts beyond premium collection.
        """
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status in ["open", "active"], "Pool not active"

        amount_gen = int(gl.message.value) // (10**18)
        assert amount_gen > 0, "Must send GEN to fund vault"

        self.pools[pool_id].vault_balance += i32(amount_gen)

    # ─── Record Daily Weather Reading ─────────────────────────


    @gl.public.write
    def record_daily_reading(self, pool_id: str, day: str) -> None:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"
        assert len(day) == 10, "day must be YYYY-MM-DD"

        reading_key = self._reading_key(pool_id, day)
        assert reading_key not in self.readings, "Reading already recorded for this day"
        assert day <= self._tx_day(), "Cannot record readings for future dates"

        lat = p.latitude
        lon = p.longitude
        threshold = p.drought_threshold
        recorder = str(gl.message.sender_address)
        requested_day = day

        def fetch_moisture() -> str:
            urls = [
                (
                    "https://archive-api.open-meteo.com/v1/archive"
                    f"?latitude={lat}&longitude={lon}"
                    f"&start_date={requested_day}&end_date={requested_day}"
                    "&hourly=soil_moisture_0_to_7cm"
                    "&timezone=UTC"
                    "&models=era5_land"
                ),
                (
                    "https://api.open-meteo.com/v1/forecast"
                    f"?latitude={lat}&longitude={lon}"
                    f"&start_date={requested_day}&end_date={requested_day}"
                    "&hourly=soil_moisture_0_to_7cm"
                    "&timezone=UTC"
                ),
            ]
            last_keys = ""
            for url in urls:
                try:
                    response = gl.nondet.web.get(url)
                    raw = response.body.decode("utf-8")
                    data = json.loads(raw)
                    last_keys = ",".join(sorted(data.keys()))
                    hours = data.get("hourly", {})
                    series = hours.get("soil_moisture_0_to_7cm", [])
                    vals = [float(x) for x in series if x is not None]
                    if len(vals) > 0:
                        mean = sum(vals) / float(len(vals))
                        return str(round(mean, 4))
                except Exception:
                    last_keys = "fetch_or_parse_failed"
                    continue
            assert False, f"No moisture in API keys={last_keys}"

        moisture_s = gl.eq_principle.strict_eq(fetch_moisture)
        moisture_val = float(moisture_s)
        drought_index = self._classify_drought(moisture_val, float(threshold))

        self.readings[reading_key] = WeatherReading(
            day=day,
            soil_moisture=moisture_s,
            drought_index=drought_index,
            recorded_at=gl.message_raw["datetime"],
            recorded_by=recorder,
        )
        self.pools[pool_id].reading_days.append(day)

    # ─── Check Trigger Condition ──────────────────────────────

    @gl.public.write
    def check_trigger(self, pool_id: str) -> bool:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"

        required_days = int(p.consecutive_days_required)
        all_days = list(p.reading_days)

        assert len(all_days) >= required_days, "Not enough readings yet"

        recent_days = all_days[-required_days:]

       
        from datetime import datetime as dt, timedelta
        for i in range(1, len(recent_days)):
            prev_date = dt.strptime(recent_days[i - 1], "%Y-%m-%d")
            curr_date = dt.strptime(recent_days[i], "%Y-%m-%d")
            diff = curr_date - prev_date
            assert diff.days == 1, \
                f"Readings are not consecutive: {recent_days[i-1]} and {recent_days[i]} have a gap"

        drought_days = 0
        for day in recent_days:
            rkey = self._reading_key(pool_id, day)
            if rkey in self.readings:
                reading = self.readings[rkey]
                if reading.drought_index in ["severe", "warning"]:
                    drought_days += 1

        if drought_days >= required_days:
            self._execute_payouts(pool_id, recent_days, drought_days)
            return True

        return False
    
    

    def _execute_payouts(
        self,
        pool_id: str,
        trigger_days: list[str],
        drought_days: int
    ) -> None:
        p = self.pools[pool_id]
        policy_ids = list(p.policy_ids)
        coverage = int(p.coverage_per_policy)
        vault = int(p.vault_balance)

        eligible = []
        for pid in policy_ids:
            policy = self.policies[pid]
            if policy.active and not policy.claimed:
                eligible.append(pid)

        total_needed = coverage * len(eligible)

        if total_needed > vault:
            per_farmer = vault // len(eligible) if eligible else 0
        else:
            per_farmer = coverage

        trigger_reason = (
            f"Drought trigger: {drought_days} consecutive days of "
            f"severe/warning drought conditions detected. "
            f"Days checked: {', '.join(trigger_days[:5])}"
            f"{'...' if len(trigger_days) > 5 else ''}"
        )

        for pid in eligible:
            policy = self.policies[pid]
            farmer_wallet = policy.farmer

            if per_farmer > 0:
                self.payout_counter += i32(1)
                payout_id = f"payout_{self.payout_counter}"

                self.payouts[payout_id] = PayoutRecord(
                    payout_id=payout_id,
                    pool_id=pool_id,
                    farmer=farmer_wallet,
                    amount=i32(per_farmer),
                    trigger_reason=trigger_reason,
                    paid_at=gl.message_raw["datetime"]
                )

                self.policies[pid].claimed = True

                payout_wei = u256(per_farmer) * u256(10**18)
                _Recipient(Address(farmer_wallet)).emit_transfer(value=payout_wei)

        self.pools[pool_id].status = "triggered"
        self.pools[pool_id].trigger_activated_at = gl.message_raw["datetime"]
        self.pools[pool_id].vault_balance = i32(
            max(0, vault - (per_farmer * len(eligible)))
        )

    @gl.public.write
    def expire_pool(self, pool_id: str) -> None:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not expirable"
        assert self._tx_day() >= str(p.season_end)[:10] or int(p.season_end) <= 0, (
            "Pool season not ended yet"
        )
        # If season_end is a unix ms from create_pool, compare that too:
        day = self._tx_day()
        if int(p.season_end) > 10_000:
            # millisecond timestamp stored at create time
            from datetime import datetime as dt, timezone as tz
            end = dt.fromtimestamp(int(p.season_end) / 1000, tz=tz.utc).strftime("%Y-%m-%d")
            assert day >= end, "Pool season not ended yet"

        self.pools[pool_id].status = "expired"
        remaining = int(p.vault_balance)
        if remaining > 0:
            self.pools[pool_id].vault_balance = i32(0)
            _Recipient(Address(self.admin)).emit_transfer(
                value=u256(remaining) * u256(10**18)
            )


    @gl.public.write
    def admin_trigger_payout(
    self,
    pool_id: str,
    reason: str,
    evidence_url: str
    ) -> None:
        self._only_admin()
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status == "active", "Pool not active"
        assert len(reason) >= 20, "Reason must be at least 20 characters"
        assert evidence_url.startswith("http"), "Evidence URL required"
        assert len(evidence_url) > 0, "Must provide evidence URL for admin override"

        self.pools[pool_id].admin_override_reason = reason
        self.pools[pool_id].admin_override_at = gl.message_raw["datetime"]

        reading_key = self._reading_key(pool_id, f"admin_override_{gl.message_raw['datetime']}")
        self.readings[reading_key] = WeatherReading(
            day=f"admin_override",
            soil_moisture="admin_override",
            drought_index="severe",
            recorded_at=gl.message_raw["datetime"],
            recorded_by=str(gl.message.sender_address)
        )

        recent_days = list(p.reading_days[-7:]) if len(p.reading_days) >= 7 else list(p.reading_days)
        self._execute_payouts(pool_id, recent_days, len(recent_days))

    # ─── Cancel Policy & Refund (before trigger) ─────────────

    @gl.public.write
    def cancel_policy(self, policy_id: str) -> None:
        """
        Farmers can cancel their policy and receive a partial refund
        as long as the pool has not triggered yet.
        Refund is 50% of premium to account for admin costs.
        """
        farmer = str(gl.message.sender_address)
        assert policy_id in self.policies, "Policy not found"
        policy = self.policies[policy_id]
        assert policy.farmer == farmer, "Not your policy"
        assert policy.active, "Policy not active"
        assert not policy.claimed, "Policy already claimed"

        pool_id = policy.pool_id
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        assert p.status != "triggered", "Cannot cancel after trigger"

        refund = int(policy.premium_paid) // 2

        self.policies[policy_id].active = False
        self.pools[pool_id].total_policies -= i32(1)
        self.pools[pool_id].vault_balance -= i32(refund)

        farmer_key = self._farmer_pool_key(pool_id, farmer)
        if farmer_key in self.farmer_pool_policy:
            del self.farmer_pool_policy[farmer_key]

        if refund > 0:
            refund_wei = u256(refund) * u256(10**18)
            _Recipient(Address(farmer)).emit_transfer(value=refund_wei)

    # ─── Read Methods ─────────────────────────────────────────

    @gl.public.view
    def get_pool(self, pool_id: str) -> Pool:
        assert pool_id in self.pools, "Pool not found"
        return gl.storage.copy_to_memory(self.pools[pool_id])

    @gl.public.view
    def get_all_pools(self) -> list[Pool]:
        result = []
        for pid in self.pool_ids:
            result.append(gl.storage.copy_to_memory(self.pools[pid]))
        return result

    @gl.public.view
    def get_active_pools(self) -> list[Pool]:
        result = []
        for pid in self.pool_ids:
            p = self.pools[pid]
            if p.status in ["open", "active"]:
                result.append(gl.storage.copy_to_memory(p))
        return result

    @gl.public.view
    def get_policy(self, policy_id: str) -> Policy:
        assert policy_id in self.policies, "Policy not found"
        return gl.storage.copy_to_memory(self.policies[policy_id])

    @gl.public.view
    def get_farmer_policy(self, pool_id: str, wallet: str) -> Policy:
        farmer_key = self._farmer_pool_key(pool_id, wallet)
        assert farmer_key in self.farmer_pool_policy, "No policy found"
        policy_id = self.farmer_pool_policy[farmer_key]
        return gl.storage.copy_to_memory(self.policies[policy_id])

    @gl.public.view
    def has_policy(self, pool_id: str, wallet: str) -> bool:
        farmer_key = self._farmer_pool_key(pool_id, wallet)
        return farmer_key in self.farmer_pool_policy

    @gl.public.view
    def get_pool_policies(self, pool_id: str) -> list[Policy]:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        result = []
        for pid in p.policy_ids:
            result.append(gl.storage.copy_to_memory(self.policies[pid]))
        return result

    @gl.public.view
    def get_weather_reading(self, pool_id: str, day: str) -> WeatherReading:
        rkey = self._reading_key(pool_id, day)
        assert rkey in self.readings, "Reading not found"
        return gl.storage.copy_to_memory(self.readings[rkey])

    @gl.public.view
    def get_recent_readings(self, pool_id: str, days: i32) -> list[WeatherReading]:
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        all_days = list(p.reading_days)
        n = min(int(days), len(all_days))
        recent = all_days[-n:]
        result = []
        for day in recent:
            rkey = self._reading_key(pool_id, day)
            if rkey in self.readings:
                result.append(gl.storage.copy_to_memory(self.readings[rkey]))
        return result

    @gl.public.view
    def get_payout(self, payout_id: str) -> PayoutRecord:
        assert payout_id in self.payouts, "Payout not found"
        return gl.storage.copy_to_memory(self.payouts[payout_id])

    @gl.public.view
    def get_pool_payouts(self, pool_id: str) -> list[PayoutRecord]:
        result = []
        counter = int(self.payout_counter)
        for i in range(1, counter + 1):
            payout_id = f"payout_{i}"
            if payout_id in self.payouts:
                payout = self.payouts[payout_id]
                if payout.pool_id == pool_id:
                    result.append(gl.storage.copy_to_memory(payout))
        return result

    @gl.public.view
    def get_farmer_payouts(self, wallet: str) -> list[PayoutRecord]:
        result = []
        counter = int(self.payout_counter)
        for i in range(1, counter + 1):
            payout_id = f"payout_{i}"
            if payout_id in self.payouts:
                payout = self.payouts[payout_id]
                if payout.farmer == wallet:
                    result.append(gl.storage.copy_to_memory(payout))
        return result

    @gl.public.view
    def get_consecutive_drought_days(self, pool_id: str) -> i32:
        """
        Returns how many consecutive drought days have been recorded
        so far. Useful for the frontend to show progress toward trigger.
        """
        assert pool_id in self.pools, "Pool not found"
        p = self.pools[pool_id]
        all_days = list(p.reading_days)

        consecutive = 0
        for day in reversed(all_days):
            rkey = self._reading_key(pool_id, day)
            if rkey in self.readings:
                reading = self.readings[rkey]
                if reading.drought_index in ["severe", "warning"]:
                    consecutive += 1
                else:
                    break
            else:
                break

        return i32(consecutive)

    @gl.public.view
    def get_total_pools(self) -> i32:
        return self.pool_counter

    @gl.public.view
    def get_total_policies(self) -> i32:
        return self.policy_counter

    @gl.public.view
    def get_total_payouts(self) -> i32:
        return self.payout_counter