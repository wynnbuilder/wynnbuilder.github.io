/*
 * File for display commands specific to the single item page.
 */

/** Displays the ID costs of an item
 * 
 * @param {String} elemID - the id of the parent element.
 * @param {Map} item - the statMap of an item. 
 */
function displayIDCosts(elemID, item) {
    let parent_elem = document.getElementById(elemID);
    let tier = item.get("tier");
    if ( (item.has("fixID") && item.get("fixID")) || ["Normal","Crafted","Custom","none", " ",].includes(item.get("tier"))) {
        return;
    } else {
        /** Returns the number of inventory slots minimum an amount of emeralds would take up + the configuration of doing so.
         * Returns an array of [invSpace, E, EB, LE, Stx LE]
         * 
         * @param {number} ems - the total numerical value of emeralds to compact.
         */
        function emsToInvSpace(ems) {
            let stx = Math.floor(ems/262144);
            ems -= stx*4096*64;
            let LE = Math.floor(ems/4096);
            ems -= LE*4096;
            let EB = Math.floor(ems/64);
            ems -= EB*64;
            let e = ems;
            return [ stx + Math.ceil(LE/64) + Math.ceil(EB/64) + Math.ceil(e/64) , e, EB, LE, stx];
        }
        /**
         * 
         * @param {String} tier - item tier
         * @param {Number} lvl - item level 
         */
        function getIDCost(tier, lvl) {
            switch (tier) {
                case "Unique":
                    return Math.round(0.5*lvl + 3);
                case "Rare":
                    return Math.round(1.2*lvl + 8);
                case "Legendary":
                    return Math.round(4.5*lvl + 12);
                case "Fabled":
                    return Math.round(12*lvl + 26);
                case "Mythic":
                    return Math.round(18*lvl + 90);
                case "Set":
                    return Math.round(1.5*lvl + 8)
                default:
                    return -1;
            }
        }

        parent_elem.style = "display: visible";
        let lvl = item.get("lvl");
        if (typeof(lvl) === "string") { lvl = parseFloat(lvl); }
        
        let title_elem = make_elem("p", ["text-center", item.get("tier")], {textContent: "Identification costs"});
        parent_elem.appendChild(title_elem);

        let grid_item = make_elem("div", ["row", "p-2", "justify-content-center"]);
        parent_elem.appendChild(grid_item);

        let IDcost = getIDCost(tier, lvl);
        let initIDcost = IDcost;
        let invSpace = emsToInvSpace(IDcost);
        let rerolls = 0;

        while(invSpace[0] <= 28 && IDcost > 0) {
            let container = make_elem("div", ["container", "rounded", "col-lg-3", "col-sm-12", "scaled-font", "border", "border-1", "border-dark", "dark-shadow", "p-3", "m-1"]);
            let container_title = make_elem("p", ["text-center", "text-decoration-underline"], {
                style: {color: "white"},
                textContent: rerolls == 0 ? "Initial ID: " : `Reroll to [${rerolls + 1}]: `,
            });

            let total_cost_container = make_elem("p", []);
            let total_cost_number = make_elem("b", ["Set"], {textContent: `${IDcost} `});
            let total_cost_suffix = make_elem("b" , [], {textContent: "Emeralds"});
            total_cost_container.append(total_cost_number, total_cost_suffix);

            container.append(container_title, total_cost_container, make_elem("hr", []));

            let classes = ["", "emerald", "emerald-block", "liquid-emerald", "liquid-emerald-stack"];
            let esuffixes = ["", "Emeralds", "EB", "LE", "LE Stacks"];
            for (let i = 4; i > 0; i--) {
                if (invSpace[i] == 0) continue;
                let n_container = make_elem("div", ["row", "justify-content-start", "my-2"]);
                let img = make_elem("div", ["col-2", classes[i]]);
                let n_number = make_elem("div", ["col-2", "Set"], {textContent: invSpace[i]});
                let n_suffix = make_elem("div", ["col-8"], {textContent: esuffixes[i]});
                n_container.append(img, n_number, n_suffix);
                container.appendChild(n_container);
            }

            grid_item.appendChild(container);
            
            rerolls += 1;
            IDcost = Math.round(initIDcost * (5 ** rerolls));
            invSpace = emsToInvSpace(IDcost);
        }
    }
}

