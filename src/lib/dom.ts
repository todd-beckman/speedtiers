import { Ability, Item, Field, Monster, effectiveSpeed } from "./data"

let table: HTMLTableElement
let headerRow: HTMLTableRowElement
const cols = ["Speed", "Name", "Stats", "IV", "Modifier"]


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
