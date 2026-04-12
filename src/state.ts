import { Modifiers, TeamMember, Nature, Ability } from './types';
import { UsageTier } from './usage';
import { pokemonList } from './pokemon';

// --- Constants ---

export const ABILITY_LABELS: Record<Ability, string> = {
    'none': '',
    'swift-swim': 'Swift Swim',
    'sand-rush': 'Sand Rush',
    'chlorophyll': 'Chlorophyll',
    'slush-rush': 'Slush Rush',
    'unburden': 'Unburden',
    'surge-surfer': 'Surge Surfer',
    'quick-feet': 'Quick Feet',
};

export function createDefaultModifiers(): Modifiers {
    return {
        stage: 0,
        paralysis: false,
        choiceScarf: false,
        tailwind: false,
        ability: 'none',
    };
}

// --- State ---

export let currentModifiers: Modifiers = createDefaultModifiers();
export let sortDescending = true;
export let compareFilter = '';
export let compareErrors: string[] = [];
export let hideMinSpeedFast = true;
export let showTeam = localStorage.getItem('speedtiers-team') !== null && loadTeam().some(m => m !== null);
export let currentTier: UsageTier = loadTier();
export const hiddenPokemon = new Set<string>();
export const team: (TeamMember | null)[] = loadTeam();
export let editingSlot: number | null = null;

// Setters needed because TypeScript `export let` bindings can't be assigned from other modules
export function setSortDescending(v: boolean): void { sortDescending = v; }
export function setCompareFilter(v: string): void { compareFilter = v; }
export function setCompareErrors(v: string[]): void { compareErrors = v; }
export function setHideMinSpeedFast(v: boolean): void { hideMinSpeedFast = v; }
export function setShowTeam(v: boolean): void { showTeam = v; }
export function setCurrentTier(v: UsageTier): void { currentTier = v; }
export function setEditingSlot(v: number | null): void { editingSlot = v; }

// --- Persistence ---

interface SavedTeamMember {
    pokemonName: string;
    stats: number;
    nature: Nature;
    modifiers: Modifiers;
    item: string;
}

function loadTier(): UsageTier {
    const saved = localStorage.getItem('speedtiers-tier');
    if (saved === 'top30' || saved === 'top100' || saved === 'all') return saved;
    return 'top100';
}

export function saveTier(): void {
    localStorage.setItem('speedtiers-tier', currentTier);
}

export function saveTeam(): void {
    const data: (SavedTeamMember | null)[] = team.map(m => {
        if (!m) return null;
        return {
            pokemonName: m.pokemon.name,
            stats: m.stats,
            nature: m.nature,
            modifiers: m.modifiers,
            item: m.item,
        };
    });
    localStorage.setItem('speedtiers-team', JSON.stringify(data));
}

function loadTeam(): (TeamMember | null)[] {
    const saved = localStorage.getItem('speedtiers-team');
    if (!saved) return [null, null, null, null, null, null];
    try {
        const data: (SavedTeamMember | null)[] = JSON.parse(saved);
        return data.map(d => {
            if (!d) return null;
            const pokemon = pokemonList.find(p => p.name === d.pokemonName);
            if (!pokemon) return null;
            return {
                pokemon,
                stats: d.stats,
                nature: d.nature,
                modifiers: d.modifiers,
                item: d.item,
            };
        });
    } catch {
        return [null, null, null, null, null, null];
    }
}
