import { currentModifiers, sortDescending, showTeam, hiddenPokemon } from './state';
import {
    generateEntries, filterEntries, generateTeamEntries,
    buildSpeedRows, groupEntriesByPokemon,
    formatEntry, formatTeamEntry, natureClass,
} from './entries';
import { render } from './main';

export function renderTable(): HTMLElement {
    const allEntries = generateEntries(currentModifiers);
    const mainEntries = filterEntries(allEntries);
    const teamEntries = showTeam ? generateTeamEntries() : [];
    const rows = buildSpeedRows(mainEntries, teamEntries);
    rows.sort((a, b) => sortDescending ? b.speed - a.speed : a.speed - b.speed);

    const table = document.createElement('table');
    table.className = 'speed-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    if (showTeam) {
        const thTeam = document.createElement('th');
        thTeam.textContent = 'Team';
        headerRow.appendChild(thTeam);
    }

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

        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
}
