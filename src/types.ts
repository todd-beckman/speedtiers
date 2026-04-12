export interface Pokemon {
  id: string;        // lowercase canonical name (e.g., "garchomp", "mega venusaur")
  name: string;      // display name (e.g., "Garchomp", "Mega Venusaur")
  spe: number;
  ability?: Ability | Ability[];
  baseSpecies?: string; // lowercase canonical of base form (e.g., "venusaur" for "mega venusaur")
}

export type Nature = 'hindering' | 'neutral' | 'beneficial';

export type SpeedStage = -6 | -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Ability =
  | 'none'
  | 'swift-swim'
  | 'sand-rush'
  | 'chlorophyll'
  | 'slush-rush'
  | 'unburden'
  | 'surge-surfer'
  | 'quick-feet';

export interface Modifiers {
  stage: SpeedStage;
  paralysis: boolean;
  choiceScarf: boolean;
  tailwind: boolean;
  ability: Ability;
}

export interface SpeedEntry {
  pokemon: Pokemon;
  stats: number;
  nature: Nature;
  speed: number;
  abilityActive: boolean;
}

export interface TeamMember {
  pokemon: Pokemon;
  stats: number;
  nature: Nature;
  modifiers: Modifiers;
  item: string;
}

export interface TeamEntry {
  member: TeamMember;
  speed: number;
}
