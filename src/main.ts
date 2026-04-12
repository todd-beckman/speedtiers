import { Nature, Modifiers, SpeedEntry, SpeedStage, Ability, TeamMember, TeamEntry } from './types';
import { calculateSpeed } from './calc';
import { pokemonList } from './pokemon';
import { importTeam } from './import';
import { UsageTier, USAGE_TIER_LABELS, isInTier, loadTiers } from './usage';

const ABILITY_LABELS: Record<Ability, string> = {
    'none': '',
    'swift-swim': 'Swift Swim',
    'sand-rush': 'Sand Rush',
    'chlorophyll': 'Chlorophyll',
    'slush-rush': 'Slush Rush',
    'unburden': 'Unburden',
    'surge-surfer': 'Surge Surfer',
    'quick-feet': 'Quick Feet',
};

const BASE_CONFIGS: { stats: number; nature: Nature }[] = [
    { stats: 32, nature: 'beneficial' },
    { stats: 32, nature: 'neutral' },
    { stats: 0, nature: 'neutral' },
    { stats: 0, nature: 'hindering' },
];

let currentModifiers: Modifiers = {
    stage: 0,
    paralysis: false,
    choiceScarf: false,
    tailwind: false,
    ability: 'none',
};

let sortDescending = true;
let nameFilter = '';
let hideMinSpeedFast = true;
let showTeam = false;
let currentTier: UsageTier = 'top100';
const hiddenPokemon = new Set<string>();
const team: (TeamMember | null)[] = [null, null, null, null, null, null];
let editingSlot: number | null = null;

// --- Helpers ---

function getPrimaryAbility(mon: { ability?: Ability | Ability[] }): Ability | undefined {
    if (!mon.ability) return undefined;
    return Array.isArray(mon.ability) ? mon.ability[0] : mon.ability;
}

function getAbilityLabel(mon: { ability?: Ability | Ability[] }): string {
    if (!mon.ability) return '';
    if (Array.isArray(mon.ability)) {
        return mon.ability.map(a => ABILITY_LABELS[a]).join('/');
    }
    return ABILITY_LABELS[mon.ability];
}

function formatNature(nature: Nature): string {
    if (nature === 'beneficial') return '+';
    if (nature === 'hindering') return '-';
    return '';
}

function formatEntry(entry: SpeedEntry): string {
    const nature = formatNature(entry.nature);
    const abilityLabel = entry.abilityActive ? getAbilityLabel(entry.pokemon) + ' ' : '';
    return `${nature}${entry.stats} ${abilityLabel}${entry.pokemon.name}`;
}

function formatTeamEntry(te: TeamEntry): string {
    const nature = formatNature(te.member.nature);
    const abilityLabel = te.member.modifiers.ability !== 'none'
        ? ABILITY_LABELS[te.member.modifiers.ability] + ' '
        : '';
    return `${nature}${te.member.stats} ${abilityLabel}${te.member.pokemon.name}`;
}

function natureClass(nature: Nature): string {
    if (nature === 'beneficial') return 'nature-beneficial';
    if (nature === 'hindering') return 'nature-hindering';
    return 'nature-neutral';
}

// --- Main entries ---

