export type UsageTier = 'top30' | 'top50' | 'top100' | 'all';

export const USAGE_TIER_LABELS: Record<UsageTier, string> = {
    top30: 'Top 30',
    top50: 'Top 50',
    top100: 'Top 100',
    all: 'All',
};

let top30: Set<string> = new Set();
let top50: Set<string> = new Set();
let top100: Set<string> = new Set();

export async function loadTiers(): Promise<void> {
    const [top30Data, top50Data, top100Data] = await Promise.all([
        fetch(`${import.meta.env.BASE_URL}tiers/top30.json`).then(r => r.json()),
        fetch(`${import.meta.env.BASE_URL}tiers/top50.json`).then(r => r.json()),
        fetch(`${import.meta.env.BASE_URL}tiers/top100.json`).then(r => r.json()),
    ]);
    top30 = new Set(top30Data as string[]);
    top50 = new Set(top50Data as string[]);
    top100 = new Set(top100Data as string[]);
}

export function isInTier(name: string, tier: UsageTier): boolean {
    if (tier === 'all') return true;
    if (tier === 'top30') return top30.has(name);
    if (tier === 'top50') return top50.has(name);
    return top100.has(name);
}
