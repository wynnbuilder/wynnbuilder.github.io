/**
 * Inject testing code into the builder graph.
 * must be loaded before builder initialization.
 */

if (location.hostname !== "localhost") {
    throw new Error("This script must only be run locally!");
}

let TEST_SCHEME = "http://"
let TEST_HOST = location.host;
let TEST_PATH = location.pathname;

let URL_PREPATH = TEST_SCHEME + TEST_HOST + TEST_PATH;

// Set up intial localStorage state
const test_states = [
    ["testBegin", 0],
    ["testArray", JSON.stringify([])],
    ["linkIndex", -1],
    ["urlList", ""],
    ["encodedSkillpoints", 0]
]

function init_test_storage() {
    for (const [key, val] of test_states) {
        if (!localStorage.getItem(key)) localStorage.setItem(key, val);
    }
}

init_test_storage();

// Make sure this test doesn't randomly make someone think they've been hacked
const testMessage = `
Warning! You're about to start an encoding test.

This test will cause your browser to go through
a large series of links, rapidly switching between them,
and will only be stopped by closing the window or leaving the site.

Please click OK if you accidentally came accross this link.
Please click CANCEL if you wish to begin the test.
`
if (localStorage.getItem("testBegin") === "0" && confirm(testMessage)) {
    // Cleanup and redirect to builder
    localStorage.clear();
    location.replace(location.origin + '/builder') 
} else {
    localStorage.setItem("testBegin", 1);
}

async function get_test_data() {
    if (!localStorage.getItem("urlList") === "") return ["loaded_test_data", null];
    response = await fetch("../test_data/encoding_test_data.json");
    if (response?.ok) {
        return ["loading", await response.json()];
    } else {
        throw new Error(`Failed to fetch reasource, recieved ${response.status}: ${response.statusText}`);
    }
}

// Overwrite the parse_hash function to load the test data
// if it's not yet loaded
original_parse_hash = parse_hash;
parse_hash = async function() {
    let [state, test_file] = await get_test_data();
    if (state === "loading") {
        localStorage.setItem("urlList", JSON.stringify(test_file.test_links));
    } else {
        // do nothing
    }
    // call and return the original parse_hash function
    return await original_parse_hash();
}

// Change confirm to a boolean to stop the upgrade build alert
// false will load builds in their original version
// true will load builds in the latest version
confirm = (msg) => false

//
// https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map 
//
// Parse specialized instances into JSON objects.
//
function replacer(key, value) {
  if(value instanceof Map) {
    return {
      dataType: 'Map',
      value: [...value.entries()],
    };
  } else if (value instanceof Item){
      return {
          dataType: 'Item',
          value: JSON.stringify(value.statMap, replacer)
      }
  } else if (value instanceof Craft) {
      return {
          dataType: 'Craft',
          value: [
              JSON.stringify(value.recipe, replacer), 
              JSON.stringify(value.mat_tiers, replacer),
              JSON.stringify(value.ingreds, replacer),
              JSON.stringify(value.atkSpd, replacer),
              ""
              // Don't care about the hash, it's not equal between versions
          ]
      }
  } else if (value instanceof Custom) {
    return {
        dataType: 'Custom',
        value: JSON.stringify(value.statMap, replacer) 
    }
  } else { 
    return value;
  }
}

//
// https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map 
//
// Parse specialized instances from JSON objects, and discard unwanted attributes
// unnecessary for comparison.
//
function reviver(key, value) {
  if(typeof value === 'object' && value !== null) {

    // Normal Map
    if (value.dataType === 'Map') {
      return new Map(value.value);

    // Items
    } else if (value.dataType === 'Item') {
        const statMap = JSON.parse(value.value, reviver);
        const item = new Item(undefined);
        item.statMap = statMap;
        item.statMap.set("powders", []); // Powders are checked seperately
        return item;

    // Crafted Items
    } else if (value.dataType === 'Craft') {
        let v = value.value;
        const recipe = JSON.parse(v[0], reviver);
        const matTiers = JSON.parse(v[1], reviver);
        const ingreds = JSON.parse(v[2], reviver);
        let atkSpd = JSON.parse(v[3], reviver);
        // Default to slow attack speed if the type is not a weapon since
        // new encoding defaults while old encoding doesn't
        if (!weaponTypes.includes(recipe.get("type").toLowerCase())) {
           atkSpd = "SLOW"; 
        }
        let craft = new Craft(recipe, matTiers, ingreds, atkSpd, "");
        // Discard of the statMap, calced of ings so ings === ings is enough
        craft.statMap = ""; 
        return craft;

    // Custom Items
    } else if (value.dataType === 'Custom') {
        let custom_item = new Custom(JSON.parse(value.value, reviver))
        custom_item.statMap.delete("hash");
        let displayName = custom_item.statMap.get("displayName");
        if (displayName !== undefined && displayName.substring(3) === "CI-") {
            custom_item.statMap.set("displayName", "");
        }
        return custom_item;
    }
  }

  return value;
}

