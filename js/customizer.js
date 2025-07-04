const custom_url_base = location.href.split("#")[0];
const custom_url_tag = location.hash.slice(1);

let player_custom_item;
let player_custom_ing;
let base_item; //the item that a user starts from, if any
let pos_range = [0.3,1.3];
let neg_range = [1.3,0.7];


let roll_range_ids = ["neg_roll_range-choice-min","neg_roll_range-choice-max","pos_roll_range-choice-min","pos_roll_range-choice-max"];

let custom_field_id_counter = 0;

let var_stats = []

// Ripped from search.js.
function create_stat() {
    let data = {};
    const fixIDs = document.getElementById("fixID-choice").classList.contains("toggleOn");

    let row = make_elem("div", ["row"], {style: "padding-bottom: 5px"});
    let col = make_elem("div", ["col"], {});
    row.appendChild(col);
    data.div = row;

    let row1 = make_elem("div", ["row"], {});
    let search_input = make_elem("input",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control", "form-control-sm", "filter-input"],
        {id: "filter-input-" + custom_field_id_counter, type: "text", placeholder: "ID name"}
    );
    custom_field_id_counter++;
    row1.appendChild(search_input);
    data.input_elem = search_input;

    let trash = make_elem("img", ["col-2", "delete-filter"], {src: "../media/icons/trash.svg"});
    trash.addEventListener("click", function() {
        var_stats.splice(Array.from(row.parentElement.children).indexOf(row), 1);
        row.remove();
    });
    row1.appendChild(trash);
    col.appendChild(row1);

    let row2 = make_elem("div", ["row"], {});
    let min = make_elem("input",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control", "form-control-sm", "number-input"],
        {placeholder: "Min"}
    );
    row2.appendChild(min);
    data.min_elem = min;

    let base = make_elem("input",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control", "form-control-sm", "number-input"],
        {placeholder: "Base"}
    );
    row2.appendChild(base);
    data.base_elem = base;

    let max = make_elem("input",
        ["col", "border-dark", "text-light", "dark-5", "rounded", "scaled-font", "form-control", "form-control-sm", "number-input"],
        {placeholder: "Max"}
    );
    row2.appendChild(max);
    data.max_elem = max;
    col.append(row2);

    if (fixIDs) {
        min.setAttribute("hidden", "");
        base.setAttribute("hidden", "");
    }

    base.addEventListener("focusout", (event) => {
        base_to_range(search_input, base, min, max);
    });
    min.addEventListener("focusout", (event) => {
        range_to_base(search_input, min, 'min', base, max);
    });
    max.addEventListener("focusout", (event) => {
        range_to_base(search_input, max, 'max', base, min);
    });

    document.getElementById("var-stat-container").insertBefore(row, document.getElementById("add-stat").parentElement);
    var_stats.push(data);
    init_stat_dropdown(data);
    return data;
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

function init_stat_dropdown(stat_block) {
    let field_choice = stat_block.input_elem;
    field_choice.onclick = function() {field_choice.dispatchEvent(new Event('input', {bubbles:true}));};
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
                    };
                },
            },
        }
    });
}


function init_customizer() {
    try {
        init_var_stat_maps();
        decodeCustom(custom_url_tag);
        populateFields();

        // Variable stats.
        document.getElementById("add-stat").addEventListener("click", create_stat);
        if (!custom_url_tag) {
            create_stat();
        }

        for (const id of rolledIDs) {
            if (document.getElementById(id+"-choice-base")) {
            }
        }
        for (const id of roll_range_ids) {
            document.getElementById(id).addEventListener("focusout", (event) => {
                changeBaseValues();
            });
        }

        
    } catch (error) {
        console.log(error);
    }
}

/** Create a custom item based on data input into the fields.
 * 
 */
