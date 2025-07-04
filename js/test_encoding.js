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
    ["encodedSkillpoints", 0],
    ["compRatio", 0]
]

function initTestStorage() {
    for (const [key, val] of test_states) {
        if (!localStorage.getItem(key)) localStorage.setItem(key, val);
    }
}

initTestStorage();

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

async function getTestData() {
    if (!localStorage.getItem("urlList") === "") return ["loaded_test_data", null];
    response = await fetch("../test_data/encoding_test_data.json");
    if (response?.ok) {
        return ["loading", await response.json()];
    } else {
        throw new Error(`Failed to fetch reasource, recieved ${response.status}: ${response.statusText}`);
    }
}

// Overwrite the decodeHash function to load the test data
// if it's not yet loaded
originalDecodeHash = decodeHash;
decodeHash = async function() {
    let [state, test_file] = await getTestData();
    if (state === "loading") {
        localStorage.setItem("urlList", JSON.stringify(test_file.test_links));
    } else {
        // do nothing
    }
    // call and return the original decodeHash function
    return await originalDecodeHash();
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
        old_powders = collectPowders(old_powders);
        new_powders = collectPowders(new_powders);
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
            return encodeBuild(build, powders, skillpoints, atree, atree_state, aspects);
        }

        // After collecting the data from two builds, check for their equivalence
        if (linkIndex % 2 === 0) {
            const arr = JSON.parse(localStorage.getItem("testArray"), reviver)
            if (linkIndex > 0) {
                testEntries(arr);
                const previous_old_url = new URL(url_list[linkIndex / 2 - 1]);
                const previous_encoding = previous_old_url.search.substring(1) + previous_old_url.hash.substring(1)
                const current_encoding = location.hash.substring(1);
                const ratio = current_encoding.length / previous_encoding.length;
                const accu = parseFloat(localStorage.getItem("compRatio"));
                localStorage.setItem("compRatio", accu + ratio);
            }
            localStorage.setItem("testArray", JSON.stringify([]));

            // This is the "break" condition
            if (linkIndex === url_list.length * 2) {
                localStorage.setItem("testSuccessful", 1);
                const sum_ratios = parseFloat(localStorage.getItem("compRatio"));
                localStorage.setItem("finalRatio", sum_ratios / url_list.length);
                location.replace(URL_PREPATH);
            }

            const new_url = new URL(url_list[linkIndex / 2]);
            history.pushState(null, "", URL_PREPATH + new_url.search + new_url.hash);
        } else {
            const hash = encodeBuild(build, powders, skillpoints, atree, atree_state, aspects).toB64();
            history.pushState(null, "", URL_PREPATH + "#" + hash);
        };


        setTimeout(() => location.reload(), 750);
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
        // Force an update even if the value is the same as the previous one, i.e
        // there was no skillpoint encoding to trigger a second update
        for (const node of this.notify_nodes) {
            node.valid_val = null;
        }
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
    initTestStorage();
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
