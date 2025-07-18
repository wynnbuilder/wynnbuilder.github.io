/*
 * TESTING SECTION
 */

 
const item_url_base = location.href.split("#")[0];
const item_url_tag = location.hash.slice(1);
// console.log(item_url_base);
// console.log(item_url_tag);

const ITEM_BUILD_VERSION = "7.0.1";


let item;
let amp_state = 0; //the level of corkian map used for ID purposes. Default 0.

function init_itempage() {
    //console.log(item_url_tag);

    //displayExpandedItem(expandItem(itemMap.get(item_url_tag).statMap, []), "item-view");
    try{ 
        item = expandItem(itemMap.get(item_url_tag.replaceAll("%20"," ")), []);
        item.set('powders', []);
        if (item.get('category') === 'weapon') {
            apply_weapon_powders(item);
        }
        displayExpandedItem(item, "item-view");
        displayAdditionalInfo("additional-info", item);
        displayIDCosts("identification-costs", item);
        if (item.get("set") && sets[item.get("set")]) {
            displayAllSetBonuses("set-bonus-info",item.get("set"));
        }
        displayIDProbabilities("identification-probabilities", item, amp_state);
    } catch (error) {
        console.log(error);
        console.log(error.stack);
    }
}

/** Toggles the corkian amplifier level.
 * 
 * @param {Number} button_id the ID of the button just pressed.
 */
function toggleAmps(button_id) {
    amp_state = 0;
    if (button_id == 0) {return;}
    else {
        let button = document.getElementById("cork_amp_" + button_id);
        if (!button.classList.contains("toggleOn")) {
            for (const child of document.getElementById("amp_row").childNodes) {
                if (child.tagName === "BUTTON" && child.id !== button.id && child.classList.contains("toggleOn")) {
                    child.classList.remove("toggleOn");
                }
            }
            amp_state = button_id;
        } 
    }    
    displayIDProbabilities("identification-probabilities", item, amp_state);
}


(async function() {
    let latest_ver_name = wynn_version_names[WYNN_VERSION_LATEST];
    let load_promises = [ item_loader.load_init(), load_major_id_data(latest_ver_name) ];
    await Promise.all(load_promises);
    init_itempage();
})();
