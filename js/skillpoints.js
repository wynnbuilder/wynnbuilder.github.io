/**
 * Apply skillpoint bonuses from an item.
 * Also applies set deltas.
 * Modifies the skillpoints array.
 */
function apply_skillpoints(skillpoints, item, set_counts) {
    for (let i = 0; i < 5; i++) {
        skillpoints[i] += item.skillpoints[i];
    }

    const setName = item.set;
    if (setName) { // undefined/null means no set.
        let setCount = set_counts.get(setName);
        let old_bonus = {};
        if (setCount) {
            old_bonus = sets.get(setName).bonuses[setCount-1];
            set_counts.set(setName, setCount + 1);
        }
        else {
            setCount = 0;
            set_counts.set(setName, 1);
        }
        const new_bonus = sets.get(setName).bonuses[setCount];
        //let skp_order = ["str","dex","int","def","agi"];
        for (const i in skp_order) {
            const delta = (new_bonus[skp_order[i]] || 0) - (old_bonus[skp_order[i]] || 0);
            skillpoints[i] += delta;
        }
    }
}

function vadd5(a, b) {
    let res = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; ++i) {
        res[i] = a[i] + b[i];
    }
    return res;
}

function can_equip(skillpoints, item) {
    for (let i = 0; i < 5; i++) {
        if (item.reqs[i] == 0) continue;
        if (item.reqs[i] > skillpoints[i]) { return false; }
    }
    return true;
}

// TODO: what about set bonuses?
function fix_should_pop(skillpoints, item) {
    let applied = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; ++i) {
        if (item.reqs[i] == 0) continue;
        const req = item.reqs[i] + item.skillpoints[i];
        const cur = skillpoints[i];
        if (req > cur) {
            const diff = req - cur;
            applied[i] += diff;
            skillpoints[i] += diff;
        }
    }
    return applied;
}

function check_under_100(skillpoints) {
    for (let i = 0; i < 5; ++i) {
        if (skillpoints[i] > 100) {
            return false;
        }
    }
    return true;
}


/**
 * Apply skillpoints until this item can be worn.
 * Also applies set deltas.
 * Modifies the skillpoints array.
 * Also return an array of deltas, to modify the base applied skillpoints.
 */
function apply_to_fit(skillpoints, item) {
    let applied = [0, 0, 0, 0, 0];
    for (let i = 0; i < 5; i++) {
        if (item.reqs[i] == 0) continue;
        const req = item.reqs[i];
        const cur = skillpoints[i];
        if (req > cur) {
            const diff = req - cur;
            applied[i] += diff;
            skillpoints[i] += diff;
        }
    }
    return applied;
}

