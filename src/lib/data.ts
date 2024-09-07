import { REGULATION_H } from "./regulation_h"

// may as well extract this ahead of time
const level = 50
const maxIV = 31
const maxEV = 252

/**
 * PokedexEntry describes specific pokemon's innate properties.
 */
export interface PokedexEntry {
    id: number
    name: string
    speed: number
    abilities?: Array<string>
}

/**
 * Describes all Species that are legal in a format.
 * 
 * Each legal form of a species has its own entry, even if they are functionally the same.
 */
export interface Regulation {
    entries: Array<PokedexEntry>
}

interface ModifierEntry {
    name: string
    className: string
}

export class Nature {
    readonly name: string
    readonly speedModifier: number
    constructor(name: string, speedModifier: number) {
        this.name = name
        this.speedModifier = speedModifier
    }

    static readonly Neutral = new Nature("", 1.0)
    static readonly Beneficial = new Nature("+", 1.1)
    static readonly Detrimental = new Nature("-", 0.9)
}

export class Item {
    readonly name: string
    readonly speedModifier: number
    constructor(name: string, speedModifier: number) {
        this.name = name
        this.speedModifier = speedModifier
    }
    static readonly None = new Item("", 1.0)
    static readonly ChoiceScarf = new Item("Choice Scarf", 1.5)
    static readonly IronBall = new Item("Iron Ball", 0.5)
}

export class Field {
    readonly name: string
    readonly speedModifier: number
    constructor(name: string, speedModifier: number) {
        this.name = name
        this.speedModifier = speedModifier
    }
    static readonly None = new Field("", 1.0)
    static readonly Tailwind = new Field("Tailwind", 2.0)
}


/**
 * Ability modifiers assuming the required condition is met.
 * 
 * If the condition is not met, use None.
 */
export class Ability {
    readonly name: string
    readonly speedModifier: number
    constructor(name: string, speedModifier: number) {
        this.name = name
        this.speedModifier = speedModifier
    }

    static readonly None = new Ability("", 1.0)
    static readonly Chlorophyll = new Ability("Chlorophyll", 2.0)
    static readonly SurgeSurfer = new Ability("Surge Surfer", 2.0)
    static readonly SandRush = new Ability("Sand Rush", 2.0)
    static readonly SlushRush = new Ability("Slush Rush", 2.0)
    static readonly SwiftSwim = new Ability("Swift Swim", 2.0)
    static readonly Unburden = new Ability("Unburden", 2.0)
    static readonly Protosynthesis = new Ability("Protosynthesis", 1.5)
    static readonly QuarkDrive = new Ability("Quark Drive", 1.5)
    static readonly OrichalcumPulse = new Ability("Orichalcum Pulse", 1.5)
    static readonly HadronEngine = new Ability("Hadron Engine", 1.5)

    static from(ability: string): Ability {
        switch (ability) {
            case "None": return this.None
            case "Chlorophyll": return this.Chlorophyll
            case "Surge Surfer": return this.SurgeSurfer
            case "Sand Rush": return this.SandRush
            case "Slush Rush": return this.SlushRush
            case "Swift Swim": return this.SwiftSwim
            case "Unburden": return this.Unburden
            case "Protosynthesis": return this.Protosynthesis
            case "Quark Drive": return this.QuarkDrive
            case "Orichalcum Pulse": return this.OrichalcumPulse
            case "Hadron Engine": return this.HadronEngine
        }
    }
}

/**
 * A Monster is an instance of a Species with volatile modifiers available.
 */
export class Monster {
    readonly regulation: string
    readonly entry: PokedexEntry
    readonly speedEV: number
    readonly speedIV: number
    readonly nature: Nature
    readonly item: Item
    readonly ability: Ability
    readonly field: Field
    readonly speedStage: number
    readonly hashID: string
    readonly tableRow: HTMLTableRowElement

