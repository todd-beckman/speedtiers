import { saveTeam } from './state';
import { loadTiers } from './usage';
import { buildGlobalControls, buildMainControls } from './controls';
import { buildTeamPanel } from './team-ui';
import { renderTable } from './table';

let tableContainer: HTMLElement;
let teamPanelContainer: HTMLElement;
let mainControlsContainer: HTMLElement;

export function renderTableOnly(): void {
    saveTeam();
    tableContainer.replaceChildren(renderTable());
    teamPanelContainer.replaceChildren(buildTeamPanel());
}

export function renderAll(): void {
    saveTeam();
    tableContainer.replaceChildren(renderTable());
    teamPanelContainer.replaceChildren(buildTeamPanel());
    mainControlsContainer.replaceChildren(buildGlobalControls(), buildMainControls());
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

    // Split panel: team on left, main controls on right
    const splitPanel = document.createElement('div');
    splitPanel.className = 'split-panel';

    teamPanelContainer = document.createElement('div');
    teamPanelContainer.className = 'split-left';
    teamPanelContainer.appendChild(buildTeamPanel());
    splitPanel.appendChild(teamPanelContainer);

    mainControlsContainer = document.createElement('div');
    mainControlsContainer.className = 'split-right';
    mainControlsContainer.appendChild(buildGlobalControls());
    mainControlsContainer.appendChild(buildMainControls());
    splitPanel.appendChild(mainControlsContainer);

    app.appendChild(splitPanel);

    tableContainer = document.createElement('div');
    tableContainer.appendChild(renderTable());
    app.appendChild(tableContainer);
}

loadTiers().then(() => render());
