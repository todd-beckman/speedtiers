import { Nature, Ability } from './types';
import { calculateSpeed } from './calc';
import { pokemonList } from './pokemon';
import { importTeam } from './import';
import {
    team, editingSlot, setEditingSlot, ABILITY_LABELS, createDefaultModifiers,
    teamStage, teamParalysis, teamTailwind,
    setTeamStage, setTeamParalysis, setTeamTailwind,
} from './state';
import { buildStageSelect, addCheckbox, NATURE_LABELS } from './ui-helpers';
import { render, renderTableOnly } from './main';

export function buildTeamPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'team-panel';

    const heading = document.createElement('h2');
    heading.textContent = 'Team';
    panel.appendChild(heading);

    // Team-wide modifiers
    const teamMods = document.createElement('div');
    teamMods.className = 'controls';

    const stageLabel = document.createElement('label');
    stageLabel.textContent = 'Stage: ';
    stageLabel.appendChild(buildStageSelect(teamStage, stage => {
        setTeamStage(stage);
        renderTableOnly();
    }));
    teamMods.appendChild(stageLabel);

    addCheckbox(teamMods, 'Paralysis', teamParalysis, v => { setTeamParalysis(v); renderTableOnly(); });
    addCheckbox(teamMods, 'Tailwind', teamTailwind, v => { setTeamTailwind(v); renderTableOnly(); });

    panel.appendChild(teamMods);

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
                setEditingSlot(editingSlot === i ? null : i);
                render();
            });
            slot.appendChild(nameSpan);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'team-slot-remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.addEventListener('click', () => {
                team[i] = null;
                if (editingSlot === i) setEditingSlot(null);
                render();
            });
            slot.appendChild(removeBtn);
        } else {
            const addBtn = document.createElement('button');
            addBtn.className = 'team-slot-add';
            addBtn.textContent = '+ Add';
            addBtn.addEventListener('click', () => {
                setEditingSlot(i);
                render();
            });
            slot.appendChild(addBtn);
        }

        slots.appendChild(slot);
    }
    panel.appendChild(slots);

    if (editingSlot !== null) {
        panel.appendChild(buildSlotEditor(editingSlot));
    }

    panel.appendChild(buildImportUI());

    return panel;
}

// --- Import ---

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
    setEditingSlot(null);
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

    function doImport(): void {
        const error = executeImport(textArea.value, importMainline);
        if (error) {
            errorMsg.textContent = error;
            return;
        }
        render();
    }

    importBtn.addEventListener('click', () => {
        if (!expanded) {
            expanded = true;
            textArea.style.display = '';
            importBtn.textContent = 'Import';
            return;
        }
        doImport();
    });

    textArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            doImport();
        }
    });

    section.appendChild(textArea);
    section.appendChild(errorMsg);

    return section;
}

// --- Slot Editor ---

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
                modifiers: createDefaultModifiers(),
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
        opt.textContent = NATURE_LABELS[n];
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
    stageLabel.appendChild(buildStageSelect(member.modifiers.stage, stage => {
        member.modifiers.stage = stage;
        renderTableOnly();
    }));
    editor.appendChild(stageLabel);

    // Checkboxes
    addCheckbox(editor, 'Paralysis', current.modifiers.paralysis, v => { current.modifiers.paralysis = v; renderTableOnly(); });
    addCheckbox(editor, 'Choice Scarf', current.modifiers.choiceScarf, v => { current.modifiers.choiceScarf = v; renderTableOnly(); });
    addCheckbox(editor, 'Tailwind', current.modifiers.tailwind, v => { current.modifiers.tailwind = v; renderTableOnly(); });

    // Ability
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