function calculateCustom() {
    try {
        //Make things display.
        for (let i of document.getElementsByClassName("hide-container-block")) {
            i.style.display = "block";
        }
        for (let i of document.getElementsByClassName("hide-container-grid")) {
            i.style.display = "grid";
        }

        let statMap = new Map();
        statMap.set("minRolls", new Map());
        statMap.set("maxRolls", new Map());
        let inputs = document.getElementsByTagName("input");

        for (const static_id of nonRolledIDs) {
            let input = document.getElementById(static_id + "-choice");

            if (input === null) {
                continue;
            }

            let val = input.value;
            if (val === "" && input.placeholder && input.placeholder !== "") {
                val = input.placeholder;
            }

            if (input.classList.contains("number-input")) {
                val = parseInt(val, 10)
                if (val) {
                    statMap.set(static_id, val);
                }
            } else if (static_id == "majorIds") {
                if (val === "") {
                    statMap.set(static_id, []);
                } else {
                    statMap.set(static_id, [val]);
                }
            } else if (input.classList.contains("string-input")) {
                if (val) {
                    statMap.set(static_id, val);
                }
            }
        }
        let fix_id = document.getElementById("fixID-choice").classList.contains("toggleOn");
        if (fix_id) {//Fixed IDs
            statMap.set('fixID', true);
        }
        for (const stat_box of var_stats) {
            let id = var_stats_rev_map.get(stat_box.input_elem.value);
            console.log(id);
            if (id === undefined) {
                continue;
            }
            if (fix_id) {
                let val = parseInt(stat_box.max_elem.value, 10);
                statMap.get("minRolls").set(id, val);
                statMap.get("maxRolls").set(id, val);
            }
            else {
                let min = parseInt(stat_box.min_elem.value, 10);
                let max = parseInt(stat_box.max_elem.value, 10);
                statMap.get("minRolls").set(id, min);
                statMap.get("maxRolls").set(id, max);
            }
        }

        player_custom_item = new Custom(statMap);

        let custom_str = encodeCustom(player_custom_item, true).toB64();
        location.hash = custom_str;
        player_custom_item.setHash(custom_str);

        
        if (player_custom_item.statMap.get('category') == 'weapon') {
            // wonkiness needed to set the right fields... this is jank
            apply_weapon_powders(player_custom_item.statMap);
        }
        displayExpandedItem(player_custom_item.statMap, "custom-stats");

    }catch (error) {
        //The error elements no longer exist in the page. Add them back if needed.

        // console.log(error.stack);

        let msg = error.stack;
        let lines = msg.split("\n");
        for (line of lines) {
            console.log(line);
        }
        // let header = document.getElementById("header");
        // header.textContent = "";
        // for (const line of lines) {
        //     let p = document.createElement("p");
        //     p.classList.add("itemp");
        //     p.textContent = line;
        //     header.appendChild(p);
        // }
        // let p2 = document.createElement("p");
        // p2.textContent = "If you believe this is an error, contact hppeng on forums or discord.";
        // header.appendChild(p2);
    }
    
}

function decodeCustom(custom_url_tag) {
    if (!custom_url_tag) return;
    if (custom_url_tag.slice(0,3) === "CI-") {
        location.hash = custom_url_tag.substring(3);
    } 

    const custom = parseCustom({hash: location.hash.substring(1)});

    const minRolls = custom.statMap.get("minRolls");
    if (custom.statMap.get("fixID") === true) { toggleButton("fixID-choice") };

    for (let [id, val] of minRolls.entries()) {
        if (["0-0", 0].includes(val)) continue;

        if (rolledIDs.includes(id)) {
            let stat_box = create_stat();
            stat_box.input_elem.value = var_stats_map.get(id);
            stat_box.min_elem.value = val;
            if (custom.statMap.get("fixID") === true) {
                stat_box.max_elem.value = val;
            } else {
                stat_box.max_elem.value = custom.statMap.get("maxRolls").get(id);
            }
            continue;
        }
    }

    console.log(custom);

    for (let [id, val] of custom.statMap) {
        if (["", "0-0", 0, []].includes(val)) continue;
        const element = document.getElementById(id+'-choice');
        if (element) {
            val = custom.statMap.get(id);
            setValue(id+"-choice", val);
        }
    }
    toggleFixed();
    calculateCustom();
}

