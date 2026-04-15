import { Nature, Modifiers, SpeedEntry, TeamEntry, TeamMember, Ability, Pokemon } from './types';
import { calculateSpeed } from './calc';
import { pokemonList } from './pokemon';
import { isInTier } from './usage';
import {
    hideMinSpeedFast, showChoiceScarf, compareFilter, currentTier,
    hiddenPokemon, team, ABILITY_LABELS,
    teamStage, teamParalysis, teamTailwind,
    setCompareErrors,
} from './state';

// --- Helpers ---

function getPrimaryAbility(mon: { ability?: Ability | Ability[] }): Ability | undefined {
    if (!mon.ability) return undefined;
    return Array.isArray(mon.ability) ? mon.ability[0] : mon.ability;
}

export function getAbilityLabel(mon: { ability?: Ability | Ability[] }): string {
    if (!mon.ability) return '';
    if (Array.isArray(mon.ability)) {
        return mon.ability.map(a => ABILITY_LABELS[a]).join('/');
    }
    return ABILITY_LABELS[mon.ability];
}

export function formatNature(nature: Nature): string {
    if (nature === 'beneficial') return '+';
    if (nature === 'hindering') return '-';
    return '';
}

export function formatEntry(entry: SpeedEntry): string {
    const name = entry.displayName ?? entry.pokemon.name;
    const nature = formatNature(entry.nature);
    const abilityLabel = entry.abilityActive ? getAbilityLabel(entry.pokemon) + ' ' : '';
    return `${nature}${entry.stats} ${abilityLabel}${name}`;
}

export function formatTeamEntry(te: TeamEntry): string {
    const name = te.displayName ?? te.member.pokemon.name;
    const nature = formatNature(te.member.nature);
    const abilityLabel = te.member.modifiers.ability !== 'none'
        ? ABILITY_LABELS[te.member.modifiers.ability] + ' '
        : '';
    return `${nature}${te.member.stats} ${abilityLabel}${name}`;
}

export function natureClass(nature: Nature): string {
    if (nature === 'beneficial') return 'nature-beneficial';
    if (nature === 'hindering') return 'nature-hindering';
    return 'nature-neutral';
}

// --- Main entries ---

const BASE_CONFIGS: { stats: number; nature: Nature }[] = [
    { stats: 32, nature: 'beneficial' },
    { stats: 32, nature: 'neutral' },
    { stats: 0, nature: 'neutral' },
    { stats: 0, nature: 'hindering' },
];

// Precompute base species lookup
const pokemonById = new Map(pokemonList.map(p => [p.id, p]));

export function generateEntries(modifiers: Modifiers): SpeedEntry[] {
    const entries: SpeedEntry[] = [];
    const speedCache = new Map<string, number>();

    function cachedSpeed(spe: number, stats: number, nature: Nature, mods: Modifiers): number {
        const key = `${spe}|${stats}|${nature}|${mods.ability}|${mods.choiceScarf}|${mods.paralysis}|${mods.tailwind}|${mods.stage}`;
        let speed = speedCache.get(key);
        if (speed === undefined) {
            speed = calculateSpeed(spe, stats, nature, mods);
            speedCache.set(key, speed);
        }
        return speed;
    }

    const scarfMods: Modifiers = { ...modifiers, choiceScarf: true };
    const skipSameSpeed = !compareFilter.trim();

    for (const mon of pokemonList) {
        // Skip same-speed forms unless compare filter is active
        if (skipSameSpeed && mon.baseSpecies) {
            const base = pokemonById.get(mon.baseSpecies);
            if (base && base.spe === mon.spe) continue;
        }

        for (const config of BASE_CONFIGS) {
            if (hideMinSpeedFast && mon.spe >= 100 && (config.nature === 'hindering' || config.stats === 0)) continue;
            entries.push({
                pokemon: mon,
                stats: config.stats,
                nature: config.nature,
                speed: cachedSpeed(mon.spe, config.stats, config.nature, modifiers),
                abilityActive: false,
            });
        }

        // Choice Scarf entries: max stats only, beneficial and neutral
        // Cannot be used with Megas or Unburden
        const isMega = mon.name.startsWith('Mega ') || mon.name.includes('-Mega');
        const hasUnburden = getPrimaryAbility(mon) === 'unburden';
        if (!isMega && !hasUnburden) {
            for (const nature of ['beneficial', 'neutral'] as Nature[]) {
                entries.push({
                    pokemon: mon,
                    stats: 32,
                    nature,
                    speed: cachedSpeed(mon.spe, 32, nature, scarfMods),
                    abilityActive: false,
                    displayName: `Choice Scarf ${mon.name}`,
                });
            }
        }

        const ability = getPrimaryAbility(mon);
        if (ability) {
            const abilityMods: Modifiers = { ...modifiers, ability };
            for (const nature of ['beneficial', 'neutral'] as Nature[]) {
                entries.push({
                    pokemon: mon,
                    stats: 32,
                    nature,
                    speed: cachedSpeed(mon.spe, 32, nature, abilityMods),
                    abilityActive: true,
                });
            }
        }
    }
    return entries;
}

