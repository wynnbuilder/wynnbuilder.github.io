/*
 * TESTING SECTION
 */

const ing_url_base = location.href.split("#")[0];
const ing_url_tag = location.hash.slice(1);
// console.log(ing_url_base);
// console.log(ing_url_tag);



const ING_BUILD_VERSION = "7.0.1";
/*
 * END testing section
 */


 /* TODO: 
    Make material tier do something
    Double powders
    Integrate to normal builder
 */
let player_craft;

// function setTitle() {
//     document.getElementById("header").textContent = "WynnCrafter version "+ING_BUILD_VERSION+" (ingredient db version "+ING_DB_VERSION+")";
//     document.getElementById("header").classList.add("funnynumber");
// }

const atkSpdButtons = ["slow-atk-button", "normal-atk-button", "fast-atk-button"];

function init_crafter() {
    try {
        document.getElementById("recipe-choice").addEventListener("input", (event) => {
            updateMaterials();
            updateCraftedImage();
            calculateCraftSchedule();
        });
        document.getElementById("level-choice").addEventListener("input", (event) => {
            updateMaterials();
            calculateCraftSchedule();
        });
        const hash_input = document.getElementById("hash-input");
        hash_input.addEventListener("input", ev => handleHashInput(hash_input, ev));
        
        for (let i = 1; i < 4; ++i) {
            document.getElementById("mat-1-"+i).addEventListener("click", (e) => calculateCraftSchedule());
            document.getElementById("mat-2-"+i).addEventListener("click", (e) => calculateCraftSchedule());
        }
        for (let i = 1; i < 7; ++i) {
            document.getElementById("ing-choice-" + i ).addEventListener("input", (e) => calculateCraftSchedule());
        }
        for (const str of ["slow", "normal", "fast"]) {
            document.getElementById(str + "-atk-button").addEventListener("click", (e) => calculateCraftSchedule());
        }

        populateFields();
        decodeCraftPopulateFields(ing_url_tag);
    } catch (error) {
        console.log(error);
    }
    
    
}

function handleHashInput(hash_input, inputEvent) {
    orig_hash = location.hash;
    hash_input.classList.remove("is-invalid");
    try {
        decodeCraftPopulateFields(inputEvent.target.value);
    } catch {
        hash_input.classList.add("is-invalid");
        location.hash = orig_hash;
    }
}

function updateMaterials() {
    let recipeName = getValue("recipe-choice") ? getValue("recipe-choice") : "Potion";
    let levelRange = getValue("level-choice") ? getValue("level-choice") : "117-119";
    let recipe = expandRecipe(recipeMap.get(recipeName + "-" + levelRange));
    if (recipe !== undefined) {
        try{
            document.getElementById("mat-1").textContent = recipe.get("materials")[0].get("item").split(" ").slice(1).join(" ") + " Tier:";
            document.getElementById("mat-2").textContent = recipe.get("materials")[1].get("item").split(" ").slice(1).join(" ") + " Tier:"; 
        } catch (error){
            //e e e
        }
    }
    else {
        document.getElementById("mat-1").textContent = "Material 1 Tier:";
        document.getElementById("mat-2").textContent = "Material 2 Tier:";
    }
}

function toggleAtkSpd(buttonId) {
    let elem = document.getElementById(buttonId);
    if (elem.classList.contains("toggleOn")) {
        elem.classList.remove("toggleOn");
    } else {
        for (const button of atkSpdButtons) {
            document.getElementById(button).classList.remove("toggleOn");
        }
        elem.classList.add("toggleOn");
    }
}

let doCraftTask = null;

function calculateCraftSchedule(){
    console.log("Craft Schedule called");
    if (doCraftTask !== null) {
        clearTimeout(doCraftTask);
    }
    doCraftTask = setTimeout(function(){
        doCraftTask = null;
        calculateCraft();
        window.dispatchEvent(new Event('resize'));
    }, 250);
}