function makeInfoRow(title, value) {
    let row = make_elem("div", ["row", "rounded", "scaled-font", "border", "border-1", "border-dark", "dark-shadow", "p-1", "m-1", "text-capitalize", "justify-content-start"]);
    row.appendChild(make_elem("span", ["col-4", "col-lg-2"], {textContent: title}));
    row.appendChild(make_elem("span", ["col"], {textContent: value}));
    return row;
}
/** Displays Additional Info for 
 * 
 * @param {String} elemID - the parent element's id 
 * @param {Map} item - the statMap of the item
 * @returns 
 */
function displayAdditionalInfo(elemID, item) {
    let parent_elem = document.getElementById(elemID);

    let title_elem = make_elem("p", ["text-center", item.get("tier")], {textContent: "Additional Info"});
    parent_elem.appendChild(title_elem);

    let item_clone;
    if (itemMap) {
        item_clone = itemMap.get(item.get("displayName"));
    }
    else if (ingMap) {
        item_clone = ingMap.get(item.get("displayName"));
    }

    if (item_clone.droppedBy) {
        // For some reason, sometimes the metadata for coords is stored as an array or the droppedBy array has duplicate entries
        dropMap = new Map();
        for (dropData of item_clone.droppedBy) {
            if (dropMap.has(dropData.name) && dropData.coords) {
                if (Array.isArray(dropData.coords[0])) {
                    for (subDrop of dropData.coords) {
                        dropMap.get(dropData.name).push(subDrop);
                    }
                }
                else {
                    dropMap.get(dropData.name).push(dropData.coords);
                }
            }
            else if (dropData.coords) {
                if (Array.isArray(dropData.coords[0])) {
                    for (subDrop of dropData.coords) {
                        dropMap.set(dropData.name, [subDrop]);
                    }
                }
                else {
                    dropMap.set(dropData.name, [dropData.coords]);
                }
            }
            else {
                dropMap.set(dropData.name, []);
            }
        }
        let dropDisplay = make_elem("div", ["row", "rounded", "scaled-font", "border", "border-1", "border-dark", "dark-shadow", "p-1", "m-1", "text-capitalize", "justify-content-start"]);
        dropDisplay.appendChild(make_elem("b", ["text-center", "text-decoration-underline"], {textContent: "Dropped By"}));

        let list = make_elem("ul", [], {});
        list.style.cssText = "padding: 0; margin: 0; list-style: none; width: 100%;";

        for (const [name, coords] of dropMap) {
            let item = make_elem("li", [], {});
            item.style.cssText = "border-bottom: 1px solid #ccc; padding: 0.25rem 0.5rem;";

            item.appendChild(make_elem("b", [], {textContent: name}));

            if (coords.length > 0) {
                let coordList = make_elem("ul", [], {});
                coordList.style.cssText = "display: flex; flex-wrap: wrap; padding: 0; margin: 0; list-style: none;";

                for (coord of coords) {
                    let coordItem = make_elem("li", [], {textContent: "[" + coord[0] + ", " + coord[1] + ", " + coord[2] + "]"});
                    coordItem.style.cssText = "padding: 0.5rem;";
                    coordList.appendChild(coordItem);
                }
                item.appendChild(coordList);
            }

            list.appendChild(item);
        }

        dropDisplay.appendChild(list);
        parent_elem.appendChild(dropDisplay);
    }
    else if(item_clone.dropInfo === undefined) {
        parent_elem.appendChild(makeInfoRow("Drop Type:", item.has("drop") ? item.get("drop") : "No drop metadata found."));
    } else {
        parent_elem.appendChild(makeInfoRow("Drops From:", item_clone.dropInfo.name));
        if(item_clone.dropInfo.type !== undefined) {
            parent_elem.appendChild(makeInfoRow("Type:", item_clone.dropInfo.type));
        }
        if(item_clone.dropInfo.coordinates !== undefined) {
            parent_elem.appendChild(makeInfoRow("Coordinates:", `(${item_clone.dropInfo.coordinates})`));
        }
    }
}


/** Computes the probability distribution for the identification
 * 
 * @param {String} id - 
 * @param {Number} base - base id
 * @param {Number} ampTier - amplifier tier in [0, 4]
 * @returns {Object} { values, counts, totalRolls, isReversed, isPositive }
 */