// Should work if the order of fields in each object doesn't randomly change
// Will not work for powders, crafted and custom items as they differ by definition
function compareDeepEquals(one, two) {
    if (JSON.stringify(one, replacer) != JSON.stringify(two, replacer)) {
        console.warn("Compare equals mismatch:", one, two);
        console.warn("String representation:", JSON.stringify(one, replacer), JSON.stringify(two, replacer));
        return false;
    }
    return true
}

//
// Check that the powders between each 2 consecutive links matches.
//
function checkPowders(old_powder_arr, new_powder_arr) {
    for (let [old_powders, new_powders] of zip2(old_powder_arr, new_powder_arr)) {
        old_powders = collect_powders(old_powders);
        new_powders = collect_powders(new_powders);
        assert(compareDeepEquals(new_powders, old_powders), "Powders don't match!");
    }
}

// Check that an array of deeply nested objects matches another object
function checkDeep(old_data, new_data, msg="Assertion failed while trying to compare build links!") {
    assert(zip2(old_data, new_data).every(([x, y]) => compareDeepEquals(x, y)), msg);
}

//
function checkShallow(old_data, new_data, msg="Assertion failed while trying to compare build links!") {
    assert(zip2(old_data, new_data).every(([x ,y]) => x === y))
}

function testEntries(arr) { 
    for (let i = 0; i < arr.length - 1; i += 2) {
        let [old_encoded_data, newly_encoded_data] = [arr[i], arr[i + 1]];
        // Powders
        checkPowders(old_encoded_data.powders, newly_encoded_data.powders);
        // Skillpoints
        checkShallow(old_encoded_data.skillpoints, newly_encoded_data.skillpoints);
        checkShallow(old_encoded_data.build.total_skillpoints, newly_encoded_data.build.total_skillpoints);
        assert(old_encoded_data.build.assigned_skillpoints === newly_encoded_data.build.assigned_skillpoints);
        // Aspects
        checkDeep(old_encoded_data.aspects, newly_encoded_data.aspects);
        // Equipment
        checkDeep(old_encoded_data.build.equipment, newly_encoded_data.build.equipment);
        // Tomes
        checkDeep(old_encoded_data.build.tomes, newly_encoded_data.build.tomes);
        // Stats
        compareDeepEquals(old_encoded_data.build.statMap, newly_encoded_data.build.statMap);
        // Level
        assert(old_encoded_data.build.level === newly_encoded_data.build.level);
    }
}