function calculateCraft() {
    //Make things display.
    for (let i of document.getElementsByClassName("hide-container-block")) {
        i.style.display = "block";
    }
    for (let i of document.getElementsByClassName("hide-container-grid")) {
        i.style.display = "grid";
    }
    //define the fields that will go into crafting the craft.
    let recipe = getValue("recipe-choice") === "" ? "Potion" : getValue("recipe-choice");
    let levelrange = getValue("level-choice") === "" ? "117-119" : getValue("level-choice"); 
    let maxlevel = levelrange.split("-").slice(1);
    recipe = expandRecipe(recipeMap.get(recipe+"-"+levelrange));
    let mat_tiers = [];
    for (i = 1; i < 3; i++) {
        for(j = 1; j < 4; j++) {
            let elem = document.getElementById("mat-" + i + "-" + j);
            if(elem.classList.contains("toggleOn")) {
                mat_tiers.push(j); //Tier is 1, 2, or 3.
                break;
            }
        }
        if (mat_tiers.length < i) { //default to t3
            mat_tiers.push(3);
            document.getElementById("mat-"+i+"-3").classList.add("toggleOn");
        } 
    }
    let ingreds = [];
    for (i = 1; i < 7; i++) {
        getValue("ing-choice-" + i) === "" ? ingreds.push(expandIngredient(ingMap.get("No Ingredient"))) : ingreds.push(expandIngredient(ingMap.get(getValue("ing-choice-" + i))));
    }
    let atkSpd = "NORMAL"; //default attack speed will be normal.
    for (const b of ["slow-atk-button", "normal-atk-button", "fast-atk-button"]) {
        button = document.getElementById(b);
        if (button.classList.contains("toggleOn")) {
            atkSpd = b.split("-")[0].toUpperCase();
        }
    }
    //create the craft
    player_craft = new Craft(recipe,mat_tiers,ingreds,atkSpd,"");

    let craft_str = encodeCraft(player_craft).toB64();
    location.hash = craft_str;
    setValue("hash-input", "CR-"+craft_str);
    player_craft.setHash(craft_str);
    console.log(player_craft);
    /*console.log(recipe)
    console.log(levelrange)
    console.log(mat_tiers)
    console.log(ingreds)*/

    document.getElementById("mat-1").textContent = recipe.get("materials")[0].get("item").split(" ").slice(1).join(" ") + " Tier:";
    document.getElementById("mat-2").textContent = recipe.get("materials")[1].get("item").split(" ").slice(1).join(" ") + " Tier:"; 
    
    //Display Recipe Stats
    displayRecipeStats(player_craft, "recipe-stats");

    //Display Craft Stats
    // displayCraftStats(player_craft, "craft-stats");
    let mock_item = player_craft.statMap;
    if (mock_item.get('category') === 'weapon') { apply_weapon_powders(mock_item) };
    displayExpandedItem(mock_item, "craft-stats");
    displayCraftedRollDistributions(player_craft, "craft-dist");

    //Display Ingredients' Stats
    for (let i = 1; i < 7; i++) {
        displayExpandedIngredient(player_craft.ingreds[i-1] , "ing-"+i+"-stats");
    }
    //Display Warnings - only ingred type warnings for now
    let warning_elem = document.getElementById("craft-warnings");
    warning_elem.textContent = ""; //refresh warnings
    warning_elem.classList.add("warning");
    let type = player_craft["recipe"].get("skill");
    for (const ingred of player_craft["ingreds"]) {
        if (!(ingred.get("skills").includes(type))) {
            let p = document.createElement("p");
            p.textContent = "WARNING: " + ingred.get("name") + " cannot be used for " + type.charAt(0) + type.substring(1).toLowerCase() +"!";
            warning_elem.appendChild(p);
        }
        if (ingred.get("lvl") > maxlevel) {
            let p = document.createElement("p");
            p.textContent = "WARNING: " + ingred.get("name") + " is too high level for level range " + levelrange +"!";
            warning_elem.appendChild(p);
        }
    }
    let missing_durability = player_craft.statMap.get("missingDurability");
    let missing_duration = player_craft.statMap.get("missingDuration");

    if (player_craft.statMap.get("category") === "consumable") {
        if (missing_duration) {
            let p = document.createElement("p");
            p.textContent = "WARNING: Recipe requires " + (-missing_duration) +" more duration to work!";
            warning_elem.appendChild(p);
        }
    }
    else if (missing_durability) {
        let p = document.createElement("p");
        p.textContent = "WARNING: Recipe requires " + (-missing_durability) +" more durability to work!";
        warning_elem.appendChild(p);
    }
}