function computeIDDistribution(id, base, ampTier = 0) {
    let isReversed = reversedIDs.includes(id);
    let isPositive = (base > 0) !== isReversed;

    let minRollHundredths = isPositive ? 30 : 70;
    let maxRollHundredths = 130;
    let totalRolls = maxRollHundredths - minRollHundredths + 1;

    let rollCounts = new Map();

    for (let rInt = minRollHundredths; rInt <= maxRollHundredths; rInt++) {
        let r = rInt / 100;
        let ampedRoll = r;
        if (isPositive && ampTier > 0) {
            let rawAmped = r + (1.30 - r) * (0.05 * ampTier);
            ampedRoll = Math.round(rawAmped * 100) / 100;
        }

        let finalVal = Math.round(ampedRoll * base);
        if (Object.is(finalVal, -0)) finalVal = 0;

        rollCounts.set(finalVal, (rollCounts.get(finalVal) || 0) + 1);
    }

    let values = Array.from(rollCounts.keys());
    if (isReversed) {
        values.sort((a, b) => b - a); // Higher number is worse, lower number is better
    } else {
        values.sort((a, b) => a - b); // Lower number is worse, higher number is better
    }

    return {
        values,
        counts: rollCounts,
        totalRolls,
        isReversed,
        isPositive
    };
}

/** pdf/cdf display for the specified id
 * 
 * @param {String} id - 
 * @param {Number} val - currently selected id value
 * @param {Object} dist - object from computeIDDistribution
 */
function renderIDProbabilities(id, val, dist) {
    let idx = dist.values.indexOf(val);
    if (idx === -1) idx = 0;

    let count = dist.counts.get(val) || 0;
    let pdf = ((count / dist.totalRolls) * 100).toFixed(3);

    let betterCount = 0;
    for (let i = idx; i < dist.values.length; i++) {
        betterCount += dist.counts.get(dist.values[i]) || 0;
    }
    let cdf = ((betterCount / dist.totalRolls) * 100).toFixed(3);

    let pdf_p = document.getElementById(id + "-pdf");

    if (pdf_p) {
        pdf_p.innerHTML = "";

        let b1 = document.createElement("b");
        b1.textContent = "Roll exactly ";

        let b2 = document.createElement("b");
        b2.textContent = val + idSuffixes[id];


        if ((val > 0) !== dist.isReversed) {
            b2.classList.add("positive");
        } else {
            b2.classList.add("negative");
        }
        let b3 = document.createElement("b");
        b3.textContent = ": " + pdf + "%";

        pdf_p.append(b1, b2, b3);
    }

    let cdf_p = document.getElementById(id + "-cdf");
    if (cdf_p) {
        cdf_p.innerHTML = "";
        let b1 = document.createElement("b");
        b1.textContent = "Roll ";

        let b2 = document.createElement("b");
        b2.textContent = val + idSuffixes[id];

        if ((val > 0) !== dist.isReversed) {
            b2.classList.add("positive");
        } else {
            b2.classList.add("negative");
        }
        let b3 = document.createElement("b");
        b3.textContent = " or better: " + cdf + "%";

        cdf_p.append(b1, b2, b3);
    }
}

/** Displays the individual probabilities of each possible value of each rollable ID for this item.
 * 
 * @param {String} parent_id the document id of the parent element
 * @param {String} item expandedItem object
 * @param {Number} amp the level of corkian amplifier used. 0 means no amp, 1 means Corkian Amplifier I, etc. [0,4]
 */
