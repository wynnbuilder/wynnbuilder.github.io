/**
 * File containing utility functions relevant to the builder page, as well as the setup code (at the very bottom).
 */

let edit_id_field_counter = 0;
let edited_ids = []

function populateBuildList() {
    const buildList = document.getElementById("build-choice");
    const savedBuilds = window.localStorage.getItem("builds") === null ? {} : JSON.parse(window.localStorage.getItem("builds"));

    for (const buildName of Object.keys(savedBuilds).sort()) {
        const buildOption = document.createElement("option");
        buildOption.setAttribute("value", buildName);
        buildList.appendChild(buildOption);
    }
}

function saveBuild() {
    if (player_build) {
        const savedBuilds = window.localStorage.getItem("builds") === null ? {} : JSON.parse(window.localStorage.getItem("builds"));
        const saveName = document.getElementById("build-name").value;
        const encodedBuild = encodeBuildLegacy(player_build);
        if ((!Object.keys(savedBuilds).includes(saveName)
                || document.getElementById("saved-error").textContent !== "") && encodedBuild !== "") {
            savedBuilds[saveName] = encodedBuild.replace("#", "");
            window.localStorage.setItem("builds", JSON.stringify(savedBuilds));

            document.getElementById("saved-error").textContent = "";
            document.getElementById("saved-build").textContent = "Build saved locally";
            
            const buildList = document.getElementById("build-choice");
            const buildOption = document.createElement("option");
            buildOption.setAttribute("value", saveName);
            buildList.appendChild(buildOption);
        } else {
            document.getElementById("saved-build").textContent = "";
            if (encodedBuild === "") {
                document.getElementById("saved-error").textContent = "Empty build";
            }
            else {
                document.getElementById("saved-error").textContent = "Exists. Overwrite?";
            }
        }
    }
}

function loadBuild() {
    let savedBuilds = window.localStorage.getItem("builds") === null ? {} : JSON.parse(window.localStorage.getItem("builds"));
    let saveName = document.getElementById("build-name").value;

    if (Object.keys(savedBuilds).includes(saveName)) { 
        // NOTE: this is broken since decodeBuild is async func.
        // Doubly broken because of versioning... lets just kill this for now
        decodeBuild(savedBuilds[saveName])
        document.getElementById("loaded-error").textContent = "";
        document.getElementById("loaded-build").textContent = "Build loaded";
    } else {
        document.getElementById("loaded-build").textContent = "";
        document.getElementById("loaded-error").textContent = "Build doesn't exist";
    }
}

function resetFields(){
    for (const i of powder_inputs) {
        setValue(i, "");
    }
    for (const i of equipment_inputs) {
        setValue(i, "");
    }
    for (const i of tomeInputs) {
        setValue(i, "");
    }
    setValue("str-skp", "0");
    setValue("dex-skp", "0");
    setValue("int-skp", "0");
    setValue("def-skp", "0");
    setValue("agi-skp", "0");
    for (const special_name of specialNames) {
        for (let i = 1; i < 6; i++) { //toggle all pressed buttons of the same powder special off
            //name is same, power is i
            let elem = document.getElementById(special_name.replace(" ", "_")+'-'+i);
            if (elem.classList.contains("toggleOn")) {
                elem.classList.remove("toggleOn");
            }
        }
    }
    for (const [key, value] of damageMultipliers) {
        let elem = document.getElementById(key + "-boost")
        if (elem.classList.contains("toggleOn")) {
            elem.classList.remove("toggleOn");
        }
    }
    for (const elem of skp_order) {
        document.getElementById(elem + "_boost_armor").value = 0;
        document.getElementById(elem + "_boost_armor").style.background = `linear-gradient(to right, #AAAAAA, #AAAAAA 0%, #AAAAAA 100%)`;
        document.getElementById(elem + "_boost_armor_label").textContent = `% ${damageClasses[skp_order.indexOf(elem)+1]} Damage Boost: 0`;
    }

    const nodes_to_reset = equip_inputs.concat(powder_nodes).concat(edit_input_nodes).concat([powder_special_input, boosts_node, armor_powder_node]);
    for (const node of nodes_to_reset) {
        node.mark_dirty();
    }

    for (const node of nodes_to_reset) {
        node.update();
    }

    setValue("level-choice", "121");
    location.hash = "";
}

