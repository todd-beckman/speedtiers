import { UsageTier, USAGE_TIER_LABELS } from './usage';
import {
    currentModifiers, sortDescending, compareFilter, compareErrors, hideMinSpeedFast,
    showTeam, currentTier, hiddenPokemon,
    setSortDescending, setCompareFilter, setHideMinSpeedFast, setShowTeam,
    setCurrentTier, saveTier,
} from './state';
import { buildStageSelect, addCheckbox } from './ui-helpers';
import { render, renderTableOnly } from './main';

export function buildGlobalControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'controls';

    // Compare filter
    const filterLabel = document.createElement('label');
    filterLabel.textContent = 'Compare against your opponent: ';
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'e.g. garchomp, starmie, raichu';
    filterInput.value = compareFilter;
    filterInput.addEventListener('input', () => {
        setCompareFilter(filterInput.value);
        renderTableOnly();
    });
    filterLabel.appendChild(filterInput);
    controls.appendChild(filterLabel);

    // Compare errors
    if (compareErrors.length > 0) {
        const errorSpan = document.createElement('span');
        errorSpan.className = 'compare-error';
        errorSpan.textContent = `Not found: ${compareErrors.join(', ')}`;
        controls.appendChild(errorSpan);
    }

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
        setCurrentTier(tierSelect.value as UsageTier);
        saveTier();
        render();
    });
    tierLabel.appendChild(tierSelect);
    controls.appendChild(tierLabel);

    // Sort toggle
    const sortBtn = document.createElement('button');
    sortBtn.className = 'control-btn';
    sortBtn.textContent = sortDescending ? 'Sort: Desc' : 'Sort: Asc';
    sortBtn.addEventListener('click', () => {
        setSortDescending(!sortDescending);
        render();
    });
    controls.appendChild(sortBtn);

    // Team toggle
    const teamBtn = document.createElement('button');
    teamBtn.className = 'control-btn';
    teamBtn.textContent = showTeam ? 'Hide Team' : 'Show Team';
    teamBtn.addEventListener('click', () => {
        setShowTeam(!showTeam);
        render();
    });
    controls.appendChild(teamBtn);

    return controls;
}

export function buildMainControls(): HTMLElement {
    const controls = document.createElement('div');
    controls.className = 'controls controls-main';

    const label = document.createElement('span');
    label.className = 'controls-label';
    label.textContent = 'Main:';
    controls.appendChild(label);

    // Stage dropdown
    const stageLabel = document.createElement('label');
    stageLabel.textContent = 'Stage: ';
    stageLabel.appendChild(buildStageSelect(currentModifiers.stage, stage => {
        currentModifiers.stage = stage;
        render();
    }));
    controls.appendChild(stageLabel);

    addCheckbox(controls, 'Paralysis', currentModifiers.paralysis, v => { currentModifiers.paralysis = v; render(); });
    addCheckbox(controls, 'Choice Scarf', currentModifiers.choiceScarf, v => { currentModifiers.choiceScarf = v; render(); });
    addCheckbox(controls, 'Tailwind', currentModifiers.tailwind, v => { currentModifiers.tailwind = v; render(); });
    addCheckbox(controls, 'Hide Min Speed Fast', hideMinSpeedFast, v => { setHideMinSpeedFast(v); render(); });

    // Restore hidden
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
