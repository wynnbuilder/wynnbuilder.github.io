document.getElementById('spell-cycle').addEventListener('input', () => build_disp_node.mark_dirty().update());
document.getElementById('cps-count').addEventListener('input', () => build_disp_node.mark_dirty().update());
document.getElementById('mana-steal-check').addEventListener('change', () => build_disp_node.mark_dirty().update());

function getCycle() {
    const spellCycleStr = document.getElementById('spell-cycle').value;
    let cycle = [];
    for (let i = 0; i < spellCycleStr.length; i++) {
        const spellIndex = parseInt(spellCycleStr.charAt(i));
        const spell = atree_collect_spells.value.get(spellIndex);
        if (spell) {
            cycle.push(spellIndex);
        }
    }
    return cycle;
}

function manaInputChanged(build, stats) {
    const cycle = getCycle();

    let hasDifferentSpells = false;
    for (let i = 0; i < cycle.length; i++) {
        for (let j = 0; j < cycle.length; j++) {
            if (cycle[i] !== cycle[j]) {
                hasDifferentSpells = true;
                break;
            }
        }
        if (hasDifferentSpells) break;
    }

    if (hasDifferentSpells) {
        calculateMana(cycle, build, stats);
    } else {
        document.getElementById('mana-used').textContent = '-';
        document.getElementById('mana-gained').textContent = '-';
        document.getElementById('net-mana').textContent = '-';
        document.getElementById('net-mana').style.color = '';
    }
}

function calculateMana(cycle, build, stats) {
    const includeManaSteal = document.getElementById('mana-steal-check').checked;
    let cps = parseFloat(document.getElementById('cps-count').value);
    if (Number.isNaN(cps)) {cps = 9;}
    const mr = stats.get("mr") ?? 0;
    const ms = stats.get("ms") ?? 0;
    const manaGained = 5 + mr / 5.0 + (includeManaSteal ? ms / 3 : 0);
    // I don't like this either, maybe find a different way to handle transcendence & paradox?
    let manaMult = 1;
    for (const [k, v] of stats.get("manaMult").entries()) {
        manaMult *= 1+v/100;
    }

    for (let i = 0; i < cycle.length; i++) {
        const spell = atree_collect_spells.value.get(cycle[i]);
        if (!spell) {
            continue;
        }
        const spell_cost = getSpellCost(stats, spell, false)/manaMult;
        const mana_gain = spell.mana_gained ?? 0;
        cycle[i] = [spell_cost, mana_gain, cycle[i]];
    }

    while (cycle[0][2] === cycle[cycle.length - 1][2]) {
        cycle.unshift(cycle.pop());
    }

    // jank way to detect generalist
    if (stats.get("activateGeneralist")) {
        const recentSpells = new Set();
        let lastSeen = null;

        for (let pass = 0; pass < 2; pass++) {
            for (let i = 0; i < cycle.length; i++) {
                const spellId = cycle[i][2];
                if (spellId !== lastSeen) {
                    recentSpells.add(spellId);
                    lastSeen = spellId;
                }
                if (recentSpells.size >= 3) {
                    // This cast is procc'd
                    if (pass === 1) {
                        cycle[i][0] = 1;
                    }
                    recentSpells.clear();
                    lastSeen = null;
                }
            }
        }
    }

    let cycle_cost = [];
    for (let i = 0; i < 2; i++) {
        const cost = Math.max(cycle[i][0], 1) - cycle[i][1];
        cycle_cost.push(cost < 0 ? cost : cost <= 1 ? 1 : cost);
    }

    // +5 per consecutive repeat
    let repeat = 0;
    for (let i = 2; i < cycle.length; i++) {
        if (cycle[i - 1][2] === cycle[i - 2][2]) {
            repeat++;
            const penalized = Math.max(cycle[i][0] + repeat * 5, 1) - cycle[i][1];
            cycle_cost.push(penalized);
        } else {
            repeat = 0;
            const cost = Math.max(cycle[i][0], 1) - cycle[i][1];
            cycle_cost.push(cost);
        }
    }

    // Wrap-around penalty
    if (cycle[cycle.length - 1][2] === cycle[cycle.length - 2][2]) {
        repeat++;
        cycle_cost[0] += Math.max(repeat * 5 + Math.min(cycle[0][0], 0), 0);
    }
    
    const manaUsed = cps * cycle_cost.reduce((acc, val) => acc + val, 0) / cycle_cost.length / 3;
    const netMana = manaGained - manaUsed;
    const bpactUsage = manaUsed - Math.max(manaGained, 0);
    document.getElementById('mana-used').textContent = manaUsed.toFixed(2);
    document.getElementById('mana-gained').textContent = manaGained.toFixed(2);
    const netEl = document.getElementById('net-mana');
    netEl.textContent = netMana.toFixed(2);
    netEl.style.color = netMana >= 0 ? '#4caf50' : '#f44336';
    const parent_div = netEl.parentElement.parentElement;

    for (let elem of parent_div.children) {
        if (elem.classList.contains('other-resource')) {
            elem.remove();
        }
    }

    if (bpactUsage > 0 && stats.get("bloodPactCost")) {
        const healthDrain = stats.get("bloodPactCost")/100 * bpactUsage;
        const bpactLabel = make_elem("span", ['other-resource'], { textContent: "Blood Pact/s: " });
        const bpactDrain = make_elem("span", ['Health'], { textContent: healthDrain.toFixed(2) + "%" });
        const bpactDuration = make_elem("span", [], { textContent: " | " +(100/healthDrain).toFixed(2) + "s" });
        bpactLabel.appendChild(bpactDrain);
        bpactLabel.appendChild(bpactDuration);
        parent_div.appendChild(bpactLabel)
    }
}