function generateEntries(modifiers: Modifiers): SpeedEntry[] {
    const entries: SpeedEntry[] = [];
    const speedCache = new Map<string, number>();

    function cachedSpeed(spe: number, stats: number, nature: Nature, mods: Modifiers): number {
        const key = `${spe}|${stats}|${nature}|${mods.ability}`;
        let speed = speedCache.get(key);
        if (speed === undefined) {
            speed = calculateSpeed(spe, stats, nature, mods);
            speedCache.set(key, speed);
        }
        return speed;
    }

    for (const mon of pokemonList) {
        for (const config of BASE_CONFIGS) {
            if (hideMinSpeedFast && mon.spe >= 100 && config.nature === 'hindering') continue;
            entries.push({
                pokemon: mon,
                stats: config.stats,
                nature: config.nature,
                speed: cachedSpeed(mon.spe, config.stats, config.nature, modifiers),
                abilityActive: false,
            });
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

function filterEntries(entries: SpeedEntry[]): SpeedEntry[] {
    const filter = nameFilter.toLowerCase();
    return entries.filter(entry => {
        if (!isInTier(entry.pokemon.name, currentTier)) return false;
        if (hiddenPokemon.has(entry.pokemon.name)) return false;
        if (filter && !entry.pokemon.name.toLowerCase().includes(filter)) return false;
        return true;
    });
}

// --- Team entries ---

function isMegaOf(megaName: string, name: string): boolean {
    // "Mega Venusaur" pattern
    if (megaName === `Mega ${name}` || megaName.startsWith(`Mega ${name} `)) return true;
    // "<Name>-Mega" / "<Name>-Mega-X" pattern
    if (megaName === `${name}-Mega` || megaName.startsWith(`${name}-Mega-`)) return true;
    return false;
}

function findMegaForms(pokemon: { name: string }): typeof pokemonList {
    const name = pokemon.name;
    const results = pokemonList.filter(p => isMegaOf(p.name, name));
    // Fallback: strip form suffix (e.g., "Floette-Eternal" -> "Floette")
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
    // "Mega Charizard X" -> "X", "Charizard-Mega-X" -> "X"
    // "Mega Venusaur" -> "", "Floette-Mega" -> ""
    const match = megaName.match(/[\s-]([XYZ])$/);
    return match ? match[1] : '';
}

function generateTeamEntries(): TeamEntry[] {
    const entries: TeamEntry[] = [];
    for (const member of team) {
        if (!member) continue;
        // Base form entry
        entries.push({
            member,
            speed: calculateSpeed(member.pokemon.spe, member.stats, member.nature, member.modifiers),
        });
        // Mega form entries only if holding a mega stone
        const itemSuffix = getMegaStoneSuffix(member.item);
        if (itemSuffix !== null) {
            const megas = findMegaForms(member.pokemon);
            const hasXYZ = megas.some(m => getMegaXYZSuffix(m.name) !== '');
            for (const mega of megas) {
                // If X/Y/Z variants exist, only show the one matching the item suffix
                if (hasXYZ) {
                    const megaSuffix = getMegaXYZSuffix(mega.name);
                    if (megaSuffix !== itemSuffix) continue;
                }
                const megaMember: TeamMember = {
                    ...member,
                    pokemon: mega,
                };
                entries.push({
                    member: megaMember,
                    speed: calculateSpeed(mega.spe, member.stats, member.nature, member.modifiers),
                });
            }
        }
    }
    return entries;
}

// --- Grouping ---

interface SpeedRow {
    speed: number;
    mainEntries: SpeedEntry[];
    teamEntries: TeamEntry[];
}

interface EntryGroup {
    pokemonName: string;
    entries: SpeedEntry[];
}

function groupEntriesByPokemon(entries: SpeedEntry[]): EntryGroup[] {
    const groups: SpeedEntry[][] = [];
    let current: SpeedEntry[] = [];
    for (const entry of entries) {
        if (current.length > 0 && (current[0].pokemon !== entry.pokemon || current[0].abilityActive !== entry.abilityActive)) {
            groups.push(current);
            current = [];
        }
        current.push(entry);
    }
    if (current.length > 0) groups.push(current);
    return groups.map(group => ({
        pokemonName: group[0].pokemon.name,
        entries: group,
    }));
}

function buildSpeedRows(mainEntries: SpeedEntry[], teamEntries: TeamEntry[]): SpeedRow[] {
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

// --- Controls ---

function addCheckbox(container: HTMLElement, label: string, checked: boolean, onChange: (v: boolean) => void): void {
    const wrapper = document.createElement('label');
    wrapper.className = 'control-checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => {
        onChange(input.checked);
        render();
    });
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(` ${label}`));
    container.appendChild(wrapper);
}

function buildGlobalControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'controls';

    // Name filter
    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Filter: ';
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Pokemon name...';
    filterInput.value = nameFilter;
    filterInput.addEventListener('input', () => {
        nameFilter = filterInput.value;
        renderTableOnly();
    });
    filterLabel.appendChild(filterInput);
    controls.appendChild(filterLabel);

    // Tier dropdown
    const tierLabel = document.createElement('label');
    tierLabel.textContent = 'Tier: ';
    const tierSelect = document.createElement('select');
    for (const tier of ['top30', 'top100', 'all'] as UsageTier[]) {
        const opt = document.createElement('option');
        opt.value = tier;
        opt.textContent = USAGE_TIER_LABELS[tier];
        if (tier === currentTier) opt.selected = true;
        tierSelect.appendChild(opt);
    }
    tierSelect.addEventListener('change', () => {
        currentTier = tierSelect.value as UsageTier;
        render();
    });
    tierLabel.appendChild(tierSelect);
    controls.appendChild(tierLabel);

    // Sort toggle
    const sortBtn = document.createElement('button');
    sortBtn.className = 'control-btn';
    sortBtn.textContent = sortDescending ? 'Sort: Desc' : 'Sort: Asc';
    sortBtn.addEventListener('click', () => {
        sortDescending = !sortDescending;
        render();
    });
    controls.appendChild(sortBtn);

    // Team toggle
    const teamBtn = document.createElement('button');
    teamBtn.className = 'control-btn';
    teamBtn.textContent = showTeam ? 'Hide Team' : 'Show Team';
    teamBtn.addEventListener('click', () => {
        showTeam = !showTeam;
        render();
    });
    controls.appendChild(teamBtn);

    return controls;
}

function buildMainControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'controls controls-main';

    const label = document.createElement('span');
    label.className = 'controls-label';
    label.textContent = 'Main:';
    controls.appendChild(label);

    // Stage dropdown
    const stageLabel = document.createElement('label');
    stageLabel.textContent = 'Stage: ';
    const stageSelect = document.createElement('select');
    for (let i = 6; i >= -6; i--) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = i > 0 ? `+${i}` : String(i);
        if (i === currentModifiers.stage) opt.selected = true;
        stageSelect.appendChild(opt);
    }
    stageSelect.addEventListener('change', () => {
        currentModifiers.stage = Number(stageSelect.value) as SpeedStage;
        render();
    });
    stageLabel.appendChild(stageSelect);
    controls.appendChild(stageLabel);

    addCheckbox(controls, 'Paralysis', currentModifiers.paralysis, v => { currentModifiers.paralysis = v; });
    addCheckbox(controls, 'Choice Scarf', currentModifiers.choiceScarf, v => { currentModifiers.choiceScarf = v; });
    addCheckbox(controls, 'Tailwind', currentModifiers.tailwind, v => { currentModifiers.tailwind = v; });
    addCheckbox(controls, 'Hide Min Speed Fast', hideMinSpeedFast, v => { hideMinSpeedFast = v; });

    // Restore hidden (at end so it doesn't shift other controls)
    if (hiddenPokemon.size > 0) {
        const restoreBtn = document.createElement('button');
        restoreBtn.className = 'control-btn';
        restoreBtn.textContent = `Restore Hidden (${hiddenPokemon.size})`;
        restoreBtn.addEventListener('click', () => {
            hiddenPokemon.clear();
            render();
        });
        controls.appendChild(restoreBtn);
    }

    return controls;
}

// --- Team Panel ---

function buildTeamPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'team-panel';

    const heading = document.createElement('h2');
    heading.textContent = 'Team';
    panel.appendChild(heading);

    const slots = document.createElement('div');
    slots.className = 'team-slots';

    for (let i = 0; i < 6; i++) {
        const slot = document.createElement('div');
        slot.className = 'team-slot' + (editingSlot === i ? ' team-slot-active' : '');
        const member = team[i];

        if (member) {
            const speed = calculateSpeed(member.pokemon.spe, member.stats, member.nature, member.modifiers);
            const nameSpan = document.createElement('span');
            nameSpan.className = 'team-slot-name';
            nameSpan.textContent = `${member.pokemon.name} (${speed})`;
            nameSpan.addEventListener('click', () => {
                editingSlot = editingSlot === i ? null : i;
                render();
            });
            slot.appendChild(nameSpan);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'team-slot-remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => {
                team[i] = null;
                if (editingSlot === i) editingSlot = null;
                render();
            });
            slot.appendChild(removeBtn);
        } else {
            const addBtn = document.createElement('button');
            addBtn.className = 'team-slot-add';
            addBtn.textContent = '+ Add';
            addBtn.addEventListener('click', () => {
                editingSlot = i;
                render();
            });
            slot.appendChild(addBtn);
        }

        slots.appendChild(slot);
    }
    panel.appendChild(slots);

    // Editing area
    if (editingSlot !== null) {
        panel.appendChild(buildSlotEditor(editingSlot));
    }

    // Import section
    panel.appendChild(buildImportUI());

    return panel;
}

let importMainline = false;

function executeImport(text: string, isMainline: boolean): string | null {
    const result = importTeam(text, isMainline);
    if (!result.success) {
        return result.error ?? 'Import failed.';
    }

    for (let i = 0; i < 6; i++) {
        const imported = result.members![i];
        if (imported) {
            const pokemon = pokemonList.find(p => p.name === imported.pokemonName);
            if (pokemon) {
                team[i] = {
                    pokemon,
                    stats: imported.stats,
                    nature: imported.nature,
                    modifiers: imported.modifiers,
                    item: imported.item,
                };
            } else {
                team[i] = null;
            }
        } else {
            team[i] = null;
        }
    }
    editingSlot = null;
    return null;
}

function buildImportUI(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'import-section';

    const toggleRow = document.createElement('div');
    toggleRow.className = 'import-toggle-row';

    const importBtn = document.createElement('button');
    importBtn.className = 'control-btn';
    importBtn.textContent = 'Import Team';

    const formatLabel = document.createElement('label');
    formatLabel.className = 'control-checkbox';
    const formatCheck = document.createElement('input');
    formatCheck.type = 'checkbox';
    formatCheck.checked = importMainline;
    formatCheck.addEventListener('change', () => {
        importMainline = formatCheck.checked;
    });
    formatLabel.appendChild(formatCheck);
    formatLabel.appendChild(document.createTextNode(' Mainline format'));

    toggleRow.appendChild(importBtn);
    toggleRow.appendChild(formatLabel);

    section.appendChild(toggleRow);

    const textArea = document.createElement('textarea');
    textArea.className = 'import-textarea';
    textArea.placeholder = 'Paste Showdown team here...';
    textArea.style.display = 'none';

    const errorMsg = document.createElement('div');
    errorMsg.className = 'import-error';

    let expanded = false;
    importBtn.addEventListener('click', () => {
        if (!expanded) {
            expanded = true;
            textArea.style.display = '';
            importBtn.textContent = 'Import';
            return;
        }

        const error = executeImport(textArea.value, importMainline);
        if (error) {
            errorMsg.textContent = error;
            return;
        }
        render();
    });

    section.appendChild(textArea);
    section.appendChild(errorMsg);

    return section;
}

