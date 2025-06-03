let aspect_inputs = [];
let aspect_agg_node;
const aspect_tiers = ["Legendary", "Fabled", "Mythic"] // @TODO(orgold): Move to constants file
const num_aspects = 5;

// HACK(@orgold): The autocomplete package doesn't have any nice API for dynamically
// populating the result list, therefore we must store the context themselves to avoid
// recreating them on any weapon input.
//
// If the weapon was kept as state somewhere along the way, we could have the data.src
// be a function that picks off that, but because we don't tend to store build state outside
// of computegraph we don't have that luxury.
let aspect_inputs_dropdowns_ctx = new Map(); // Map<className, autoCompleteJs>
let active_aspects = null; // Map<AspectName, AspecSpec>
let aspect_aliases = null; // Map<AspectAlias, AspectName>

/**
 * Populate the aspect autocomplete list dynamically based on the choice of weapon.
 *
 * Signature: AspectAutocompleteInitNode() => null
 */
class AspectAutocompleteInitNode extends ComputeNode {
    constructor(name, input_field) {
        super(name);
        this.input_field = input_field;
    }

    compute_func(input_map) {
        const active_class = input_map.get("player-class");
        if (active_class === null) return;

        active_aspects = aspect_map.get(active_class);
        const class_aspect_names = active_aspects.keys().toArray();

        aspect_aliases = new Map();
        // Basically ported from builder.js:add_tome_autocomplete
        // quite janky, push aliases to possible name list and swap upon click.
        // To add aliases to an aspect, add an "aliaes" list at the top level of the
        // aspect object in aspecst.json.
        //
        // ```js
        // {
        //   "displayName": "Aspect of ...",
        //   "aliases": ["Meteor AOE"],
        // },
        // {
        //   "displayName": "Aspect of ...",
        //   "aliases": ["Thunderstorm"],
        // }
        // ```
        for (const [display_name, aspect] of active_aspects) {
            if ("aliases" in aspect && aspect.aliases !== "NO_ALIAS") {
                for (const alias of aspect.aliases) {
                    class_aspect_names.push(alias);
                    aspect_aliases.set(alias, display_name); 
                }
            }
        }

        if (!aspect_inputs_dropdowns_ctx.has(this.name)) {
            const aspect_ac_cb = (v) => {
                if (aspect_aliases.has(v)) { v = aspect_aliases.get(v); }
                return v;
            }
            aspect_inputs_dropdowns_ctx.set(this.name, create_autocomplete(class_aspect_names, active_aspects, this.input_field, aspect_ac_cb));
        } else {
            // This is a janky way of manually editing the data of the inner to make dynamic autocomplete lists
            const autocomplete_ctx = aspect_inputs_dropdowns_ctx.get(this.name);
            autocomplete_ctx.data.src = class_aspect_names;
            autocomplete_ctx.resultItem.element = (item, data) => {
                item.classList.add(active_aspects.get(data.value).tier);
            }
        }
    }
}

/**
 * A node to validate and fetch aspects from a linked aspect input field
 *
 * Signature: AspectInputNode(input_field) => {spec: AspectSpec, class: PlayerClass}
 */
class AspectInputNode extends InputNode {
    compute_func(input_map) {
        let ret = {spec: none_aspect, class: input_map.get("player-class")};
        if (this.input_field.value === "" || active_aspects === null) {
            return ret;
        }

        const aspect = active_aspects.get(this.input_field.value);

        // Reset aspects when weapon changes - assumes aspect names are unique to each class.
        //
        // NOTE(@orgold): `document.activeElement` checks the input field is not in focus to 
        // not accidentally delete users' input while they're typing.
        if (!aspect && this.input_field !== document.activeElement) { 
            this.input_field.value = "";
        } else {
            ret.spec = aspect;
        }

        return ret;
    }
}

/**
 * Get a specific tier from the aspect given aspect.
 * defaults to the max tier.
 *
 * Signature: AspectInputNode(input_field) => Tuple[AspectTierSpec, number]
 */
class AspectTierInputNode extends InputNode {
    compute_func(input_map) {
        const aspect = input_map.get("aspect-spec").spec;
        if (!aspect || aspect.NONE) {
            this.input_field.value = "";
            return [none_aspect, 1];
        }

        const tier_num = this.input_field.value;
        if (tier_num == "" || tier_num <= 0 || tier_num > aspect.tiers.length) {
            this.input_field.value = aspect.tiers.length;
        }
        return [aspect, parseInt(this.input_field.value)];
    }
}


/**
 * Aggregate all aspects into a single array.
 * Validate aspects are unique and only 1 mythic aspect is in use.
 * The order of the array is irrelevant.
 *
 * Signature: AspectAggregateNode() => Array<AspectTierSpec> 
 */