function toggleID() {
    let button = document.getElementById("show-id-button");
    let targetDiv = document.getElementById("id-edit");
    if (button.classList.contains("toggleOn")) { //toggle the pressed button off
        targetDiv.style.display = "none";
        button.classList.remove("toggleOn");
    }
    else {
        targetDiv.style.display = "block";
        button.classList.add("toggleOn");
    }
}

function toggleButton(button_id) {
    let button = document.getElementById(button_id);
    if (button) {
        if (button.classList.contains("toggleOn")) {
            button.classList.remove("toggleOn");
        } else {
            button.classList.add("toggleOn");
        }
    }
}

function autocomplete_msg(equipment_type) {
    return (list, data) => {
        // dynamic result loc
        let position = document.getElementById(equipment_type+'-dropdown').getBoundingClientRect();
        list.style.top = position.bottom + window.scrollY +"px";
        list.style.left = position.x+"px";
        list.style.width = position.width+"px";
        list.style.maxHeight = position.height * 2 +"px";

        if (!data.results.length) {
            message = document.createElement('li');
            message.classList.add('scaled-font');
            message.textContent = "No results found!";
            list.prepend(message);
        }
    }
}

function create_autocomplete(data, data_map, item_type, translator) {
    // create dropdown
    return new autoComplete({
        data: {
            src: data
        },
        selector: "#"+ item_type +"-choice",
        wrapper: false,
        resultsList: {
            maxResults: 1000,
            tabSelect: true,
            noResults: true,
            class: "search-box dark-7 rounded-bottom px-2 fw-bold dark-shadow-sm",
            element: autocomplete_msg(item_type)
        },
        resultItem: {
            class: "scaled-font search-item",
            selected: "dark-5",
            element: (item, data) => {
                let val = translator(data.value);
                item.classList.add(data_map.get(val).tier);
            },
        },
        events: {
            input: {
                selection: (event) => {
                    if (event.detail.selection.value) {
                        event.target.value = translator(event.detail.selection.value);
                    }
                    event.target.dispatchEvent(new Event('change'));
                },
            },
        }
    });
}

function add_tome_autocomplete(tome_type) {
    // Build the valid choices
    let tome_arr = [];
    let tome_aliases = new Map();
    for (const tome_name of tomeLists.get(tome_type.replace(/[0-9]/g, ''))) {
        let tome_obj = tomeMap.get(tome_name);
        if (tome_obj["restrict"] && tome_obj["restrict"] === "DEPRECATED") {
            continue;
        }
        //this should suffice for tomes - jank
        if (tome_obj["name"].includes('No ' + tome_type.charAt(0).toUpperCase())) {
            continue;
        }
        let tome_alias = tome_obj['alias'];
        tome_arr.push(tome_name);
        if (tome_alias && tome_alias !== "NO_ALIAS") {
            tome_arr.push(tome_alias);
            tome_aliases.set(tome_alias, tome_name);
        }
    }

    create_autocomplete(tome_arr, tomeMap, tome_type, (v) => { if (tome_aliases.has(v)) { v = tome_aliases.get(v); }; return v; });
}

function add_item_autocomplete(item_type) {
    // Build the valid choices
    let item_arr = [];
    if (item_type == 'weapon') {
        for (const weaponType of weapon_keys) {
            for (const weapon of itemLists.get(weaponType)) {
                let item_obj = itemMap.get(weapon);
                if (item_obj["restrict"] && item_obj["restrict"] === "DEPRECATED") {
                    continue;
                }
                if (item_obj["name"] == 'No '+ item_type.charAt(0).toUpperCase() + item_type.slice(1)) {
                    continue;
                }
                item_arr.push(weapon);
            }
        }
    } else {
        for (const item of itemLists.get(item_type.replace(/[0-9]/g, ''))) {
            let item_obj = itemMap.get(item);
            if (item_obj["restrict"] && item_obj["restrict"] === "DEPRECATED") {
                continue;
            }
            if (item_obj["name"] == 'No '+ item_type.charAt(0).toUpperCase() + item_type.slice(1)) {
                continue;
            }
            item_arr.push(item)
        }
    }

    create_autocomplete(item_arr, itemMap, item_type, (v) => { return v; });
}