function buildSlotEditor(slotIndex: number): HTMLElement {
    const editor = document.createElement('div');
    editor.className = 'slot-editor';
    const member = team[slotIndex];

    // Pokemon picker
    const pickerLabel = document.createElement('label');
    pickerLabel.textContent = 'Pokemon: ';
    const pickerSelect = document.createElement('select');
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '-- Select --';
    pickerSelect.appendChild(emptyOpt);
    for (const mon of pokemonList) {
        const opt = document.createElement('option');
        opt.value = mon.name;
        opt.textContent = mon.name;
        if (member && member.pokemon.name === mon.name) opt.selected = true;
        pickerSelect.appendChild(opt);
    }
    pickerSelect.addEventListener('change', () => {
        const mon = pokemonList.find(p => p.name === pickerSelect.value);
        if (mon) {
            team[slotIndex] = {
                pokemon: mon,
                stats: 32,
                nature: 'beneficial',
                modifiers: { stage: 0, paralysis: false, choiceScarf: false, tailwind: false, ability: 'none' },
                item: '',
            };
        } else {
            team[slotIndex] = null;
        }
        render();
    });
    pickerLabel.appendChild(pickerSelect);
    editor.appendChild(pickerLabel);

    if (!member) return editor;
    const current = member;

    // Stats slider
    const statsLabel = document.createElement('label');
    statsLabel.textContent = `Stats: ${member.stats} `;
    const statsSlider = document.createElement('input');
    statsSlider.type = 'range';
    statsSlider.min = '0';
    statsSlider.max = '32';
    statsSlider.value = String(member.stats);
    statsSlider.addEventListener('input', () => {
        member.stats = Number(statsSlider.value);
        statsLabel.firstChild!.textContent = `Stats: ${member.stats} `;
        renderTableOnly();
    });
    statsLabel.appendChild(statsSlider);
    editor.appendChild(statsLabel);

    // Nature
    const natureLabel = document.createElement('label');
    natureLabel.textContent = 'Nature: ';
    const natureSelect = document.createElement('select');
    for (const n of ['beneficial', 'neutral', 'hindering'] as Nature[]) {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n === 'beneficial' ? 'Beneficial (+)' : n === 'hindering' ? 'Hindering (-)' : 'Neutral';
        if (n === member.nature) opt.selected = true;
        natureSelect.appendChild(opt);
    }
    natureSelect.addEventListener('change', () => {
        member.nature = natureSelect.value as Nature;
        renderTableOnly();
    });
    natureLabel.appendChild(natureSelect);
    editor.appendChild(natureLabel);

    // Stage
    const stageLabel = document.createElement('label');
    stageLabel.textContent = 'Stage: ';
    const stageSelect = document.createElement('select');
    for (let i = 6; i >= -6; i--) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = i > 0 ? `+${i}` : String(i);
        if (i === member.modifiers.stage) opt.selected = true;
        stageSelect.appendChild(opt);
    }
    stageSelect.addEventListener('change', () => {
        member.modifiers.stage = Number(stageSelect.value) as SpeedStage;
        renderTableOnly();
    });
    stageLabel.appendChild(stageSelect);
    editor.appendChild(stageLabel);

    // Checkboxes
    function addModCheckbox(label: string, key: 'paralysis' | 'choiceScarf' | 'tailwind'): void {
        const wrapper = document.createElement('label');
        wrapper.className = 'control-checkbox';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = current.modifiers[key];
        input.addEventListener('change', () => {
            current.modifiers[key] = input.checked;
            renderTableOnly();
        });
        wrapper.appendChild(input);
        wrapper.appendChild(document.createTextNode(` ${label}`));
        editor.appendChild(wrapper);
    }

    addModCheckbox('Paralysis', 'paralysis');
    addModCheckbox('Choice Scarf', 'choiceScarf');
    addModCheckbox('Tailwind', 'tailwind');

    // Ability (only if the Pokemon has a relevant ability)
    if (member.pokemon.ability) {
        const abilities = Array.isArray(member.pokemon.ability) ? member.pokemon.ability : [member.pokemon.ability];
        const abilityLabel = document.createElement('label');
        abilityLabel.textContent = 'Ability: ';
        const abilitySelect = document.createElement('select');
        const noneOpt = document.createElement('option');
        noneOpt.value = 'none';
        noneOpt.textContent = 'None';
        if (member.modifiers.ability === 'none') noneOpt.selected = true;
        abilitySelect.appendChild(noneOpt);
        for (const ab of abilities) {
            const option = document.createElement('option');
            option.value = ab;
            option.textContent = ABILITY_LABELS[ab];
            if (ab === member.modifiers.ability) option.selected = true;
            abilitySelect.appendChild(option);
        }
        abilitySelect.addEventListener('change', () => {
            member.modifiers.ability = abilitySelect.value as Ability;
            renderTableOnly();
        });
        abilityLabel.appendChild(abilitySelect);
        editor.appendChild(abilityLabel);
    }

    return editor;
}

