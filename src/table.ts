import { currentModifiers, sortDescending, hiddenPokemon } from './state';
import {
    generateEntries, filterEntries, generateTeamEntries,
    buildSpeedRows, groupEntriesByPokemon,
    formatEntry, formatTeamEntry, natureClass,
} from './entries';
import { createSprite } from './ui-helpers';
import { render } from './main';

export function renderTable(): HTMLElement {
    const allEntries = generateEntries(currentModifiers);
    const mainEntries = filterEntries(allEntries);
    const teamEntries = generateTeamEntries();
    const rows = buildSpeedRows(mainEntries, teamEntries);
    rows.sort((a, b) => sortDescending ? b.speed - a.speed : a.speed - b.speed);

    const table = document.createElement('table');
    table.className = 'speed-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const thTeam = document.createElement('th');
    thTeam.textContent = 'Team';
    headerRow.appendChild(thTeam);

    const thSpeed = document.createElement('th');
    thSpeed.textContent = 'Speed';
    headerRow.appendChild(thSpeed);

    const thPokemon = document.createElement('th');
    thPokemon.textContent = 'Pokemon';
    headerRow.appendChild(thPokemon);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of rows) {
        const tr = document.createElement('tr');

        // Team column
        const tdTeam = document.createElement('td');
        tdTeam.className = 'team-cell';
        for (const te of row.teamEntries) {
            const span = document.createElement('span');
            span.className = `pokemon-entry ${natureClass(te.member.nature)}`;
            const sprite = createSprite(te.member.pokemon);
            if (sprite) span.appendChild(sprite);
            span.appendChild(document.createTextNode(formatTeamEntry(te)));
            tdTeam.appendChild(span);
        }
        tr.appendChild(tdTeam);

        // Speed column
        const tdSpeed = document.createElement('td');
        tdSpeed.className = 'speed-cell';
        tdSpeed.textContent = String(row.speed);
        tr.appendChild(tdSpeed);

        // Main column
        const tdPokemon = document.createElement('td');
        tdPokemon.className = 'pokemon-cell';
        const pokemonGroups = groupEntriesByPokemon(row.mainEntries);
        for (const group of pokemonGroups) {
            for (let i = 0; i < group.entries.length; i++) {
                const entry = group.entries[i];
                const span = document.createElement('span');
                span.className = `pokemon-entry ${natureClass(entry.nature)}`;
                if (i === 0) {
                    const sprite = createSprite(entry.pokemon);
                    if (sprite) span.appendChild(sprite);
                }
                span.appendChild(document.createTextNode(formatEntry(entry)));
                if (i === group.entries.length - 1) {
                    const hideBtn = document.createElement('button');
                    hideBtn.className = 'hide-btn';
                    hideBtn.textContent = '\u00d7';
                    hideBtn.title = `Hide ${group.hideName}`;
                    hideBtn.addEventListener('click', () => {
                        hiddenPokemon.add(group.hideName);
                        render();
                    });
                    span.appendChild(hideBtn);
                }
                tdPokemon.appendChild(span);
            }
            tdPokemon.appendChild(document.createTextNode(' '));
        }
        tr.appendChild(tdPokemon);

        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
}
