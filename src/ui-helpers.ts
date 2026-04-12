import { Nature, SpeedStage } from './types';

export const NATURE_LABELS: Record<Nature, string> = {
    beneficial: 'Beneficial (+)',
    neutral: 'Neutral',
    hindering: 'Hindering (-)',
};

export function buildStageSelect(currentStage: SpeedStage, onChange: (stage: SpeedStage) => void): HTMLSelectElement {
    const select = document.createElement('select');
    for (let i = 6; i >= -6; i--) {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = i > 0 ? `+${i}` : String(i);
        if (i === currentStage) opt.selected = true;
        select.appendChild(opt);
    }
    select.addEventListener('change', () => {
        onChange(Number(select.value) as SpeedStage);
    });
    return select;
}

export function addCheckbox(
    container: HTMLElement,
    label: string,
    checked: boolean,
    onChange: (v: boolean) => void,
): void {
    const wrapper = document.createElement('label');
    wrapper.className = 'control-checkbox';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.addEventListener('change', () => onChange(input.checked));
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(` ${label}`));
    container.appendChild(wrapper);
}
