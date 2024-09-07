import { drawTable } from "./lib/dom";
import { RegulationH } from "./lib/regulation_h";
import { allRegulationFactory, effectiveSpeed, Monster } from "./lib/data";

document.getElementById("top100").onclick = redraw
document.getElementById("choicescarf").onclick = redraw
document.getElementById("ironball").onclick = redraw
document.getElementById("tailwind").onclick = redraw
document.getElementById("ability").onclick = redraw
document.getElementById("ascending").onclick = redraw

function redraw(e: MouseEvent) {
    updateTable()
}

function updateTable() {
    let regulation = RegulationH

    let filter = {
        includeTop100: (document.getElementById("top100") as HTMLInputElement).checked,
        includeChoiceScarf: (document.getElementById("choicescarf") as HTMLInputElement).checked,
        includeIronBall: (document.getElementById("ironball") as HTMLInputElement).checked,
        includeTailwind: (document.getElementById("tailwind") as HTMLInputElement).checked,
        includeAbility: (document.getElementById("ability") as HTMLInputElement).checked,
        ascending: (document.getElementById("ascending") as HTMLInputElement).checked,
    }

    let monsters = allRegulationFactory(regulation, filter)
    monsters.sort((a: Monster, b: Monster) => {
        let cmp = effectiveSpeed(a) - effectiveSpeed(b)
        if (filter.ascending) {
            return cmp
        }
        return -cmp
    })
    drawTable(monsters)
    document.getElementById("ascending-text").innerText = (filter.ascending ? "Ascending" : "Descending")
}

updateTable()