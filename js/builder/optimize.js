function optimizeStrDex() {
    if (!player_build) {
        return;
    }
    const skillpoints = skp_inputs.map(x => x.value);   // JANK
    let total_assigned = 0;
    const min_assigned = player_build.base_skillpoints;
    const base_totals = player_build.total_skillpoints;
    let base_skillpoints = [];
    for (let i in skp_order){ //big bren
        const assigned = skillpoints[i] - base_totals[i] + min_assigned[i]
        base_skillpoints.push(assigned);
        total_assigned += assigned;
    }

    const remaining = levelToSkillPoints(player_build.level) - total_assigned;
    const max_str_boost = 100 - base_skillpoints[0];
    const max_dex_boost = 100 - base_skillpoints[1];
    if (Math.min(remaining, max_str_boost, max_dex_boost) < 0) return; // Unwearable

    let str_bonus = remaining;
    let dex_bonus = 0;
    let best_skillpoints = skillpoints;
    let best_damage = 0;
    for (let i = 0; i <= remaining; ++i) {
        let total_skillpoints = skillpoints.slice();
        total_skillpoints[0] = Math.min(total_skillpoints[0] + Math.min(max_str_boost, str_bonus), 150);
        total_skillpoints[1] = Math.min(total_skillpoints[1] + Math.min(max_dex_boost, dex_bonus), 150);

        const stats = player_build.statMap;
        stats.set('str', total_skillpoints[0]);
        stats.set('dex', total_skillpoints[1]);
        let critChance = skillPointsToPercentage(total_skillpoints[1]);

        // 100% neutral calc
        let _results = calculateSpellDamage(stats, player_build.weapon.statMap, [100, 0, 0, 0, 0, 0], true);
        let totalDamNormal = _results[0];
        let totalDamCrit = _results[1];
        let results = _results[2];
        
        for (let i = 0; i < 6; ++i) {
            for (let j in results[i]) {
                results[i][j] = results[i][j].toFixed(2);
            }
        }
        let nonCritAverage = (totalDamNormal[0]+totalDamNormal[1])/2 || 0;
        let critAverage = (totalDamCrit[0]+totalDamCrit[1])/2 || 0;
        let averageDamage = (1-critChance)*nonCritAverage+critChance*critAverage || 0;

        if (averageDamage > best_damage) {
            best_damage = averageDamage;
            best_skillpoints = total_skillpoints.slice();
        }

        str_bonus -= 1;
        dex_bonus += 1;
    }

    // TODO do not merge for performance reasons
    for (let i in skp_order) {
        skp_inputs[i].input_field.value = best_skillpoints[i];
        skp_inputs[i].mark_dirty();
    }
    for (let i in skp_order) {
        skp_inputs[i].update();
    }
}