    constructor(
        regulation: string,
        entry: PokedexEntry,
        speedEV: number = 0,
        speedIV: number = 0,
        nature: Nature = Nature.Neutral,
        field: Field = Field.None,
        item: Item = Item.None,
        ability: Ability = Ability.None,
        speedStage: number = 0,
    ) {
        this.regulation = regulation
        this.entry = entry
        this.speedEV = speedEV
        this.speedIV = speedIV
        this.speedStage = speedStage
        this.nature = nature
        this.field = field
        this.item = item
        this.ability = ability
        this.hashID = this.generateHashID
        this.tableRow = this.drawMonsterRow()
    }

    private get generateHashID(): string {
        return JSON.stringify({
            regulation: this.regulation,
            mon: this.entry.name,
            speed: this.speedEV,
            speedStage: this.speedStage,
            nature: this.nature,
            field: this.field,
            item: this.item,
            ability: this.ability,
        })
    }

    private drawMonsterRow(): HTMLTableRowElement {
        let tr = document.createElement("tr") as HTMLTableRowElement
        tr.className = "table__row"
        this.drawName(tr)
        this.drawSpeed(tr)
        this.drawStats(tr)
        this.drawIVs(tr)
        this.drawModifiers(tr)
        return tr
    }

    private drawName(tr: HTMLTableRowElement) {
        let cell = document.createElement("td") as HTMLTableCellElement
        cell.className = "table__cell table__name"
        cell.innerText = this.entry.name
        tr.appendChild(cell)
    }

    private drawSpeed(tr: HTMLTableRowElement) {
        let cell = document.createElement("td") as HTMLTableCellElement
        cell.className = "table__cell table__speed"
        cell.innerText = "" + effectiveSpeed(this)
        tr.appendChild(cell)
    }

    private drawStats(tr: HTMLTableRowElement) {
        let cell = document.createElement("td") as HTMLTableCellElement
        cell.className = "table__cell table__stats"
        cell.innerText = "" + this.speedEV + this.nature.name

        tr.appendChild(cell)
    }

    private drawIVs(tr: HTMLTableRowElement) {
        let cell = document.createElement("td") as HTMLTableCellElement
        cell.className = "table__cell table__ivs"
        cell.innerText = "" + this.speedIV
        tr.appendChild(cell)
    }

    private drawModifiers(tr: HTMLTableRowElement) {
        let td = document.createElement("td") as HTMLTableCellElement
        td.className = "table__cell table__modifiers"

        let modifiers = new Array<ModifierEntry>()
        if (this.speedStage < 0) {
            modifiers.push({
                name: "" + this.speedStage,
                className: "table__modifier-speed-down",
            })
        } else if (this.speedStage > 0) {
            modifiers.push({
                name: "+" + this.speedStage,
                className: "table__modifier-speed-up",
            })
        }
        if (this.ability != Ability.None) {
            modifiers.push({
                name: this.ability.name,
                className: "table__modifier-ability",
            })
        }
        if (this.item != Item.None) {
            modifiers.push({
                name: this.item.name,
                className: "table__modifier-item",
            })
        }
        if (this.field != Field.None) {
            modifiers.push({
                name: this.field.name,
                className: "table__modifier-field",
            })
        }

        modifiers.forEach(modifier => {
            let span = document.createElement("span") as HTMLSpanElement
            span.className = "table__cell__modifier " + modifier.className
            span.innerText = modifier.name
            td.appendChild(span)
        })

        tr.appendChild(td)
    }

}


const stages = [
    2 / 8, 2 / 7, 2 / 6, 2 / 5, 2 / 4, 2 / 3,
    2 / 2,
    3 / 2, 4 / 2, 5 / 2, 6 / 2, 7 / 2, 8 / 2,
]
function speedStageModifier(stage: number): number {
    return stages[stage + 6]
}

/**
 * Calculates the speed of a monster with all modifiers applied.
 * 
 * There is no assumption that modifiers are within acceptable bounds.
 */
export function effectiveSpeed(monster: Monster): number {
    return Math.floor(((2 * monster.entry.speed + monster.speedIV + monster.speedEV / 4) * level / 100 + 5) * monster.nature.speedModifier)
        * monster.item.speedModifier
        * monster.ability.speedModifier
        * monster.field.speedModifier
        * speedStageModifier(monster.speedStage)
}