function decodeCraftPopulateFields(ing_url_tag) {
    if (ing_url_tag) {
        if (ing_url_tag.startsWith("CR-")) {
            ing_url_tag = ing_url_tag.substring(3);
            location.hash = ing_url_tag;
        }
        const craft = decodeCraft({hash: ing_url_tag});

        for (let i = 0; i < 6; i ++ ) {
            const ing = craft.ingreds[i];
            if (ing.get("id") !== 4000) {
                setValue("ing-choice-"+(i+1), craft.ingreds[i].get("name"));
            }
        }

        const recipe = craft.recipe.get("name");
        const seperator_idx = recipe.search('-');
        const [recipe_name, recipe_level] = [recipe.substring(0, seperator_idx), recipe.substring(seperator_idx + 1)];

        setValue("recipe-choice", recipe_name);
        updateCraftedImage();
        setValue("level-choice", recipe_level);

        for (let i = 0; i < CRAFTER_ENC.NUM_MATS; ++i) {
            const matId = `mat-${i + 1}-${craft.mat_tiers[i]}`
            const matButton = document.getElementById(matId);
            if (!matButton.classList.contains("toggleOn")) {
                toggleMaterial(`mat-${i + 1}-${craft.mat_tiers[i]}`);
            }
        }

        const atkSpdId = CRAFTER_ENC.CRAFTED_ATK_SPD[craft.atkSpd];
        let button = document.getElementById(atkSpdButtons[atkSpdId]);
        if (!button.classList.contains("toggleOn")) {
            toggleAtkSpd(atkSpdButtons[atkSpdId]);
        }
        
        calculateCraft();
    }
}

function populateFields() {
    let recipe_list = document.getElementById("recipe-choices");
    for (const recipe of recipeTypes) {
        let el = document.createElement("option");
        el.value = recipe.charAt(0) + recipe.substring(1).toLowerCase();
        recipe_list.appendChild(el);
    }
    let level_list = document.getElementById("level-choices");
    for (const range of levelTypes) {
        let el = document.createElement("option");
        el.value = range;
        level_list.appendChild(el);
    }
    for (i = 1; i < 7; i++) {
        let ing_list = document.getElementById("ing-choices-"+i);
        for (const ing of ingList) {
            let el = document.createElement("option");
            el.value = ing;
            ing_list.appendChild(el);
        }
    }
}
/*
 *  Copies the CR Hash (CR-blahblahblah)
 */
function copyRecipeHash() {
    if (player_craft) {
        copyTextToClipboard("CR-"+location.hash.slice(1));
        document.getElementById("copy-hash-button").textContent = "Copied!";
    }
}

/* 
    Copies the link (hppeng-wynn.github.io/crafter/#blahblah)
*/
function copyRecipe() {
    if (player_craft) {
        copyTextToClipboard(ing_url_base+location.hash);
        document.getElementById("copy-button").textContent = "Copied!";
    }
}

/* Copy the link AND a display of all ingredients
*/
function shareRecipe() {
    if (player_craft) {
        let copyString = ing_url_base+location.hash + "\n";
        let name = player_craft.recipe.get("name").split("-");
        copyString += " > " + name[0] + " " + "Lv. " + name[1] + "-" + name[2] + " (" + player_craft.mat_tiers[0] + "\u272B, " + player_craft.mat_tiers[1] + "\u272B)\n";
        let names = [
            player_craft.ingreds[0].get("displayName"),
            player_craft.ingreds[1].get("displayName"),
            player_craft.ingreds[2].get("displayName"),
            player_craft.ingreds[3].get("displayName"),
            player_craft.ingreds[4].get("displayName"),
            player_craft.ingreds[5].get("displayName")
        ];
        //fancy justify code that doesn't work properly b/c most font isn't monospaced
        let buffer1 = Math.max(names[0].length,names[2].length,names[4].length);
        let buffer2 = Math.max(names[1].length,names[3].length,names[5].length);
        for (let i in names) {
            let name = names[i];
            let spaces;
            if (i % 2 == 0) { //buffer 1
                spaces = buffer1 - name.length;
            } else { //buffer 2
                spaces = buffer2 - name.length;
            }
            for (let j = 0; j < spaces; j ++) {
                if (j % 2 == 0) {
                    names[i]+="  ";
                } else {
                    names[i] = "  "+names[i];
                }
            }
        }
        copyString += " > [" + names[0] + " | " + names[1] + "\n";
        copyString += " >  " + names[2] + " | " + names[3] + "\n";
        copyString += " >  " + names[4] + " | " + names[5] + "]";  
        copyTextToClipboard(copyString);
        document.getElementById("share-button").textContent = "Copied!";
    } 
}
/* Toggles the entire material's buttons
*/
function toggleMaterial(buttonId) {
    let elem = document.getElementById(buttonId);
    let mat = buttonId.split("-")[1]
    if (!elem.classList.contains("toggleOn")) { //we turned on that button, now toggle the others off
        toggleButton(buttonId);
        for (i = 1; i < 4; i++) {
            if ("mat-" + mat + "-" + i !== buttonId) {
                document.getElementById("mat-" + mat + "-" + i).classList.remove("toggleOn");
            }
        }
    } else { //we turned off a button: do nothing
        toggleButton(buttonId);
    }
}

