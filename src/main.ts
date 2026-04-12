import { showTeam, saveTeam } from './state';
import { loadTiers } from './usage';
import { buildGlobalControls, buildMainControls } from './controls';
import { buildTeamPanel } from './team-ui';
import { renderTable } from './table';

let tableContainer: HTMLElement;
let teamPanelContainer: HTMLElement;

export function renderTableOnly(): void {
    saveTeam();
    tableContainer.replaceChildren(renderTable());
    if (showTeam) {
        teamPanelContainer.replaceChildren(buildTeamPanel());
    }
}

export function render(): void {
    saveTeam();
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