export function defaultMonsterFactory(entry: PokedexEntry, filter: Filter): Array<Monster> {
    let monsters = new Array<Monster>()

    if (filter.includeIronBall) {
        monsters.push(new Monster(REGULATION_H, entry, 0, 0, Nature.Detrimental, Field.None, Item.IronBall))
    }
    monsters.push(new Monster(REGULATION_H, entry, 0, 0, Nature.Detrimental))
    monsters.push(new Monster(REGULATION_H, entry, 0, 0))
    monsters.push(new Monster(REGULATION_H, entry, 0, maxIV))
    monsters.push(new Monster(REGULATION_H, entry, 0, maxIV, Nature.Beneficial))
    monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV))
    monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial))
    if (filter.includeTailwind) {
        monsters.push(new Monster(REGULATION_H, entry, 0, maxIV, Nature.Beneficial, Field.Tailwind))
        monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Neutral, Field.Tailwind))
        monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.Tailwind))
        if (filter.includeChoiceScarf) {
            monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Neutral, Field.Tailwind, Item.ChoiceScarf))
            monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.Tailwind, Item.ChoiceScarf))
        }
    }
    if (filter.includeChoiceScarf) {
        monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Neutral, Field.None, Item.ChoiceScarf))
        monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.None, Item.ChoiceScarf))
    }

    if (entry.abilities != null && filter.includeAbility) {
        entry.abilities.forEach(ability => {
            let gotAbility = Ability.from(ability)
            monsters.push(new Monster(REGULATION_H, entry, 0, 0, Nature.Detrimental, Field.None, Item.None, gotAbility))
            monsters.push(new Monster(REGULATION_H, entry, 0, 0, Nature.Neutral, Field.None, Item.None, gotAbility))
            monsters.push(new Monster(REGULATION_H, entry, 0, 0, Nature.Beneficial, Field.None, Item.None, gotAbility))
            monsters.push(new Monster(REGULATION_H, entry, 0, maxIV, Nature.Neutral, Field.None, Item.None, gotAbility))
            monsters.push(new Monster(REGULATION_H, entry, 0, maxIV, Nature.Beneficial, Field.None, Item.None, gotAbility))
            monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Neutral, Field.None, Item.None, gotAbility))
            monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.None, Item.None, gotAbility))
            if (filter.includeTailwind) {
                monsters.push(new Monster(REGULATION_H, entry, 0, maxIV, Nature.Beneficial, Field.Tailwind, Item.None, gotAbility))
                monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Neutral, Field.Tailwind, Item.None, gotAbility))
                monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.Tailwind, Item.None, gotAbility))
            }
            if (gotAbility != Ability.Unburden) {
                if (filter.includeIronBall) {
                    monsters.push(new Monster(REGULATION_H, entry, 0, 0, Nature.Detrimental, Field.None, Item.IronBall, gotAbility))
                }
                if (filter.includeTailwind) {
                    monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.Tailwind, Item.None, gotAbility))
                    if (filter.includeChoiceScarf) {
                        monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Beneficial, Field.Tailwind, Item.ChoiceScarf, gotAbility))
                    }
                }
                if (filter.includeChoiceScarf) {
                    monsters.push(new Monster(REGULATION_H, entry, maxEV, maxIV, Nature.Neutral, Field.None, Item.ChoiceScarf, gotAbility))
                }
            }
        })
    }
    return monsters
}

export interface Filter {
    includeChoiceScarf: boolean
    includeIronBall: boolean
    includeTailwind: boolean
    includeAbility: boolean
}


export function allRegulationFactory(regulation: Regulation, filter: Filter): Array<Monster> {
    let allMonsters = new Array<Monster>()

    regulation.entries.forEach(entry => {
        //todo this is slow, figure out why concat wasn't working
        let monsters = defaultMonsterFactory(entry, filter)
        monsters.forEach(monster => allMonsters.push(monster))
    })

    allMonsters.sort((a: Monster, b: Monster) => {
        // sort descending
        return effectiveSpeed(b) - effectiveSpeed(a)
    })
    return allMonsters
}

