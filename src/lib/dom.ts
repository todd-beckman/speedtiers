import { Ability, Item, Field, Monster, effectiveSpeed } from "./data"

let table: HTMLTableElement
let headerRow: HTMLTableRowElement
const cols = ["Name", "Speed", "Stats", "IV", "Modifier"]


export function drawTable(monsters: Array<Monster>) {
    let e = document.getElementById("table")
    if (table != null) {
        e.removeChild(table)
        table = null
    }
    table = document.createElement("table") as HTMLTableElement
    table.className = "table__table"

    drawHeaderRow(table)
    drawMonsterRows(table, monsters)
    e.appendChild(table)
}

function drawHeaderRow(table: HTMLTableElement) {
    if (headerRow == null) {
        headerRow = document.createElement("tr") as HTMLTableRowElement
        headerRow.className = "table__header-row table__row"

        cols.forEach((col) => {
            let td = document.createElement("td")
            td.className = "table__header-cell"
            td.innerText = col
            headerRow.appendChild(td)
        })
    }

    table.appendChild(headerRow)
}

function drawMonsterRows(table: HTMLTableElement, monsters: Array<Monster>) {
    monsters.forEach(monster => {
        table.appendChild(monster.tableRow)
    })
}

interface ModifierEntry {
    name: string
    className: string
}

function drawModifiers(tr: HTMLTableRowElement, monster: Monster) {
    let td = document.createElement("td") as HTMLTableCellElement
    td.className = "table__cell table__modifiers"

    let modifiers = new Array<ModifierEntry>()
    if (monster.speedStage < 0) {
        modifiers.push({
            name: "" + monster.speedStage,
            className: "table__modifier-speed-down",
        })
    } else if (monster.speedStage > 0) {
        modifiers.push({
            name: "+" + monster.speedStage,
            className: "table__modifier-speed-up",
        })
    }
    if (monster.ability != Ability.None) {
        modifiers.push({
            name: monster.ability.name,
            className: "table__modifier-ability",
        })
    }
    if (monster.item != Item.None) {
        modifiers.push({
            name: monster.item.name,
            className: "table__modifier-item",
        })
    }
    if (monster.field != Field.None) {
        modifiers.push({
            name: monster.field.name,
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