function decodeCustomLegacy(custom_url_tag) {
    if (custom_url_tag) {
        if (custom_url_tag.slice(0,3) === "CI-") {
            custom_url_tag = custom_url_tag.substring(3);
            location.hash = location.hash.substring(3);
        } 

        if (version === "1") {
            //do the things
            if (fixID) {
                statMap.set("fixId", true);
                toggleButton("fixID-choice");
            }
            while (tag !== "") {
                let id = ci_save_order[Base64.toInt(tag.slice(0,2))];
                //console.log(tag.slice(0, 2) + ": " + id);
                let len = Base64.toInt(tag.slice(2,4));

                if (rolledIDs.includes(id)) {
                    let stat_box = create_stat();
                    stat_box.input_elem.value = var_stats_map.get(id);
                    let sign = parseInt(tag.slice(4,5),10);
                    let minRoll = Base64.toInt(tag.slice(5,5+len));
                    if (!fixID) {
                        let maxRoll = Base64.toInt(tag.slice(5+len,5+2*len));
                        if (sign > 1) {
                            maxRoll *= -1;
                        }
                        if (sign % 2 == 1) {
                            minRoll *= -1;
                        }
                        stat_box.max_elem.value = maxRoll;
                        stat_box.min_elem.value = minRoll;
                        statMap.get("minRolls").set(id,minRoll);
                        statMap.get("maxRolls").set(id,maxRoll);
                        tag = tag.slice(5+2*len);
                    } else {
                        if (sign != 0) {
                            minRoll *= -1;
                        }
                        stat_box.base_elem.value = minRoll;
                        statMap.get("minRolls").set(id,minRoll);
                        statMap.get("maxRolls").set(id,minRoll);
                        tag = tag.slice(5+len);
                    }
                } else {
                    let val;
                    //let elem = document.getElementById(id+"-choice");
                    if (non_rolled_strings.includes(id)) {
                        if (id === "tier") {
                            val = tiers[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else if (id === "type") {
                            val = item_types[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else if (id === "atkSpd") {
                            val = attackSpeeds[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else if (id === "classReq") {
                            val = classes[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else { //general case
                            val = tag.slice(4,4+len).replaceAll("%20"," ");
                        }
                        tag = tag.slice(4+len);
                    } else {
                        let sign = parseInt(tag.slice(4,5),10);
                        val = Base64.toInt(tag.slice(5,5+len));
                        if (sign == 1) {
                            val *= -1;
                        }
                        tag = tag.slice(5+len);
                    }
                    statMap.set(id, val);
                    setValue(id+"-choice", val);
                }
            }
            toggleFixed();
            statMap.set("hash",custom_url_tag);
            calculateCustom();
            player_custom_item.setHash(custom_url_tag);
        }
    }
}

function populateFields() {
    /*Ex
    let recipe_list = document.getElementById("recipe-choices");
    for (const recipe of recipeTypes) {
        let el = document.createElement("option");
        el.value = recipe.charAt(0) + recipe.substring(1).toLowerCase();
        recipe_list.appendChild(el);
    }
    */
   let tier_list = document.getElementById("tier-list");
   for (const tier of tiers) {
       let el = document.createElement("option");
       el.value = tier;
       tier_list.appendChild(el);
   }
   let type_list = document.getElementById("type-list");
   for (const type of item_types) {
        let el = document.createElement("option");
        el.value = type;
        type_list.appendChild(el);
   }
   let atkSpd_list = document.getElementById("atkSpd-list");
   for (const atkSpd of attackSpeeds) {
        let el = document.createElement("option");
        el.value = atkSpd;
        atkSpd_list.appendChild(el);
   }
   let class_list = document.getElementById("class-list");
   for (const className of classes) {
        let el = document.createElement("option");
        el.value = className;
        class_list.appendChild(el);
    }
    let item_list = document.getElementById("base-list");
    for (const name of itemMap.keys()) {
        let el = document.createElement("option");
        el.value = name;
        item_list.appendChild(el);
    }
}



/**
 * @param fixed : a boolean for the state of the fixID button.
 */
function toggleFixed() {
    let fixedID_bool = document.getElementById("fixID-choice").classList.contains("toggleOn");
    for (const stat_box of var_stats) {
        if (fixedID_bool) {
            stat_box.base_elem.setAttribute("hidden", "");
            stat_box.min_elem.setAttribute("hidden", "");
        } else {
            stat_box.base_elem.removeAttribute("hidden", "");
            stat_box.min_elem.removeAttribute("hidden", "");
        }
    }
}

/** Make a custom item
 * 
 * @param {elem} : The elem with value item to base off of. A string input.
 */
function useBaseItem(elem) {
    let itemName = getValue(elem);
    let baseItem = itemMap.get(itemName);
    baseItem = baseItem ? expandItem(baseItem) : undefined;

    // If it's not a normal item, try parsing from a crafted or custom item
    if(!baseItem) {
        switch (itemName.slice(0, 3)) {
            case "CR-": baseItem = parseCraft({hash: itemName.substring(3)}); break;
            case "CI-": baseItem = parseCustom({hash: itemName.substring(3)}); break;
            default: baseItem = null;
        }
        baseItem = baseItem.statMap;
    }
    console.log(baseItem);

    //If the item exists, go through stats and assign to values!
    if(baseItem) {
        resetFields();

        const fixID_button_toggled = document.getElementById("fixID-choice").classList.contains("toggleOn");
        //Rolled IDs
        if (baseItem.get("fixID") === true) { //fixed IDs
            if (!fixID_button_toggled) toggleButton('fixID-choice');
            for (const id of rolledIDs) { //use maxrolls
                if (baseItem.get("maxRolls").get(id)) {
                    let stat_box = create_stat();
                    stat_box.input_elem.value = var_stats_map.get(id);
                    stat_box.min_elem.value = baseItem.get("maxRolls").get(id);
                    stat_box.max_elem.value = baseItem.get("maxRolls").get(id);
                }
            }
        } else { //use both
            if (fixID_button_toggled) toggleButton('fixID-choice');
            for (const id of rolledIDs) {
                if (baseItem.get("maxRolls").get(id)) {
                    let stat_box = create_stat();
                    stat_box.input_elem.value = var_stats_map.get(id);
                    stat_box.min_elem.value = baseItem.get("minRolls").get(id);
                    stat_box.max_elem.value = baseItem.get("maxRolls").get(id);
                }
            }
        }
        toggleFixed();

        //Static IDs
        for (const id of nonRolledIDs) {
            if (baseItem.get(id) && document.getElementById(id+"-choice")) {
                setValue(id+"-choice", baseItem.get(id));
            }
        }
        //take care of displayName
        if (baseItem.get("displayName")) {
            setValue("name-choice", baseItem.get("displayName"));
        }

       //Take care of durability, duration, and charges.
        if (baseItem.get("tier") === "Crafted") {
            let specialIDs = ["duration", "durability"];
            setValue("charges-choice", baseItem.get("charges"));
            for (const id of specialIDs) {
                setValue(id+"-choice", baseItem.get(id)[0]+"-"+baseItem.get(id)[1]);
            }
        }
        

    }

    //Don't do anything if nothing is met
    calculateCustom();
}

/* Copy the link
*/
function copyCustom() {
    if (player_custom_item) {
        copyTextToClipboard(custom_url_base+location.hash);
        document.getElementById("copy-button").textContent = "Copied!";
    }
}

function copyHash() {
    if (player_custom_item) {
        let hash = player_custom_item.statMap.get("hash");
        console.log(hash);
        copyTextToClipboard(hash);
        document.getElementById("copy-button-hash").textContent = "Copied!";
    }
}


/* Reset all fields
*/
function resetFields() {
    for (const stat_block of var_stats) {
        stat_block.div.remove();
    }
    var_stats = [];
    let inputs = document.getElementsByTagName('input');
    for (const input of inputs) {
        input.textContent = "";
        input.value = "";
    }

    let elem = document.getElementById("fixID-choice")
    if (elem.textContent === "yes") {
        elem.textContent = "no";
        elem.classList.remove("toggleOn");
    }
}

/** Takes the base value for an id and attempts to autofill the corresponding min and maxes.
 * 
 * @param {String} id - the id to do the math for (ex: hprPct) 
 */
function base_to_range(id_elem, base_elem, min_elem, max_elem) {
    let base = parseFloat(base_elem.value);
    let id = var_stats_rev_map.get(id_elem.value);
    if (id === undefined) { return; }
    if (base) {
        //This version allows overriding of min and max.
        if (base == 0) {
            // NOTE: DO NOT remove this case! idRound behavior does not round to 0!
            min_elem.value = 0;
            max_elem.value = 0;
        }
        else if ((base > 0) != (reversedIDs.includes(id))) { // logical XOR. positive rolled IDs
            max_elem.value = idRound(pos_range[1]*base);
            min_elem.value = idRound(pos_range[0]*base);
        } else { //negative rolled IDs
            max_elem.value = idRound(neg_range[1]*base);
            min_elem.value = idRound(neg_range[0]*base);
        }

    }
}

/** Takes min/max value(s) and attempts to autofill the corresponding base and min/max
 * 
 * @param {String} id - the id to do the math for (ex: hprPct) 
 * @param {String} mode - the tabbed value (min or max)
 */
function range_to_base(id_elem, source, mode, base, other) {
    let id = var_stats_rev_map.get(id_elem.value);
    if (id === undefined) { return; }

    let value;
    try {
        value = parseFloat(source.value);
    } catch (error) {
        console.log("Error in range_to_base.");
        console.log(error);
    }

    let range;
    let op;
    if (value == 0) { return; }
    else if (value > 0) {
        range = pos_range;
        op = function(val) {
            return Math.max(Math.round(val), 1);
        };
    }
    else {
        range = neg_range;
        op = function(val) {
            return Math.min(Math.round(val), -1);
        };
    }

    if (reversedIDs.includes(id)) { // logical XOR. positive rolled IDs
        range = [range[1], range[0]];
    }

    if (mode === "min") { //base and max
        if (!base.value) {
            base.value = op(1/range[0] * value);
        }
        if (!other.value) {
            other.value = op(range[1] / range[0] * value);
        }
    } else if (mode === "max") { //min and base
        if (!base.value) {
            base.value = op(1/range[1] * value);
        }
        if (!other.value) {
            other.value = op(range[0] / range[1] * value);
        }
    }
}

/** Uses the base value input fields and changes the base values.
 * 
 */
function changeBaseValues() {
    for (const id of roll_range_ids) {
        if (getValue(id)) {
            if (id.includes("neg")) {
                if (id.includes("min")) {
                    neg_range[0] = parseFloat(getValue(id));
                } else {
                    neg_range[1] = parseFloat(getValue(id));
                }
            } else {
                if (id.includes("min")) {
                    pos_range[0] = parseFloat(getValue(id));
                } else {
                    pos_range[1] = parseFloat(getValue(id));
                }
            }
        }
    }
    for (const identification of rolledIDs) {
        if (document.getElementById(identification)) {
            base_to_range(identification);
        }
    }
}

function resetBaseValues() {
    pos_range = [0.3,1.3];
    neg_range = [1.3,0.7];
    for (const id of roll_range_ids) {
        setValue(id,"");
    }
}

/** Saves the current user's item as a JSON file.
 *  Starts a JSON download.
 */
function saveAsJSON() {
    let CI = {};
    for (const [id, val] of player_custom_item.statMap) {
        let skipIds = ["minRolls", "maxRolls", "skillpoints", "reqs", "custom", "crafted", "restrict", "hash",
            "nDam_", "tDam_", "eDam_", "wDam_", "fDam_", "aDam_",
            "powders", "durability", "duration" ]
        if (skipIds.includes(id)) {
            continue;
        } else {
            val ? CI[reversetranslations.get(id) ? reversetranslations.get(id) : id] = val : "" ;
        }
    }
    let is_fixid = true;
    if (player_custom_item.statMap.get("minRolls")) {
        for (let [id, min] of player_custom_item.statMap.get("minRolls")) {
            let max = player_custom_item.statMap.get("maxRolls").get(id);
            if (min && max) {
                let tmp = Math.min(min, max);
                max = Math.max(min, max);
                min = tmp;
                if (min != max) {
                    is_fixid = false;
                }
                // console.log(reversetranslations);
                let base = full_range_to_base(min, max);
                if (base === null) {
                    CI[reversetranslations.get(id) ? reversetranslations.get(id) : id] = [min,max];
                } else if (base) {
                    CI[reversetranslations.get(id) ? reversetranslations.get(id) : id] = base;
                }
                else {
                    console.log("CONVERSION ERROR: " + id);
                }
            }
        }
    }
    CI["identified"] = is_fixid
    
    console.log(JSON.stringify(CI, null, 0));
    //yuck
    copyTextToClipboard(JSON.stringify(CI, null, 0));
    document.getElementById("json-button").textContent = "Copied!";
    // let filename = player_custom_item.statMap.get("displayName");
    // var element = document.createElement('a');
    // element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(CI, null, 0)));
    // element.setAttribute('download', filename + ".json");

    // element.style.display = 'none';
    // document.body.appendChild(element);
    // element.click();
    // document.body.removeChild(element);
}

/**Helper function
 * Takes min, max, attempts to get the correct base. Returns null if no possible base or no base found.
 */
function full_range_to_base(min, max) {
    //checks against the range
    function checkBase(b, min, max) {
        if ( b > 0 ) {
            if (Math.round(pos_range[0] * b) == min && Math.round(pos_range[1] * b ) == max) {
                return true;
            } else {
                return false;
            }
        } else {
            if (Math.round(neg_range[0] * b) == min && Math.round(neg_range[1] * b ) == max) {
                return true;
            } else {
                return false;
            }
        }
    }
    if (min && max && min/max < 0) {
        return null;
    } else if (min == max) {
        //0 shouldn't save but this is for -1 and 1
        return min; 
    } else {
        //both should be same sign - now do math
        if (min < 0) {
            let minPossible = (max - 0.5) / neg_range[1];
            let maxPossible = (max + 0.5) / neg_range[1];
            for (let i = Math.floor(minPossible); i < Math.ceil(maxPossible); i++) {
                if (checkBase(i, min, max)) {
                    return i;
                }
            }

        } else {
            let minPossible = (max - 0.5) / pos_range[1];
            let maxPossible = (max + 0.5) / pos_range[1];
            for (let i = Math.floor(minPossible); i < Math.ceil(maxPossible); i++) {
                if (checkBase(i, min, max)) {
                    return i;
                }
            }

            return null;
        }
        
    }
}



(async function() {
    let load_promises = [ item_loader.load_init(), load_major_id_data(wynn_version_names[WYNN_VERSION_LATEST]) ];
    await Promise.all(load_promises);
    init_customizer();
})();