function displayIDProbabilities(parent_id, item, amp) {
    if (item.has("fixID") && item.get("fixID")) {return}
    let parent_elem = document.getElementById(parent_id);
    parent_elem.style.display = "";
    parent_elem.innerHTML = "";
    let title_elem = make_elem("p", ["text-center", "m-auto", "mb-3", "text-decoration-underline", "title"], {textContent: "Identification Probabilities", id: "ID_PROB_TITLE"});
    parent_elem.appendChild(title_elem);
    
    let disclaimer_elem = make_elem("p", [], {
        textContent: "The slider only allows valid achievable rolls"
    });

    parent_elem.appendChild(disclaimer_elem);

    let amp_row = make_elem("p", ["col"], {id: "amp_row"});
    amp_row.appendChild(make_elem("b", [], {textContent: "Corkian Amplifier: "}));

    for (let i = 1; i < 5; i++) {
        let amp_btn = document.createElement("button");
        amp_btn.id = `cork_amp_${i}`;
        amp_btn.textContent = ROMAN_NUMERAL_MAP.get(i);
        amp_row.appendChild(amp_btn);
        amp_btn.addEventListener("click", () => {toggleAmps(i)});
    }
    parent_elem.appendChild(amp_row);
    
    amp = parseInt(amp, 10) || 0;
    if (amp !== 0) {toggleButton("cork_amp_" + amp)}
    
    let item_name = item.get("displayName");

    let table_elem = document.createElement("table");
    parent_elem.appendChild(table_elem);
    for (const [id, val] of Object.entries(itemMap.get(item_name))) {
        if (nonRolledIDs.includes(id) || val?.static === true) {
            continue;
        }
        if (rolledIDs.includes(id)) {
            let numVal = typeof val === "object" && val !== null ? val.raw : val;
            if (typeof numVal !== "number" || numVal === 0) { continue; }
            if (!item.get("maxRolls") || !item.get("maxRolls").get(id)) { continue; }

            let dist = computeIDDistribution(id, numVal, amp);
            if (dist.values.length === 0) { continue; }

            let worstVal = dist.values[0];
            let bestVal = dist.values[dist.values.length - 1];

            let row_title = document.createElement("tr");
            let title_left = document.createElement("td");
            let left_val_title = document.createElement("b");
            let left_val_elem = document.createElement("b");
            title_left.style.textAlign = "left";
            left_val_title.textContent = idPrefixes[id] + "Base ";
            left_val_elem.textContent = numVal + idSuffixes[id];
            if ((numVal > 0) !== dist.isReversed) {
                left_val_elem.classList.add("positive");
            } else {
                left_val_elem.classList.add("negative");
            }
            title_left.append(left_val_title, left_val_elem);
            row_title.appendChild(title_left);

            let title_right = document.createElement("td");
            let title_right_text = document.createElement("b");
            title_right.style.textAlign = "left";
            title_right_text.textContent = "[ " + worstVal + idSuffixes[id] + ", " + bestVal + idSuffixes[id] + " ]";
            if ((numVal > 0) !== dist.isReversed) {
                title_right_text.classList.add("positive");
            } else {
                title_right_text.classList.add("negative");
            }
            title_right.appendChild(title_right_text);

            let title_input = document.createElement("td");
            let title_input_slider = document.createElement("input");
            title_input_slider.type = "range";
            title_input_slider.id = id + "-slider";
            title_input_slider.step = "1";
            title_input_slider.min = "0";
            title_input_slider.max = `${dist.values.length - 1}`;
            title_input_slider.value = `${dist.values.length - 1}`; // Default to best roll

            let title_input_textbox = document.createElement("input");
            title_input_textbox.type = "text";
            title_input_textbox.value = `${bestVal}`;
            title_input_textbox.id = id + "-textbox";
            title_input_textbox.classList.add("small-input");
            title_input.appendChild(title_input_slider);
            title_input.appendChild(title_input_textbox);
            
            row_title.appendChild(title_left);
            row_title.appendChild(title_right);
            row_title.appendChild(title_input);

            let row_chances = document.createElement("tr");
            let chance_cdf = document.createElement("td");
            let chance_pdf = document.createElement("td");
            let cdf_p = document.createElement("p");
            cdf_p.id = id+"-cdf";
            let pdf_p = document.createElement("p");
            pdf_p.id = id+"-pdf";

            chance_cdf.appendChild(cdf_p);
            chance_pdf.appendChild(pdf_p);
            row_chances.appendChild(chance_cdf);
            row_chances.appendChild(chance_pdf);

            table_elem.appendChild(row_title);
            table_elem.appendChild(row_chances);

            renderIDProbabilities(id, bestVal, dist);

            // noob function
            function handleSliderUpdate(event) {
                let idx = parseInt(event.target.value, 10);
                if (isNaN(idx) || idx < 0) idx = 0;
                if (idx >= dist.values.length) idx = dist.values.length - 1;
                let selectedVal = dist.values[idx];
                title_input_textbox.value = `${selectedVal}`;
                renderIDProbabilities(id, selectedVal, dist);
            }

            title_input_slider.addEventListener("input", handleSliderUpdate);
            title_input_slider.addEventListener("change", handleSliderUpdate);

            title_input_textbox.addEventListener("change", (event) => {
                let inputNum = parseInt(event.target.value, 10);
                let closestIdx = dist.values.length - 1;
                if (!isNaN(inputNum)) {
                    let minDiff = Infinity;
                    for (let i = 0; i < dist.values.length; i++) {
                        let diff = Math.abs(dist.values[i] - inputNum);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestIdx = i;
                        }
                    }
                }
                title_input_slider.value = `${closestIdx}`;
                title_input_textbox.value = `${dist.values[closestIdx]}`;
                renderIDProbabilities(id, dist.values[closestIdx], dist);
            });
        }
    }
}