// --- Table ---

function renderTable(): HTMLElement {
    const allEntries = generateEntries(currentModifiers);
    const mainEntries = filterEntries(allEntries);
    const teamEntries = showTeam ? generateTeamEntries() : [];
    const rows = buildSpeedRows(mainEntries, teamEntries);
    rows.sort((a, b) => sortDescending ? b.speed - a.speed : a.speed - b.speed);

    const table = document.createElement('table');
    table.className = 'speed-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const thPokemon = document.createElement('th');
    thPokemon.textContent = 'Pokemon';
    headerRow.appendChild(thPokemon);

    const thSpeed = document.createElement('th');
    thSpeed.textContent = 'Speed';
    headerRow.appendChild(thSpeed);

    if (showTeam) {
        const thTeam = document.createElement('th');
        thTeam.textContent = 'Team';
        headerRow.appendChild(thTeam);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of rows) {
        const tr = document.createElement('tr');

        // Main column
        const tdPokemon = document.createElement('td');
        tdPokemon.className = 'pokemon-cell';
        const pokemonGroups = groupEntriesByPokemon(row.mainEntries);
        for (const group of pokemonGroups) {
            for (let i = 0; i < group.entries.length; i++) {
                const entry = group.entries[i];
                const span = document.createElement('span');
                span.className = `pokemon-entry ${natureClass(entry.nature)}`;
                span.textContent = formatEntry(entry);
                if (i === group.entries.length - 1) {
                    const hideBtn = document.createElement('button');
                    hideBtn.className = 'hide-btn';
                    hideBtn.textContent = '\u00d7';
                    hideBtn.title = `Hide ${group.pokemonName}`;
                    hideBtn.addEventListener('click', () => {
                        hiddenPokemon.add(group.pokemonName);
                        render();
                    });
                    span.appendChild(hideBtn);
                }
                tdPokemon.appendChild(span);
            }
            tdPokemon.appendChild(document.createTextNode(' '));
        }
        tr.appendChild(tdPokemon);

        // Speed column
        const tdSpeed = document.createElement('td');
        tdSpeed.className = 'speed-cell';
        tdSpeed.textContent = String(row.speed);
        tr.appendChild(tdSpeed);

        // Team column
        if (showTeam) {
            const tdTeam = document.createElement('td');
            tdTeam.className = 'team-cell';
            for (const te of row.teamEntries) {
                const span = document.createElement('span');
                span.className = `pokemon-entry ${natureClass(te.member.nature)}`;
                span.textContent = formatTeamEntry(te);
                tdTeam.appendChild(span);
            }
            tr.appendChild(tdTeam);
        }

        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
}

// --- Render ---

let tableContainer: HTMLElement;
let teamPanelContainer: HTMLElement;

function renderTableOnly(): void {
    tableContainer.replaceChildren(renderTable());
    if (showTeam) {
        teamPanelContainer.replaceChildren(buildTeamPanel());
    }
}

function render(): void {
    const app = document.getElementById('app')!;
    app.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'header';
    const title = document.createElement('h1');
    title.textContent = 'Speed Tiers';
    header.appendChild(title);
    app.appendChild(header);

    app.appendChild(buildGlobalControls());

    if (showTeam) {
        teamPanelContainer = document.createElement('div');
        teamPanelContainer.appendChild(buildTeamPanel());
        app.appendChild(teamPanelContainer);
    }

    app.appendChild(buildMainControls());

    tableContainer = document.createElement('div');
    tableContainer.appendChild(renderTable());
    app.appendChild(tableContainer);
}

loadTiers().then(() => render());
