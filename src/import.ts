import { Nature, Ability, Modifiers } from './types';
import { pokemonList } from './pokemon';

const SPEED_BENEFICIAL_NATURES = new Set([
    'Jolly', 'Timid', 'Hasty', 'Naive',
]);

const SPEED_HINDERING_NATURES = new Set([
    'Brave', 'Quiet', 'Relaxed', 'Sassy',
]);

const ABILITY_NAME_MAP: Record<string, Ability> = {
    'Swift Swim': 'swift-swim',
    'Sand Rush': 'sand-rush',
    'Chlorophyll': 'chlorophyll',
    'Slush Rush': 'slush-rush',
    'Unburden': 'unburden',
    'Surge Surfer': 'surge-surfer',
    'Quick Feet': 'quick-feet',
};

interface ParsedMon {
    name: string;
    item: string;
    nature: Nature;
    speedEV: number;
    ability: Ability;
}

function parseNature(natureName: string): Nature {
    if (SPEED_BENEFICIAL_NATURES.has(natureName)) return 'beneficial';
    if (SPEED_HINDERING_NATURES.has(natureName)) return 'hindering';
    return 'neutral';
}

function parseShowdownPaste(text: string): ParsedMon[] {
    const mons: ParsedMon[] = [];
    const blocks = text.trim().split(/\n\s*\n/);

    for (const block of blocks) {
        if (!block.trim()) continue;
        const lines = block.trim().split('\n').map(l => l.trim());

        // Name and item: first line, "Name @ Item" or just "Name"
        let name = lines[0];
        let item = '';
        if (name.includes('@')) {
            const parts = name.split('@');
            name = parts[0].trim();
            item = parts[1].trim();
        }
        // Strip nickname: "Nickname (Pokemon)" -> "Pokemon"
        // But ignore gender markers: "Pokemon (F)" or "Pokemon (M)"
        const parenMatch = name.match(/\(([^)]+)\)/);
        if (parenMatch) {
            const inner = parenMatch[1].trim();
            if (inner === 'M' || inner === 'F') {
                // Gender marker — just remove it, keep the name before it
                name = name.replace(/\s*\([MF]\)/, '').trim();
            } else {
                name = inner;
            }
        }

        let nature: Nature = 'neutral';
        let speedEV = 0;
        let ability: Ability = 'none';

        for (const line of lines) {
            // Nature
            const natureMatch = line.match(/^(\w+)\s+Nature$/);
            if (natureMatch) {
                nature = parseNature(natureMatch[1]);
            }

            // EVs
            if (line.startsWith('EVs:')) {
                const evParts = line.substring(4).split('/').map(s => s.trim());
                for (const part of evParts) {
                    const match = part.match(/^(\d+)\s+spe$/i);
                    if (match) {
                        speedEV = parseInt(match[1]);
                    }
                }
            }

            // Ability
            if (line.startsWith('Ability:')) {
                const abilityName = line.substring(8).trim();
                ability = ABILITY_NAME_MAP[abilityName] ?? 'none';
            }
        }

        mons.push({ name, item, nature, speedEV, ability });
    }

    return mons;
}

function mainlineEVToStats(ev: number): number {
    if (ev < 4) return 0;
    return Math.floor((ev - 4) / 8) + 1;
}

export interface ImportResult {
    success: boolean;
    error?: string;
    members?: {
        pokemonName: string;
        item: string;
        stats: number;
        nature: Nature;
        modifiers: Modifiers;
    }[];
}

export function importTeam(text: string, isMainline: boolean): ImportResult {
    const parsed = parseShowdownPaste(text);
    if (parsed.length === 0) {
        return { success: false, error: 'No Pokemon found in paste.' };
    }

    const members: ImportResult['members'] = [];

    for (const mon of parsed.slice(0, 6)) {
        // Find Pokemon in our roster
        const pokemon = pokemonList.find(p =>
            p.name.toLowerCase() === mon.name.toLowerCase()
        );
        if (!pokemon) continue;

        let stats: number;
        if (isMainline) {
            stats = mainlineEVToStats(mon.speedEV);
        } else {
            // Champions format: value should be 0-32
            if (mon.speedEV < 0 || mon.speedEV > 32) {
                return {
                    success: false,
                    error: `"${mon.name}" has speed stat ${mon.speedEV}, which is outside the 0-32 range. Did you mean to use Mainline format?`,
                };
            }
            stats = mon.speedEV;
        }

        members.push({
            pokemonName: pokemon.name,
            item: mon.item,
            stats,
            nature: mon.nature,
            modifiers: {
                stage: 0,
                paralysis: false,
                choiceScarf: false,
                tailwind: false,
                ability: mon.ability,
            },
        });
    }

    if (members.length === 0) {
        return { success: false, error: 'None of the Pokemon in the paste were found in the roster.' };
    }

    return { success: true, members };
}