/* Updates the crafted icon. 
*/
function updateCraftedImage() {
    let input = document.getElementById("recipe-choice");
    if (all_types.includes(input.value)) {
        let img = document.getElementById("recipe-img");
        if (["potion", "scroll", "food"].includes(input.value.toLowerCase())) {
            img.style.backgroundImage = "url('../media/items/common.png')";
            img.style.backgroundSize = "500% 100%";
        } else {
            img.style.backgroundImage = "url('../media/items/" + (newIcons ? "new.png')" : "old.png')");
            img.style.backgroundSize = "1200% 100%";
        }
        img.style.backgroundPosition = itemBGPositions[input.value.toLowerCase()]
    }
}

/* Reset all fields
*/
function resetFields() {
    for (let i = 1; i < 3; i ++) {
        for (let j = 1; j < 4; j++) {
            document.getElementById("mat-"+i+"-"+j).classList.remove("toggleOn");
        }
    } 
    for (let i = 1; i < 7; i++) {
        setValue("ing-choice-"+i, "");
    }
    setValue("recipe-choice", "");
    setValue("level-choice", "");
    location.hash = "";
    calculateCraft();
}

(async function() {
    let load_promises = [ ingredient_loader.load_init() ];
    await Promise.all(load_promises);
    init_crafter();
})();

/** Displays the individual probabilities of each possible value of each rollable ID for a crafted item.
 * 
 * @param {String} craft Craft object
 * @param {String} parent_id the document id of the parent element
 */