function normalizeInput(input: string): string {
    return input.toLowerCase().replace(/-/g, ' ').trim();
}

// Special case aliases
const ALIASES: Record<string, string> = {
    'floette': 'floette-eternal',
    'floette eternal': 'floette-eternal',
};

function resolveAlias(input: string): string {
    return ALIASES[input] || input;
}

function matchesPokemon(pokemon: Pokemon, normalizedInput: string): boolean {
    const id = pokemon.id;

    // Direct id match
    if (id === normalizedInput) return true;

    // Handle "raichu-alola" -> "alolan raichu" style inputs
    // Split on space, check if reversing prefix/suffix matches regional pattern
    const idNoDash = id.replace(/-/g, ' ');
    if (idNoDash === normalizedInput) return true;

    // Check regional reverse format: "raichu alola" -> "alolan raichu"
    const regionMap: Record<string, string> = {
        'alola': 'alolan',
        'alolan': 'alolan',
        'galar': 'galarian',
        'galarian': 'galarian',
        'hisui': 'hisuian',
        'hisuian': 'hisuian',
        'paldea': 'paldean',
        'paldean': 'paldean',
    };
    const parts = normalizedInput.split(' ');
    if (parts.length === 2) {
        // "raichu alola" -> check "alolan raichu"
        const suffix = regionMap[parts[1]];
        if (suffix && id === `${suffix} ${parts[0]}`) return true;
        // "alolan raichu" is already handled by direct match
    }

    return false;
}

/**
 * Parse the compare filter and return the set of Pokemon ids that should be shown.
 * Also includes all megas of matched base species.
 * Sets compareErrors for any unmatched inputs.
 */
function resolveCompareFilter(): Set<string> | null {
    if (!compareFilter.trim()) return null;

    const inputs = compareFilter.split(',').map(s => s.trim()).filter(s => s).slice(0, 6);
    if (inputs.length === 0) return null;

    const matchedIds = new Set<string>();
    const errors: string[] = [];

    for (const raw of inputs) {
        const normalized = resolveAlias(normalizeInput(raw));
        let found = false;

        // Try direct match first (specific form)
        const directMatch = pokemonList.find(p => matchesPokemon(p, normalized));
        if (directMatch) {
            found = true;
            matchedIds.add(directMatch.id);
            // Add all megas of this Pokemon
            for (const p of pokemonList) {
                if (p.baseSpecies === directMatch.id) matchedIds.add(p.id);
            }
        }

        // Also check if input matches a base species — include all forms
        if (!directMatch || !directMatch.baseSpecies) {
            // Input might be a base species name — include all forms
            const baseId = normalizeInput(raw);
            const resolvedBase = resolveAlias(baseId);
            for (const p of pokemonList) {
                if (p.baseSpecies === resolvedBase || p.id === resolvedBase) {
                    found = true;
                    matchedIds.add(p.id);
                }
            }
        }

        if (!found) {
            errors.push(raw);
        }
    }

    setCompareErrors(errors);
    return matchedIds;
}

export function filterEntries(entries: SpeedEntry[]): SpeedEntry[] {
    const compareSet = resolveCompareFilter();

    // When compare filter is active, ignore all other filters
    if (compareSet) {
        return entries.filter(entry => compareSet.has(entry.pokemon.id));
    }

    // Default filtering: tier + hidden + choice scarf toggle
    return entries.filter(entry => {
        if (!isInTier(entry.pokemon.name, currentTier)) return false;
        if (hiddenPokemon.has(entry.pokemon.name)) return false;
        if (!showChoiceScarf && entry.displayName?.startsWith('Choice Scarf')) return false;
        return true;
    });
}

// --- Team entries ---

function isMegaOf(megaName: string, name: string): boolean {
    if (megaName === `Mega ${name}` || megaName.startsWith(`Mega ${name} `)) return true;
    if (megaName === `${name}-Mega` || megaName.startsWith(`${name}-Mega-`)) return true;
    return false;
}

function findMegaForms(pokemon: { name: string }): typeof pokemonList {
    const name = pokemon.name;
    const results = pokemonList.filter(p => isMegaOf(p.name, name));
    if (results.length === 0 && name.includes('-')) {
        const baseName = name.split('-')[0];
        return pokemonList.filter(p => isMegaOf(p.name, baseName));
    }
    return results;
}

