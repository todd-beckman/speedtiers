import { Nature, SpeedStage, Pokemon } from './types';

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

const SPRITE_COLS = 13;
const SPRITE_CELL = 32; // display size in px

// Sprite rendering is temporarily disabled until a complete sprite sheet is
// available. Flip this back to true to re-enable; the rendering logic below is
// kept intact. See web/public/sprites.jpeg and Pokemon.spriteIndex.
const SPRITES_ENABLED = false;

export function createSprite(pokemon: Pokemon): HTMLSpanElement | null {
    if (!SPRITES_ENABLED) return null;
    if (pokemon.spriteIndex === undefined) return null;
    const col = (pokemon.spriteIndex % SPRITE_COLS) * 2; // *2 for pairs, take left
    const row = Math.floor(pokemon.spriteIndex / SPRITE_COLS);
    const span = document.createElement('span');
    span.className = 'pokemon-sprite';
    span.style.backgroundPosition = `-${col * SPRITE_CELL}px -${row * SPRITE_CELL}px`;
    return span;
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