// Inject the graph with a testing variant of the encoding node 
// that just collects testing data and drives the testing through.
// overrides the declaration before initialization
BuildEncodeNode = class extends ComputeNode {
    constructor() { super("builder-encode"); }

    compute_func(input_map) {
        const build = input_map.get('build');
        const atree = input_map.get('atree');
        const atree_state = input_map.get('atree-state');
        const aspects = input_map.get('aspects');
        let powders = [
            input_map.get('helmet-powder'),
            input_map.get('chestplate-powder'),
            input_map.get('leggings-powder'),
            input_map.get('boots-powder'),
            input_map.get('weapon-powder')
        ];
        const skillpoints = [
            input_map.get('str'),
            input_map.get('dex'),
            input_map.get('int'),
            input_map.get('def'),
            input_map.get('agi')
        ];

        // Save the data for tesing
        const encoded_data = {
            build: build,
            powders: powders,
            skillpoints: skillpoints,
            encoded_skillpoints: false,
            // atree: atree,
            // atree_state: atree_state,
            aspects: aspects,
        }

        // Check the current index of the tesing urls
        // update it to the next one
        let linkIndex = parseInt(localStorage.getItem("linkIndex"));

        // Get the URL Testing list
        const url_list = JSON.parse(localStorage.getItem("urlList"));

        // Check whether we've encoded the saved sp already
        const encodedSkillpoints = parseInt(localStorage.getItem("encodedSkillpoints"));

        // Initialize the test
        if (linkIndex === -1) {
            let url = new URL(url_list[0]);
            localStorage.setItem("linkIndex", 0);
            location.replace(URL_PREPATH + url.search + url.hash);
            location.reload();
        }

        // Get the data array from localStorage and rewrite it to contain the latest data
        if (parseInt(encodedSkillpoints) === 1) {
            let testing_array = JSON.parse(localStorage.getItem("testArray", reviver));
            testing_array.push(encoded_data);
            localStorage.setItem("testArray", JSON.stringify(testing_array, replacer));
            localStorage.setItem("encodedSkillpoints", 0);
        } else {
            return encode_build(build, powders, skillpoints, atree, atree_state, aspects);
        }

        if (linkIndex === url_list.length * 2) {
            location.replace(URL_PREPATH);
        }

        // After collecting the data from two builds, check for their equivalence
        if (linkIndex !== 0 && linkIndex % 2 === 0) {
            const arr = JSON.parse(localStorage.getItem("testArray"), reviver)
            testEntries(arr);
            localStorage.setItem("testArray", JSON.stringify([]));
        }

        if (linkIndex % 2 === 0) {
            // move to the next URL in the test list
            const url = new URL(url_list[linkIndex / 2]);
            history.pushState(null, "", URL_PREPATH + url.search + url.hash);
        // We just collected the old data, collect the new data next
        } else {
            const hash = encode_build(build, powders, skillpoints, atree, atree_state, aspects).toB64();
            history.pushState(null, "", URL_PREPATH + "#" + hash);
        };

        setTimeout(() => location.reload(), 1000);
        // return encode_build(build, powders, skillpoints, atree, atree_state, aspects);
    }
}

// Update the skillpoint setter to update the localStorage
// state after a it's done setting the values from the URL skillpoints
SkillPointSetterNode = class extends ComputeNode {
    constructor(notify_nodes) {
        super("builder-skillpoint-setter");
        this.notify_nodes = notify_nodes.slice();
        this.skillpoints = undefined;
        for (const child of this.notify_nodes) {
            child.link_to(this);
            child.fail_cb = true;
            // This is needed because initially there is a value mismatch possibly... due to setting skillpoints manually
            child.mark_input_clean(this.name, null);
        }
    }

    compute_func(input_map) {
        if (input_map.size !== 1) { throw "SkillPointSetterNode accepts exactly one input (build)"; }
        const [build] = input_map.values();  // Extract values, pattern match it into size one list and bind to first element
        for (const [idx, elem] of skp_order.entries()) {
            document.getElementById(elem+'-skp').value = build.total_skillpoints[idx];
        }
        if (this.skillpoints === undefined) { return; }
        if (this.skillpoints !== null) {
            for (const [idx, elem] of skp_order.entries()) {
                if (this.skillpoints[idx] !== null) {
                    document.getElementById(elem+'-skp').value = this.skillpoints[idx];
                }
            }
        }
        localStorage.setItem("linkIndex", parseInt(localStorage.getItem("linkIndex")) + 1);
        localStorage.setItem("encodedSkillpoints", 1);
    }

    update(skillpoints=undefined) {
        this.skillpoints = skillpoints;
        return super.update()
    }
}

// Rolling our own URL update code
URLUpdateNode = class extends ComputeNode { compute_func() {} }

function resetTest() {
    localStorage.clear();
    init_test_storage();
    location.replace(URL_PREPATH);
}

// Add reset functionality
let sidebar = document.getElementById("main-sidebar");
let reset_button = make_elem('a', [], {onclick: "resetTest()"});
reset_button.setAttribute("onclick", "resetTest()");

let reset_button_text = make_elem('b', [], {});
reset_button_text.innerHTML = "Reset test"

reset_button.prepend(reset_button_text);
sidebar.prepend(reset_button)