// autocomplete initialize
function init_autocomplete() {
    for (const eq of equipment_keys) {
        add_item_autocomplete(eq);
    }
    for (const eq of tome_keys) {
        add_tome_autocomplete(eq);
    }
}

function collapse_element(elmnt) {
    elem_list = document.querySelector(elmnt).children;
    if (elem_list) {
        for (elem of elem_list) {
            if (elem.classList.contains("no-collapse")) { continue; }   
            if (elem.style.display == "none") {
                elem.style.display = "";
            } else {
                elem.style.display = "none";
            }  
        }
    }
    // macy quirk
    window.dispatchEvent(new Event('resize'));
    // weird bug where display: none overrides??
    document.querySelector(elmnt).style.removeProperty('display');
}

let var_stats_map = new Map();
let var_stats_rev_map = new Map();
let var_stats_names = [];
function init_var_stat_maps() {
    for (let id of rolledIDs) {
        if (idPrefixes[id]) {
            let name = idPrefixes[id].split(':')[0];
            var_stats_names.push(name);
            var_stats_map.set(id, name);
            var_stats_rev_map.set(name, id);
        }
    }
}

function create_edited_stat() {
    let data = {};
    let row = make_elem("div", ["row"], {style: "padding-bottom: 5px;"});
    data.div = row;

    let search_input = make_elem("input",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control"],
        {id: "filter-input-" + edit_id_field_counter, type: "text", placeholder: "ID name"}
    );
    edit_id_field_counter++;
    row.appendChild(search_input);
    data.input_elem = search_input;

    let value = make_elem("input",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control"],
        {placeholder: "Current"}
    );
    data.value_elem = value;
    row.appendChild(value);

    let base = make_elem("div",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control"],
        {textContent: "Original: "}
    );
    row.appendChild(base);
    
    let trash = make_elem("img", ["col-auto", "m-0", "p-0", "img-fluid"], {src: "../media/icons/trash.svg", style: "height: 2rem;"});
    trash.addEventListener("click", function() {
        edited_ids.splice(Array.from(row.parentElement.children).indexOf(row), 1);
        row.remove();
        // clean up the row's link so it stops contributing once removed
        if (data.stat_node) {
            edit_agg_node.remove_link(data.stat_node);
            edit_input_nodes.splice(edit_input_nodes.indexOf(data.stat_node), 1);

            data.stat_node.remove_link(edit_id_output);
            const idx = edit_id_output.notify_nodes.indexOf(data.stat_node);
            if (idx !== -1) edit_id_output.notify_nodes.splice(idx, 1);

            edit_agg_node.mark_dirty().update();
        }
    });
    row.appendChild(trash);
    
    data.base_elem = base;

    data.stat_node = null; // the single node for this row, created once

    search_input.addEventListener("input", (event) => {
        const stat_id = var_stats_rev_map.get(search_input.value);
        if (!stat_id || !player_build.statMap.has(stat_id)) return;

        value.id = stat_id;
        base.id = stat_id + '-base';
        value.value = player_build.statMap.get(stat_id);
        base.textContent = "Original: " + player_build.statMap.get(stat_id);

        // create the node only once
        if (data.stat_node === null) {
            data.stat_node = new SumNumberInputNode(search_input.id + '-stat-input', value);
            edit_agg_node.link_to(data.stat_node, stat_id);
            edit_input_nodes.push(data.stat_node);
            
            // Mirror what EditableIDSetterNode's constructor does for its original nodes,
            // so a build reset/reload can find and refresh this node too.
            data.stat_node.link_to(edit_id_output);
            data.stat_node.fail_cb = true;
            edit_id_output.notify_nodes.push(data.stat_node);
        } else {
            edit_agg_node.inputs.get(data.stat_node.name).translation = stat_id;
        }

        edit_agg_node.mark_dirty().update();
        data.stat_node.mark_dirty().update();
    });

    document.getElementById("edit-stat-container").appendChild(row);
    edited_ids.push(data);
    init_stat_dropdown(data);
    return data;
}