function getMegaStoneSuffix(item: string): string | null {
    const lower = item.toLowerCase();
    for (const s of [' x', ' y', ' z']) {
        if (lower.endsWith(`ite${s}`)) return s.trim().toUpperCase();
    }
    if (lower.endsWith('ite')) return '';
    return null;
}

function getMegaXYZSuffix(megaName: string): string {
    const match = megaName.match(/[\s-]([XYZ])$/);
    return match ? match[1] : '';
}

function isChoiceScarf(item: string): boolean {
    return item.toLowerCase() === 'choice scarf';
}

function applyTeamModifiers(mods: Modifiers): Modifiers {
    return {
        ...mods,
        stage: teamStage || mods.stage,
        paralysis: teamParalysis || mods.paralysis,
        tailwind: teamTailwind || mods.tailwind,
    };
}

function addTeamEntry(
    entries: TeamEntry[],
    member: TeamMember,
    spe: number,
    displayName?: string,
): void {
    const mods = applyTeamModifiers(member.modifiers);
    entries.push({
        member,
        speed: calculateSpeed(spe, member.stats, member.nature, mods),
        displayName,
    });
}

export function generateTeamEntries(): TeamEntry[] {
    const entries: TeamEntry[] = [];
    for (const member of team) {
        if (!member) continue;

        // If this is a Mega, also show the base form
        if (member.pokemon.baseSpecies) {
            const base = pokemonById.get(member.pokemon.baseSpecies);
            if (base) {
                const baseMember: TeamMember = { ...member, pokemon: base };
                addTeamEntry(entries, baseMember, base.spe);
            }
        }

        // Base entry (ensure choiceScarf is off — scarf is handled via item)
        const baseMods = { ...member.modifiers, choiceScarf: false };
        const baseMember: TeamMember = { ...member, modifiers: baseMods };
        addTeamEntry(entries, baseMember, member.pokemon.spe);

        // Choice Scarf: add a second entry with scarf modifier
        if (isChoiceScarf(member.item)) {
            const scarfMember: TeamMember = {
                ...member,
                modifiers: { ...member.modifiers, choiceScarf: true },
            };
            addTeamEntry(entries, scarfMember, member.pokemon.spe, `Choice Scarf ${member.pokemon.name}`);
        }

        // Mega forms
        const itemSuffix = getMegaStoneSuffix(member.item);
        if (itemSuffix !== null) {
            const megas = findMegaForms(member.pokemon);
            const hasXYZ = megas.some(m => getMegaXYZSuffix(m.name) !== '');
            for (const mega of megas) {
                if (hasXYZ) {
                    const megaSuffix = getMegaXYZSuffix(mega.name);
                    if (megaSuffix !== itemSuffix) continue;
                }
                const megaMember: TeamMember = { ...member, pokemon: mega };
                addTeamEntry(entries, megaMember, mega.spe);
            }
        }
    }
    return entries;
}

// --- Grouping ---

export interface SpeedRow {
    speed: number;
    mainEntries: SpeedEntry[];
    teamEntries: TeamEntry[];
}

export interface EntryGroup {
    pokemonName: string;   // display name for the group
    hideName: string;      // real Pokemon name for hide filtering
    entries: SpeedEntry[];
}

export function groupEntriesByPokemon(entries: SpeedEntry[]): EntryGroup[] {
    const groups: SpeedEntry[][] = [];
    let current: SpeedEntry[] = [];
    for (const entry of entries) {
        if (current.length > 0 && (current[0].pokemon !== entry.pokemon || current[0].abilityActive !== entry.abilityActive || current[0].displayName !== entry.displayName)) {
            groups.push(current);
            current = [];
        }
        current.push(entry);
    }
    if (current.length > 0) groups.push(current);
    return groups.map(group => ({
        pokemonName: group[0].displayName ?? group[0].pokemon.name,
        hideName: group[0].pokemon.name,
        entries: group,
    }));
}

export function buildSpeedRows(mainEntries: SpeedEntry[], teamEntries: TeamEntry[]): SpeedRow[] {
    const map = new Map<number, SpeedRow>();

    for (const entry of mainEntries) {
        let row = map.get(entry.speed);
        if (!row) {
            row = { speed: entry.speed, mainEntries: [], teamEntries: [] };
            map.set(entry.speed, row);
        }
        row.mainEntries.push(entry);
    }

    for (const te of teamEntries) {
        let row = map.get(te.speed);
        if (!row) {
            row = { speed: te.speed, mainEntries: [], teamEntries: [] };
            map.set(te.speed, row);
        }
        row.teamEntries.push(te);
    }

    return Array.from(map.values());
}
