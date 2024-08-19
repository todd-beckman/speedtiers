import { drawTable } from "./lib/dom";
import { RegulationH } from "./lib/regulation_h";
import { allRegulationFactory } from "./lib/data";

document.getElementById("config").onsubmit = submit

function submit(e: SubmitEvent) {
    e.preventDefault()
    updateTable()
}


function updateTable() {
    let regulation = RegulationH

    let filter = {
        includeChoiceScarf: (document.getElementById("choicescarf") as HTMLInputElement).checked,
        includeIronBall: (document.getElementById("choicescarf") as HTMLInputElement).checked,
        includeTailwind: (document.getElementById("tailwind") as HTMLInputElement).checked,
        includeAbility: (document.getElementById("ability") as HTMLInputElement).checked,
    }

    let monsters = allRegulationFactory(regulation, filter)
    drawTable(monsters)
}

updateTable()