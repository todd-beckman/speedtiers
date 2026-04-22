import { Nature, Modifiers, SpeedStage, Ability } from './types';

const NATURE_MULTIPLIER: Record<Nature, number> = {
    hindering: 0.9,
    neutral: 1.0,
    beneficial: 1.1,
};

const STAGE_NUMERATOR: Record<SpeedStage, number> = {
    6: 8, 5: 7, 4: 6, 3: 5, 2: 4, 1: 3, 0: 2,
    '-1': 2, '-2': 2, '-3': 2, '-4': 2, '-5': 2, '-6': 2,
} as Record<SpeedStage, number>;

const STAGE_DENOMINATOR: Record<SpeedStage, number> = {
    6: 2, 5: 2, 4: 2, 3: 2, 2: 2, 1: 2, 0: 2,
    '-1': 3, '-2': 4, '-3': 5, '-4': 6, '-5': 7, '-6': 8,
} as Record<SpeedStage, number>;

function getAbilityMultiplier(ability: Ability): number {
    switch (ability) {
        case 'swift-swim':
        case 'sand-rush':
        case 'chlorophyll':
        case 'slush-rush':
        case 'unburden':
        case 'surge-surfer':
            return 2;
        case 'quick-feet':
            return 1.5;
        case 'none':
            return 1;
    }
}

export function calculateSpeed(
    spe: number,
    stats: number,
    nature: Nature,
    modifiers: Modifiers,
): number {
    const base = Math.floor((spe + stats + 20) * NATURE_MULTIPLIER[nature]);

    let speed = base;

    speed = Math.floor(speed * STAGE_NUMERATOR[modifiers.stage] / STAGE_DENOMINATOR[modifiers.stage]);

    if (modifiers.paralysis) speed = Math.floor(speed * 0.5);
    if (modifiers.choiceScarf) speed = Math.floor(speed * 1.5);
    if (modifiers.tailwind) speed = Math.floor(speed * 2);

    speed = Math.floor(speed * getAbilityMultiplier(modifiers.ability));

    return speed;
}