function calculate_skillpoints(equipment, weapon) {
    const start = performance.now();
    // Calculate equipment equipping order and required skillpoints.
    // Return value: [equip_order, best_skillpoints, final_skillpoints, best_total];
    let crafted_items = [];
    weapon.skillpoints = weapon.get('skillpoints');
    weapon.reqs = weapon.get('reqs');
    weapon.set = weapon.get('set');
    for (const item of equipment) {
        item.skillpoints = item.get('skillpoints');
        item.reqs = item.get('reqs');
        item.set = item.get('set');
        if (item.get("crafted")) {
            crafted_items.push(item);
        }
    }

    // Precomputed itemwise strict parent relationships.
    // is_parent[a][b] records if b is a parent of a
    // parent means b is strictly before a, by skillpoint order
    let is_parent = [];
    for (let i = 0; i < equipment.length; ++i) {
        is_parent[i] = new Array(equipment.length).fill(false);
    }
    const [root, terminal, sccs] = construct_scc_graph(equipment);
    let responsibilities = [];
    for (const scc of sccs) {
        responsibilities.push(new Set([]));
    }
    // Loop looks scary but remember that all the graph sizes
    // are bounded by constant 9
    for (let i = sccs.length - 2; i > 0; --i) {
        const scc = sccs[i];
        let _aggregate = []
        for (const child_idx of responsibilities[i]) {
            for (const subnode of scc.nodes) {
                // equipment node index
                is_parent[child_idx][subnode.index] = true;
            }
        }
        for (const subnode of scc.nodes) {
            _aggregate.push(subnode.index);
        }
        const aggregate = new Set(_aggregate)
        for (const _parent of scc.parents) {
            // scc node index
            responsibilities[_parent.index] = responsibilities[_parent.index].union(aggregate);
        }
    }

    let best_order = equipment;
    let best_skillpoints = [0, 0, 0, 0, 0];
    let final_skillpoints = [0, 0, 0, 0, 0];
    let best_total = Infinity;
    // Track if we have found a solution that satisfies hard constraints.
    // Initializing to False allows a sequence of solutions to be found that do not
    //     satisfy it, but if any solution does satisfy it (even with higher total)
    //     then we will accept that one instead.
    // TODO: Do we want to handle guild tome bonuses? (best under 103/(102+102)/(101*5)?)
    // For now, nah. Let the user apply the guild tome if they really care about optimality
    // Though really the guild tome might be part of the optimization problem...
    let best_under_100 = false;
    let best_activeSetCounts = new Map();
    let items_tried = 0;
    let checks = 0
    let full_tried = 0;

    // "remains" list will be a list of integers (for indices)
    function recurse_check(_applied,        // List(5) of applied skill points
                           _skp_totals,     // List(5) of total skill points
                           _sets,           // Map(set_id, int) of set counts
                           _total_applied,  // Int of total applied skill points
                           skipped_states,  // Skill points at the point that
                                            //   the item was skipped
                           prior_skipped,   // Items that were skipped (in order)
                                            //   NOTE: this can grow up to n^2 long...
                           equipped_items,  // Previously equipped items, in order
                           remains_in_order // Items left to be equipped, in order
    ) {
        if (remains_in_order.length == 1) {
            items_tried += 1;
            full_tried += 1;
            // Put on last item and weapon
            const item = equipment[remains_in_order[0]];
            const skillpoints = _skp_totals.slice()

            const deltas1 = apply_to_fit(skillpoints, item);
            const sets = new Map(_sets);
            if (!item.get("crafted")) {
                apply_skillpoints(skillpoints, item, sets);
            }
            const deltas2 = apply_to_fit(skillpoints, weapon);
            let deltas = vadd5(deltas1, deltas2);

            // Check if items should pop. If so, fix them
            for (let i = 0; i < equipment.length; ++i) {
                const _delta = fix_should_pop(skillpoints, equipment[i]);
                deltas = vadd5(deltas, _delta);
            }
            // Check prior skipped to ensure no order breaks
            for (let j = 0; j < prior_skipped.length; ++j) {
                checks += 1;
                const sim_skillpoints = vadd5(skipped_states[j], deltas);
                if (can_equip(sim_skillpoints, equipment[prior_skipped[j]])) {
                    return;
                }
            }
            const applied = vadd5(_applied, deltas)
            const total_applied = _total_applied + deltas.reduce((a, b) => a+b, 0);

            // check end
            const soln_under_100 = check_under_100(applied);
            if (best_under_100 && !soln_under_100) {
                // Reject solution if the current best solution satisfies hard constraints.
                return;
            }
            console.log("Candidate:", equipped_items.concat([remains_in_order[0]]));
            console.log("Assigned:", applied, total_applied);
            if (_total_applied < best_total || (soln_under_100 && !best_under_100)) {
                for (const crafted of crafted_items) {
                    apply_skillpoints(skillpoints, crafted, sets);
                }
                apply_skillpoints(skillpoints, weapon, sets);

                final_skillpoints = skillpoints;
                best_skillpoints = applied;
                best_total = total_applied;
                best_activeSetCounts = sets;
                best_order = equipped_items.concat([remains_in_order[0]]).map((x) => equipment[x]);
                best_under_100 = soln_under_100;
            }
            return;
        }

        // Try each item in the remaining available items.
        try_item: for (let i = 0; i < remains_in_order.length; ++i) {
            items_tried += 1;
            const head = remains_in_order.slice(0, i);
            const skipped = prior_skipped.concat(head);

            // Apply the skillpoints, then perform another check to ensure order
            const skillpoints = _skp_totals.slice();
            const item = equipment[remains_in_order[i]];
            const deltas = apply_to_fit(skillpoints, item);
            // If this bonus skillpoint would have changed the order, reject
            const sim_states = [];    // Simultaneously updating simulated states
            check_skip1: for (let j = 0; j < prior_skipped.length; ++j) {
                checks += 1;
                const sim_skillpoints = vadd5(skipped_states[j], deltas);
                if (can_equip(sim_skillpoints, equipment[prior_skipped[j]])) {
                    continue try_item;
                }
                sim_states.push(sim_skillpoints);
            }
            check_skip2: for (let j = 0; j < head.length; ++j) {
                checks += 1;
                if (can_equip(skillpoints, equipment[head[j]])) {
                    continue try_item;
                }
                sim_states.push(skillpoints);
            }

            const mod_skillpoints = skillpoints.slice();
            // Don't apply crafted skillpoints now
            const sets = new Map(_sets);
            if (!item.get("crafted")) {
                apply_skillpoints(mod_skillpoints, item, sets);
            }
            const applied = vadd5(_applied, deltas);
            const total_applied = _total_applied + deltas.reduce((a, b) => a+b, 0);
            const tail = remains_in_order.slice(i+1, remains_in_order.length);
            const remains = tail.concat(head);
            
            recurse_check(applied, mod_skillpoints, sets,
                          total_applied, sim_states, skipped,
                          equipped_items.concat([remains_in_order[i]]), remains);
        }
    }

    recurse_check([0, 0, 0, 0, 0], [0, 0, 0, 0, 0], new Map(),
                  0, [], [], [], [0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const end = performance.now();
    console.log(end - start, "ms elapsed");
    console.log(items_tried, "item equips,", full_tried, "full builds evaluated", checks, "items checked for satisfaction");
    return [best_order, best_skillpoints, final_skillpoints, best_total, best_activeSetCounts];
}

function construct_scc_graph(items_to_consider) {
    let nodes = [];
    let terminal_node = {
        item: null,
        children: [],
        parents: nodes
    };
    let root_node = {
        item: null,
        children: nodes,
        parents: [],
    };
    for (let i = 0; i < items_to_consider.length; ++i) {
        const item = items_to_consider[i];
        const set_neg = [false, false, false, false, false];
        const set_pos = [false, false, false, false, false];
        const set_name = item.set;
        const reqless = item.get("reqs").every(x => x === 0);
        if (set_name) {
            const bonuses = sets.get(set_name).bonuses;
            for (const bonus of bonuses) {
                for (const i in skp_order) {
                    if (bonus[skp_order[i]] > 0) { set_pos[i] = true; }
                    if (bonus[skp_order[i]] < 0) { set_neg[i] = true; }
                }
            }
        }
        nodes.push({item: item, index: i, children: [terminal_node], parents: [root_node], set_pos: set_pos, set_neg: set_neg, reqless: reqless});
    }
    // Dependency graph construction.
    for (const node_a of nodes) {
        const {item: a, children: a_children, set_pos: a_set_pos} = node_a;
        try_nodes: for (const node_b of nodes) {
            const {item: b, parents: b_parents, set_neg: b_set_neg, reqless: b_reqless} = node_b;
            if (b_reqless) {
                // Reqless nodes never depend on others.
                continue;
            }

            for (let i = 0; i < 5; ++i) {
                if (b.reqs[i] < a.reqs[i]) {
                    continue try_nodes;
                }
            }
            // Every b requirement is greater than or equal to an a requirement
            a_children.push(node_b);
            b_parents.push(node_a);
        }
    }
    // see: js/utils.js
    const sccs = make_SCC_graph(root_node, nodes);
    return [root_node, terminal_node, sccs];
}