class AspectAggregateNode extends ComputeNode {
    compute_func(input_map) {
        const aspects = [];
        let has_mythic = false;
        let previous_aspect_ids = new Set();
        
        for (const [i, field] of Object.entries(aspect_fields)) {
            let err = false;
            document.getElementById(field+"-choice").classList.remove("is-invalid");

            const aspect_tuple = input_map.get(field+"-tiered");

            const [aspect, _tier] = aspect_tuple;

            if (aspect.NONE) {
                aspects.push(aspect_tuple); 
                continue;
            }

            // Validate aspects are unique
            if (previous_aspect_ids.has(aspect.id)) {
                err = true;
            }
            previous_aspect_ids.add(aspect.id);

            // Validate single mythic aspect
            if (aspect.tier === "Mythic") {
                if (has_mythic) {
                    err = true;
                } else {
                    has_mythic = true;
                }
            }

            if (err) {
                document.getElementById(field+"-choice").classList.add("is-invalid");
            }

            aspects.push(aspect_tuple);
        }
        return aspects;
    }
}

function generate_aspect_tooltip(tooltip_elem, aspect, tier) {
    const title = make_elem("p", [aspect.tier, "scaled-font", "mx-1", "my-1"]);
    const body = make_elem("p", ["mc-gray", "scaled-font", "text-wrap", "mx-1", "my-1"]);
    title.innerHTML = aspect.displayName;
    body.innerHTML = aspect.tiers[tier - 1].description;
    tooltip_elem.appendChild(title);
    tooltip_elem.appendChild(body);
}

function remove_tooltip(tooltip_elem) {
    tooltip_elem.remove();
    return null;
}

/*
 * Renders the tooltips for the aspects.
 * Signature AspectRenderNode(name, image_div, trigger, bounding_elem) => None
 *
 * @param {name} the name of the node
 * @param {trigger} the trigger div
 * @param {bounding_elem} the box bounding (loosely) the elements.
 *
 * Notice that we're using the `on{event}` property instead of addEventListener to overwrite the listener
 * function every time an aspect update occurs.
 *
 * TODO(@orgold): Factor this into a more generic function and add to tomes.
 */
class AspectRenderNode extends ComputeNode {
    constructor(name, trigger, bounding_elem) {
        super(name);
        this.trigger = trigger;
        this.bounding_elem = bounding_elem;
    }

    compute_func(input_map) {
        const [aspect, tier] = input_map.get("aspect-tiered-spec");

        // Clean up listeners
        if (aspect.NONE) {
            this.trigger.onmouseover = undefined;
            this.trigger.onmouseout = undefined;
            this.trigger.onclick = undefined;
            return;
        };

        let tooltip_elem = null;

        // Further comments at js/builder/atrree.js:render-AT
        if (!isMobile) {
            this.trigger.onmouseover = (e) => {
                tooltip_elem = make_elem("div", ["rounded-bottom", "dark-4", "border", "dark-shadow", "text-start"], {
                    style: {
                        position: "absolute",
                        zIndex: "100",
                        top: (this.trigger.getBoundingClientRect().top + window.pageYOffset + 50) + "px",
                        left: this.trigger.getBoundingClientRect().left + "px",
                        width: (this.bounding_elem.getBoundingClientRect().width / 2 * 0.95) + "px"
                    }
                });
                this.trigger.appendChild(tooltip_elem);
                generate_aspect_tooltip(tooltip_elem, aspect, tier);
            };

            this.trigger.onmouseout = (e) => {
                tooltip_elem = remove_tooltip(tooltip_elem);
            };

        } else {
            this.trigger.onclick = (e) => {
                let bg = make_elem("div", [], {
                    style: {
                        position: "fixed",
                        "z-index": 10000,
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        "background-color": "rgba(0, 0, 0, 0.6)",
                        "padding-top": "10vh",
                        "padding-left": "2.5vw",
                        "user-select": "none"
                    }
                });
                bg.onclick = function(e) {
                    if (e.target !== this) {return;}
                    bg.remove();
                };

                tooltip_elem = make_elem("div", ["rounded-bottom", "dark-4", "border", "dark-shadow", "text-start"], {
                    style: {
                        max_height: "80vh",
                        width: "95vw",
                        "overflow-y": "scroll"
                    }
                });
                document.body.appendChild(bg);
                bg.appendChild(tooltip_elem);
                generate_aspect_tooltip(tooltip_elem, aspect, tier);
            };
        }
    }
}

/**
 * Display the image and color of the aspect based on it's tier.
 *
 * Signature: AspectInputDisplayNode(name, input_field, image_div) => null
 */
class AspectInputDisplayNode extends ComputeNode {
    constructor(name, input_field, image_div) {
        super(name);
        this.input_field = input_field;
        this.image_div = image_div;
    }

    compute_func(input_map) {
        const aspect = input_map.get("aspect-spec").spec;
        this.input_field.classList.remove(...aspect_tiers); 
        this.image_div.classList.remove(...["aspect-image-Assassin", "aspect-image-Mage", "aspect-image-Warrior", "aspect-image-Shaman", "aspect-image-Archer", "aspect-image-None", "Legendary-shadow", "Fabled-shadow", "Mythic-shadow"]);
        if (aspect && !aspect.NONE) { 
            this.input_field.classList.add(aspect.tier); 
            const player_class = input_map.get("aspect-spec").class || "None";
            this.image_div.classList.add("aspect-image-" + player_class);
            this.image_div.classList.add(aspect.tier + "-shadow");

        } else {
            this.image_div.classList.add("aspect-image-None");
        }
    }
}