function displayCraftedRollDistributions(craft, parent_id) {
    const parent = document.getElementById(parent_id);
    parent.textContent = "";
    const dists = [...(craft.statMap.get("rollDist") || new Map())]
        .filter(([id, d]) => pmfStats(d).min !== pmfStats(d).max);

    // the column wrapping the distributions (if any) is hidden together with it
    const dist_col = parent.closest(".dist-col");
    if (dists.length === 0) {
        parent.style.display = "none";
        if (dist_col) dist_col.style.display = "none";
        return;
    }
    parent.style.display = "block";
    if (dist_col) dist_col.style.display = "";

    parent.appendChild(make_elem("p", ["text-center", "m-auto", "mb-3", "text-decoration-underline", "title"],
        { textContent: "Roll Distributions" }));

    const grid = make_elem("div", [], {
        style: "display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.5rem;"
            + " white-space: nowrap; font-variant-numeric: tabular-nums;"
    });
    parent.appendChild(grid);

    const line = () => make_elem("p", [], { style: "margin: 0;" });

    for (const [id, d] of dists) {
        const reversed = reversedIDs.includes(id);
        const st = pmfStats(d);
        const styleFor = (v) => {
            if (v === 0) return null;
            return ((v > 0) !== reversed) ? "positive" : "negative";
        };
        const colored = (text, v) => {
            const b = make_elem("b", [], { textContent: text });
            const s = styleFor(v);
            if (s) b.classList.add(s);
            return b;
        };

        const card = make_elem("div", [], {
            style: "display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;"
                + " padding: 0.35rem 0.6rem; overflow-x: auto;"
                + " border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 0.25rem;"
        });
        const text_col = make_elem("div");

        const name_p = line();
        name_p.appendChild(make_elem("b", [], { textContent: (idPrefixes[id] || id).trim().replace(/:$/, "") + ":" }));

        const mean_p = line();
        mean_p.append(
            make_elem("b", [], { textContent: "Mean: " }),
            colored(st.mean.toFixed(2) + idSuffixes[id], st.mean)
        );

        const pdf_p = line(), cdf_p = line();
        text_col.append(name_p, mean_p, pdf_p, cdf_p);

        const toX = (s) => reversed ? -s : s;
        const best = reversed ? st.min : st.max;
        const slider = make_elem("input", [], {
            type: "range", id: id + "-craft-slider", step: 1,
            min: reversed ? -st.max : st.min,
            max: reversed ? -st.min : st.max,
            value: reversed ? -best : best
        });
        const textbox = make_elem("input", ["small-input"], {
            type: "text", id: id + "-craft-textbox", value: `${best}`
        });
        slider.style.display = "block";
        const input_col = make_elem("div");
        input_col.append(slider, textbox);

        card.append(text_col, input_col);
        grid.appendChild(card);

        const better_op = reversed ? "<=" : ">=";
        const update = (x) => {
            pdf_p.textContent = "";
            pdf_p.append(
                make_elem("b", [], { textContent: "Roll == " }),
                colored(x + idSuffixes[id], x),
                make_elem("b", [], { textContent: ": " + (pmfExact(d, x) * 100).toFixed(3) + "%" })
            );
            cdf_p.textContent = "";
            cdf_p.append(
                make_elem("b", [], { textContent: "Roll " + better_op + " " }),
                colored(x + idSuffixes[id], x),
                make_elem("b", [], { textContent: ": " + (pmfOrBetter(d, x, reversed) * 100).toFixed(3) + "%" })
            );
        };
        update(best);

        slider.addEventListener("change", (event) => {
            const x = toX(parseInt(event.target.value));
            textbox.value = `${x}`;
            update(x);
        });
        textbox.addEventListener("change", (event) => {
            let x = parseInt(event.target.value);
            if (isNaN(x)) x = best;
            x = Math.min(Math.max(x, st.min), st.max);
            event.target.value = `${x}`;
            slider.value = reversed ? -x : x;
            update(x);
        });
    }
}

/* Find ingredient roll distributions
*/
const CRAFT_ROLL_BASE_MAX = 100;

// Same scaling as craft.js uses for min/max
function scaleRoll(x, eff_mult) { return Math.floor(x * eff_mult + 1e-9); }

// Dense PMF {min, p[]} for one ingredient's roll of one ID
function ingredientRollPMF(min, max, eff_mult) {
    const N = CRAFT_ROLL_BASE_MAX;
    const counts = new Map();
    for (let b = 0; b <= N; b++) {
        // round-half-up of (min*N + (max-min)*b)/N in integer arithmetic
        const v = Math.floor((2 * (min * N + (max - min) * b) + N) / (2 * N));
        const s = scaleRoll(v, eff_mult);
        counts.set(s, (counts.get(s) || 0) + 1);
    }
    const lo = Math.min(...counts.keys()), hi = Math.max(...counts.keys());
    const p = new Array(hi - lo + 1).fill(0);
    for (const [v, c] of counts) p[v - lo] = c / (N + 1);
    return { min: lo, p };
}

function convolvePMF(a, b) {
    const p = new Array(a.p.length + b.p.length - 1).fill(0);
    for (let i = 0; i < a.p.length; i++) {
        if (a.p[i] === 0) continue;
        for (let j = 0; j < b.p.length; j++) p[i + j] += a.p[i] * b.p[j];
    }
    return { min: a.min + b.min, p };
}

function pmfStats(d) {
    let mean = 0;
    d.p.forEach((pr, i) => mean += pr * (d.min + i));
    return { mean, min: d.min, max: d.min + d.p.length - 1 };
}

// P(roll >= x), or P(roll <= x) for reversed IDs (spell costs), where lower is better. 
function pmfOrBetter(d, x, reversed) {
    let t = 0;
    d.p.forEach((pr, i) => { const v = d.min + i; if (reversed ? v <= x : v >= x) t += pr; });
    return t;
}

// P(roll == x)
function pmfExact(d, x) {
    const i = x - d.min;
    return (i >= 0 && i < d.p.length) ? d.p[i] : 0;
}