function init_stat_dropdown(stat_block) {
    let field_choice = stat_block.input_elem;
    stat_block.autoComplete = new autoComplete({
        data: {
            src: var_stats_names,
        },  
        threshold: 0,
        selector: "#" + field_choice.id,
        wrapper: false,
        resultsList: {
            maxResults: 100,
            tabSelect: true,
            noResults: true,
            class: "search-box dark-7 rounded-bottom px-2 fw-bold dark-shadow-sm",
            element: (list, data) => {
                let position = field_choice.getBoundingClientRect();
                list.style.top = position.bottom + window.scrollY +"px";
                list.style.left = position.x+"px";
                list.style.width = position.width+"px";
                list.style.maxHeight = position.height * 4 +"px";
                if (!data.results.length) {
                    const message = make_elem('li', ['scaled-font'], {textContent: "No results found!"});
                    list.prepend(message);
                };
            },
        },
        resultItem: {
            class: "scaled-font search-item",
            selected: "dark-5",
        },
        events: {
            input: {
                selection: (event) => {
                    if (event.detail.selection.value) {
                        event.target.value = event.detail.selection.value;
                        field_choice.dispatchEvent(new Event('input'));
                    };
                },
            },
        }
    });
}

async function init() {
    console.log("builder.js init");

    // Other "main" stuff
    // Spell dropdowns
    for (const eq of equipment_keys) {
        document.querySelector("#"+eq+"-tooltip").addEventListener("click", () => collapse_element('#'+eq+'-tooltip'));
    }
    // Hover popup on item icons (desktop only). Tomes already have their own hover via TomeHoverRenderNode.
    initItemHoverPopups(equipment_keys);
    //  Armor Specials
    for (let i = 0; i < 5; ++i) {
        const powder_special = powderSpecialStats[i];
        const elem_name = damageClasses[i+1];   // skip neutral
        const elem_char = skp_elements[i];      // TODO: merge?
        const skp_name = skp_order[i];          // TODO: merge?
        const boost_parent = document.getElementById(skp_name+'-boost');
        const slider_id = skp_name+'_boost_armor';
        const label_name = "% " + elem_name + " Dmg Boost";
        const slider_container = gen_slider_labeled({label_name: label_name, max: powder_special.cap, id: slider_id, color: elem_colors[i]});
        boost_parent.appendChild(slider_container);
        document.getElementById(slider_id).addEventListener("change", (_) => armor_powder_node.mark_dirty().update() );
    }

    // Masonry setup
    try {
        let masonry = Macy({
            container: "#masonry-container",
            columns: 1,
            mobileFirst: true,
            breakAt: {
                1200: 4,
            },
            margin: {
                x: 20,
                y: 20,
            }
        });

        let search_masonry = Macy({
            container: "#search-results",
            columns: 1,
            mobileFirst: true,
            breakAt: {
                1200: 4,
            },
            margin: {
                x: 20,
                y: 20,
            }
        });
    } catch (e) {
        console.log("Could not initialize macy components. Maybe you're offline?");
        console.log(e);
    }
    const skillpoints = await decodeHash();

    try {
        init_autocomplete();
    } catch (e) {
        console.log("Could not initialize autocomplete. Maybe you're offline?");
        console.log(e);
    }
    builder_graph_init(skillpoints);
    for (const item_node of item_final_nodes) {
        // console.log(item_node);
        if (item_node.get_value() === null) {
            // likely DB load failure...
            if (confirm('One or more items failed to load correctly. This could be due to a corrupted build link, or (more likely) a database load failure. Would you like to reload?')) {
                hardReload();
            }
            break;
        }
    }
    init_var_stat_maps();
}

window.onerror = function(message, source, lineno, colno, error) {
    document.getElementById('err-box').textContent = message;
    document.getElementById('stack-box').textContent = error.stack;
};

(async function() {
    await init();
})();
