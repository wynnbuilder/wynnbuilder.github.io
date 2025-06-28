let player_build;
let build_powders;

function getItemNameFromID(id) { return idMap.get(id); }
function getTomeNameFromID(id) {
    let res = tomeIDMap.get(id);
    if (res === undefined) { console.log('WARN: Deleting unrecognized tome, id='+id); return ""; }
    return res;
}

function parsePowdering(powder_info) {
    // TODO: Make this run in linear instead of quadratic time... ew
    let powdering = [];
    for (let i = 0; i < 5; ++i) {
        let powders = "";
        let n_blocks = Base64.toInt(powder_info.charAt(0));
        // console.log(n_blocks + " blocks");
        powder_info = powder_info.slice(1);
        for (let j = 0; j < n_blocks; ++j) {
            let block = powder_info.slice(0,5);
            let six_powders = Base64.toInt(block);
            for (let k = 0; k < 6 && six_powders != 0; ++k) {
                powders += powderNames.get(decodePowderIdx((six_powders & 0x1f) - 1, 6));
                six_powders >>>= 5;
            }
            powder_info = powder_info.slice(5);
        }
        powdering[i] = powders;
    }
    return [powdering, powder_info];
}

let atree_data = null;

/**
 * Get the data version from the search parameters of the URL.
 * Should only be called if the encoding version is >= 8.
 */
function get_data_version_legacy() {
    // parse query parameters
    // https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
    const url_params = new URLSearchParams(window.location.search);
    const version_id = url_params.get('v');
    let wynn_version = parseInt(version_id); // Declared in load_item.js
    if (isNaN(wynn_version) || wynn_version > WYNN_VERSION_LATEST || wynn_version < 0) {
        // TODO: maybe make the NAN try to use the human readable version?
        // NOTE: Failing silently... do we want to raise a loud error?
        console.log("Explicit version not found or invalid, using latest version");
        wynn_version = WYNN_VERSION_LATEST;
    }
    else {
        console.log(`Build link for wynn version ${wynn_version} (${wynn_version_names[wynn_version]})`);
    }
    return wynn_version;
}

async function load_older_version() {
    const update_msg = 'This build was created in an older version of wynncraft '
                + `(${wynn_version_names[wynn_version_id]} < ${wynn_version_names[WYNN_VERSION_LATEST]}). `
                + 'Would you like to update to the latest version? Updating may break the build and ability tree.';

    const decoding_version = wynn_version_id;
    // Upgrade the build to the latest version
    if (confirm(update_msg)) {
        wynn_version_id = WYNN_VERSION_LATEST;
    }

    const version_name = wynn_version_names[wynn_version_id];
    const decoding_version_name = wynn_version_names[decoding_version];
    assert(decoding_version <= wynn_version_id, "decoding version cannot be larger than the encoding version.");
    const load_promises = [ 
        load_atree_data(version_name),
        load_major_id_data(version_name),
        item_loader.load_old_version(version_name),
        ingredient_loader.load_old_version(version_name),
        tome_loader.load_old_version(version_name),
        aspect_loader.load_old_version(version_name),
        load_encoding_constants(version_name, decoding_version_name)
    ];
    console.log("Loading old version data...", version_name)
    await Promise.all(load_promises);
}

/*
 * Populate fields based on url, and calculate build.
 * TODO: THIS CODE IS GOD AWFUL result of being lazy
 * fix all the slice() and break into functions or do something about it... its inefficient, ugly and error prone
 */
async function parse_hash_legacy() {
    const url_tag = window.location.hash.slice(1);

    if (!url_tag) {
        await load_latest_version();
        return;
    }
    //default values
    let equipment = [null, null, null, null, null, null, null, null, null];
    let tomes = [null, null, null, null, null, null, null, null];
    let powdering = ["", "", "", "", ""];
    let info = url_tag.split("_");
    let version = info[0];
    // Whether skillpoints are manually updated. True if they should be set to something other than default values
    let save_skp = false;
    let skillpoints = [0, 0, 0, 0, 0];
    let level = 106;

    let version_number = parseInt(version);
    let data_str = info[1];

    if (version_number >= 8) {
        wynn_version_id = get_data_version_legacy();
    } else {
        // Change the default to oldest. (A time before v8)
        wynn_version_id = 0;
    }

    // the deal with this is because old versions should default to 0 (oldest wynn item version), and v8+ defaults to latest.
    // its ugly... but i think this is the behavior we want...
    if (wynn_version_id != WYNN_VERSION_LATEST) {
        await load_older_version();
    } else if (wynn_version_id == WYNN_VERSION_LATEST) {
        await load_latest_version();
    }

    //equipment (items)
    // TODO: use filters
    if (version_number < 4) {
        let equipments = info[1];
        for (let i = 0; i < 9; ++i ) {
            let equipment_str = equipments.slice(i*3,i*3+3);
            equipment[i] = getItemNameFromID(Base64.toInt(equipment_str));
        }
        data_str = equipments.slice(27);
    }
    else if (version_number == 4) { 
        let info_str = data_str;
        let start_idx = 0;
        for (let i = 0; i < 9; ++i ) {
            if (info_str.charAt(start_idx) === "-") {
                equipment[i] = "CR-"+info_str.slice(start_idx+1, start_idx+18);
                start_idx += 18;
            }
            else {
                let equipment_str = info_str.slice(start_idx, start_idx+3);
                equipment[i] = getItemNameFromID(Base64.toInt(equipment_str));
                start_idx += 3;
            }
        }
        data_str = info_str.slice(start_idx);
    }
    else if (version_number <= 11) {
        let info_str = data_str;
        let start_idx = 0;
        for (let i = 0; i < 9; ++i ) {
            if (info_str.slice(start_idx,start_idx+3) === "CR-") {
                equipment[i] = info_str.slice(start_idx, start_idx+20);
                start_idx += 20;
            } else if (info_str.slice(start_idx+3,start_idx+6) === "CI-") {
                let len = Base64.toInt(info_str.slice(start_idx,start_idx+3));
                equipment[i] = info_str.slice(start_idx+3,start_idx+3+len);
                start_idx += (3+len);
            } else {
                let equipment_str = info_str.slice(start_idx, start_idx+3);
                equipment[i] = getItemNameFromID(Base64.toInt(equipment_str));
                start_idx += 3;
            }
        }
        data_str = info_str.slice(start_idx);
    }
    //constant in all versions
    for (let i in equipment) {
        setValue(equipment_inputs[i], equipment[i]);
    }

    //level, skill point assignments, and powdering
    if (version_number == 0) {
        // do nothing! lol
    } else if (version_number == 1) {
        let powder_info = data_str;
        let res = parsePowdering(powder_info);
        powdering = res[0];
    } else if (version_number == 2) {
        save_skp = true;
        let skillpoint_info = data_str.slice(0, 10);
        for (let i = 0; i < 5; ++i ) {
            skillpoints[i] = Base64.toIntSigned(skillpoint_info.slice(i*2,i*2+2));
        }

        let powder_info = data_str.slice(10);
        let res = parsePowdering(powder_info);
        powdering = res[0];
    } else if (version_number <= 11){
        level = Base64.toInt(data_str.slice(10,12));
        setValue("level-choice",level);
        save_skp = true;
        let skillpoint_info = data_str.slice(0, 10);
        for (let i = 0; i < 5; ++i ) {
            skillpoints[i] = Base64.toIntSigned(skillpoint_info.slice(i*2,i*2+2));
        }

        let powder_info = data_str.slice(12);

        let res = parsePowdering(powder_info);
        powdering = res[0];
        data_str = res[1];
    }
    // Tomes.
    if (version_number >= 6) {
        //tome values do not appear in anything before v6.
        if (version_number < 8) {
            for (let i = 0; i < 7; ++i) {
                let tome_str = data_str.charAt(i);
                let tome_name = getTomeNameFromID(Base64.toInt(tome_str));
                setValue(tomeInputs[i], tome_name);
            }
            data_str = data_str.slice(7);
        }
        else {
            // 2chr tome encoding to allow for more tomes.

            // Lootrun tome was added in v9.
            let num_tomes = 7;
            if (version_number <= 8) {
                num_tomes = 7;
            }
            //Marathon, Mysticism, & Expertise tomes were added in v10.
            else if (version_number <= 9) {
                num_tomes = 8;
            }
            else {
                num_tomes = 14;
            }
            for (let i = 0; i < num_tomes; ++i) {
                let tome_str = data_str.slice(2*i, 2*i+2);
                let tome_name = getTomeNameFromID(Base64.toInt(tome_str));
                setValue(tomeInputs[i], tome_name);
            }
            data_str = data_str.slice(num_tomes*2);
        }
    }

    // Aspects.
    if (version_number >= 11) {
        let item_type;
        if (equipment[8].slice(0, 3) == "CI-") { item_type = getCustomFromHash(equipment[8]).statMap.get("type"); }
        else if (equipment[8].slice(0, 3) == "CR-") { item_type = getCraftFromHash(equipment[8]).statMap.get("type"); }
        else { item = itemMap.get(equipment[8]).type };

        const player_class = wep_to_class.get(item_type);
        const class_aspects_by_id = aspect_id_map.get(player_class);
        for (let i = 0; i < num_aspects; ++i) {
            const aspect_id = Base64.toInt(data_str.slice(3*i, 3*i + 2));
            const aspect_tier = Base64.toInt(data_str.slice(3*i+2, 3*i + 3));
            if (aspect_id !== none_aspect.id) {
                setValue(aspectTierInputs[i], aspect_tier);
                setValue(aspectInputs[i], class_aspects_by_id.get(aspect_id).displayName);
            } 
        }
        data_str = data_str.slice(num_aspects*3);
    }

    if (version_number >= 7) {
        // ugly af. only works since its the last thing. will be fixed with binary decode
        atree_data = new BitVector(data_str);
    }
    else {
        atree_data = null;
    }

    for (let i in powder_inputs) {
        setValue(powder_inputs[i], powdering[i]);
    }
    for (let i in skillpoints) {
        setValue(skp_order[i] + "-skp", skillpoints[i]);
    }

    // skp_deltas is used in binary encoding to denote
    // the changes for each skillpoint, so it's necessary
    // to pass "null" in it's place because of the current builder graph
    // implementation.
    return [save_skp, null];
}

function encode_tomes(tomes) {
    const tomes_vec = new EncodingBitVector(0, 0);
    if (tomes.every(t => t.statMap.has("NONE"))) {
        tomes_vec.append_flag("TOME_FLAG", "NONE"); 
    } else {
        tomes_vec.append_flag("TOME_FLAG", "HAS_TOME"); 
        for (const tome of tomes) {
            if (tome.statMap.get("NONE")) {
                tomes_vec.append_flag("TOME_KIND", "NONE")
            } else {
                tomes_vec.append_flag("TOME_KIND", "USED")
                tomes_vec.append(tome.statMap.get("id"), ENC.TOME_ID_BITLEN);
            }
        }
    }
    return tomes_vec;
}

/**
 * Collect identical powders, keeping their original order in place.
 *
 * - T6 E6 T6 E6       => T6 T6 E6 E6
 * - T6 T4 T6 T4       => T6 T6 T4 T4
 * - F6 A6 F6 T6 T6 A6 => F6 F6 A6 A6 T6 T6
 */
function collect_powders(powders) {
    counting_map = new Map() // Map preserves insertion order
    for (const powder of powders) {
        if (counting_map.get(powder) === undefined) {
            counting_map.set(powder, 1);
        } else {
            counting_map.set(powder, counting_map.get(powder) + 1);
        }
    }
    return counting_map;
}


function encode_powders(equipment_vec, powders, version) {
    if (powders.length === 0) {
        equipment_vec.append_flag("EQUIPMENT_POWDERS_FLAG", "NO_POWDERS");
        return;
    }

    powders = collect_powders(powders); // Collect repeating powders

    equipment_vec.append_flag("EQUIPMENT_POWDERS_FLAG", "HAS_POWDERS");

    let powders_encoded = 0;
    for (const [powder, count] of powders) {
        // Encode the powder according to the number of tiers present in the version to maintain
        // backwards compatability in case the number of tiers changes.
        equipment_vec.append(encodePowderIdx(powder, ENC.POWDER_TIERS), ENC.POWDER_ID_BITLEN);
        for (let i = 1; i < count; ++i) {
            equipment_vec.append_flag("POWDER_REPEAT_OP", "REPEAT")
        }
        equipment_vec.append_flag("POWDER_REPEAT_OP", "NO_REPEAT")
        if (powders_encoded !== powders.size - 1) {
            equipment_vec.append_flag("POWDER_CHANGE_OP", "NEW_POWDER")
            powders_encoded += 1;
        }
    }
    equipment_vec.append_flag("POWDER_CHANGE_OP", "NEW_ITEM")
}

function getEquipmentKind(eq) {
    if (eq.statMap.get("custom")) {
        return ENC.EQUIPMENT_KIND.CUSTOM;
    } else if (eq.statMap.get("crafted")) {
        return ENC.EQUIPMENT_KIND.CRAFTED;
    } else {
        return ENC.EQUIPMENT_KIND.NORMAL;
    }
}

/**
 * A map of the indexes of the powderable items in the equipment array
 * and their corresponding index in the global powders array.
 */
const powderables = new Map([0, 1, 2, 3, 8].map((x, i) => [x, i]));

const CUSTOM_MAX_CHARLEN = 12; // Length, in chars, of the custom binary string

function encode_equipment(equipment, powders, version) {
    const equipment_vec = new EncodingBitVector(0, 0);

    for (const [idx, eq] of equipment.entries()) {
        const equipment_kind = getEquipmentKind(eq);
        equipment_vec.append(equipment_kind, ENC.EQUIPMENT_KIND.BITLEN);
        switch (equipment_kind) {
            case ENC.EQUIPMENT_KIND.NORMAL: {
                let eq_id = 0;
                if (eq.statMap.get("NONE") !== true) {
                    eq_id = eq.statMap.get("id") + 1;
                }
                equipment_vec.append(eq_id, ENC.ITEM_ID_BITLEN);
                break;
            }
            case ENC.EQUIPMENT_KIND.CRAFTED: {
                const crafted_hash = eq.statMap.get("hash").substring(3);
                // Legacy versions start with their first bit set
                if (Base64.toInt(crafted_hash[0]) & 0x1 === 1) {
                    equipment_vec.merge([encode_craft(eq)]);
                } else {
                    equipment_vec.appendB64(crafted_hash);
                }
                break;
            }
            case ENC.EQUIPMENT_KIND.CUSTOM: {
                const custom_hash = eq.statMap.get("hash").substring(3);
                // Legacy versions start with their first bit set
                if (Base64.toInt(custom_hash[0]) & 0x1 === 1) {
                    const new_custom = encode_custom(eq, true);
                    equipment_vec.append(new_custom.length / 6, CUSTOM_MAX_CHARLEN);
                    equipment_vec.merge([new_custom]);
                } else {
                    equipment_vec.append(custom_hash.length, CUSTOM_MAX_CHARLEN);
                    equipment_vec.appendB64(custom_hash);
                }
                break;
            }
        }

        // Encode powders
        if (powderables.has(idx)) {
            encode_powders(equipment_vec, powders[powderables.get(idx)], version);
        }
    }
    return equipment_vec;
}

/**
 * Encode skillpoints.
 * Assigned skillpoints are in the range [-2**ENC.MAX_SP_BITLEN, 2**ENC.MAX_SP_BITLEN).
 */
function encode_sp(final_sp, original_sp, version) {
    const sp_deltas = zip2(final_sp, original_sp).map(([x, y]) => x - y);
    const sp_bitvec = new EncodingBitVector(0, 0);

    if (sp_deltas.every(x => x === 0)) {
        // No manually assigned skillpoints, let the builder handle the rest.
        sp_bitvec.append_flag("SP_FLAG", "AUTOMATIC")
    } else {
        // We have manually assigned skillpoints
        sp_bitvec.append_flag("SP_FLAG", "ASSIGNED");
        for (const [i, sp] of final_sp.entries()) {
            if (sp_deltas[i] === 0) {
                // The specific element has no manually assigned skillpoints
                sp_bitvec.append_flag("SP_ELEMENT_FLAG", "ELEMENT_UNASSIGNED");
            } else {
                // The specific element has manually assigned skillpoints
                sp_bitvec.append_flag("SP_ELEMENT_FLAG", "ELEMENT_ASSIGNED");
                // Truncate to fit within the specified range.
                const trunc_sp = sp & ((1 << ENC.MAX_SP_BITLEN) - 1)
                sp_bitvec.append(trunc_sp, ENC.MAX_SP_BITLEN);
            }
        }
    }

    return sp_bitvec;
}

/*
 * Encode the build's level.
 * Encoding:
 * - Max level - encode a LEVEL_FLAG.MAX flag.
 * - Any other level - encode a LEVEL_FLAG.OTHER flag, then endcode the level in LEVEL_BITLEN bits.
 */
function encode_level(level, version) {
    level_vec = new EncodingBitVector(0, 0);
    if (level === ENC.MAX_LEVEL) {
        level_vec.append_flag("LEVEL_FLAG", "MAX");
    } else {
        level_vec.append_flag("LEVEL_FLAG", "OTHER");
        level_vec.append(level, ENC.LEVEL_BITLEN)
    }
    return level_vec;
}

/**
 * Encode aspects.
 *
 * Encoding:
 * - No aspects - flag "ASPECT_FLAG.NONE"
 * - Has aspects - flag "ASPECT_FLAG.HAS_ASPECTS"
 * 1. if the aspect is none - encode "ASPECT_KIND.NONE", go to the next aspect
 * 2. if the aspect is not none - encode "ASPECT_KIND.USED", encode (aspect_id, aspect_tier) pair, go to the next aspect
 * @param {Array<[AspectSpec, number]>} aspects 
 */
function encode_aspects(aspects, version) {
    const aspects_vec = new EncodingBitVector(0, 0);

    if (aspects.every(([aspect, _]) => aspect.NONE === true)) {
        aspects_vec.append_flag("ASPECT_FLAG", "NONE");
    } else {
        aspects_vec.append_flag("ASPECT_FLAG", "HAS_ASPECTS");
        for (const [aspect, tier] of aspects) {
            if (aspect.NONE === true) {
                aspects_vec.append_flag("ASPECT_KIND", "NONE");
            } else {
                aspects_vec.append_flag("ASPECT_KIND", "USED");
                aspects_vec.append(aspect.id, ENC.ASPECT_ID_BITLEN);
                aspects_vec.append(tier - 1, ENC.ASPECT_TIER_BITLEN);
            }
        }
    }

    return aspects_vec;
}

const VECTOR_FLAG = 0xC;
const VERSION_BITLEN = 10;

/**
 * Encode a header with metadata about the build.
 * The flag and the version length are hardcoded because
 * they are parsed before any data loading.
 */
function encode_header(encoding_version) {
    const header_vec = new EncodingBitVector(0, 0);

    // Legacy versions used versions 0..11 in decimal to encode.
    // In order to differentiate with minimal sacrifice, encode
    // the first character to be > 11.
    header_vec.append(VECTOR_FLAG, 6);
    header_vec.append(encoding_version, VERSION_BITLEN);
    return header_vec;
}

/*  Stores the entire build in a string using B64 encoding and adds it to the URL.
*/
function encode_build(build, powders, skillpoints, atree, atree_state, aspects) {
    if (!build) return;

    const final_vec = new EncodingBitVector(0, 0);

    const vecs = [
        encode_header(wynn_version_id),
        encode_equipment([...build.equipment, build.weapon], powders, wynn_version_id),
        encode_tomes(build.tomes, powders, wynn_version_id),
        encode_sp(skillpoints, build.total_skillpoints, wynn_version_id),
        encode_level(build.level, wynn_version_id),
        encode_aspects(aspects, wynn_version_id),
        encode_atree(atree, atree_state, wynn_version_id),
    ]

    final_vec.merge(vecs)

    return final_vec.toB64();
}


function parse_header(cursor) {
    const binary_flag = cursor.advance_by(6);
    return cursor.advance_by(VERSION_BITLEN);
}

/**
 * Return the string representation of the powders of the current equipment item.
 */
function parse_powders(cursor) {
    // HAS_POWDERS flag is true, so we know there's at least 1 powder.
    let powders = [decodePowderIdx(cursor.advance_by(DEC.POWDER_ID_BITLEN), DEC.POWDER_TIERS)];
    let curr_powder = powders[0];
    outer: while (true) {
        repeat: switch (cursor.advance_by(DEC.POWDER_REPEAT_OP.BITLEN)) {
            // Repeat the previous powders
            case DEC.POWDER_REPEAT_OP.REPEAT: {
                powders.push(curr_powder);
                break;
            }
            // Don't repeat previous powder
            case DEC.POWDER_REPEAT_OP.NO_REPEAT: {
                switch (cursor.advance_by(DEC.POWDER_CHANGE_OP.BITLEN)) {
                    // Decode a new powder
                    case DEC.POWDER_CHANGE_OP.NEW_POWDER: {
                        powders.push(decodePowderIdx(cursor.advance_by(DEC.POWDER_ID_BITLEN), DEC.POWDER_TIERS));
                        break repeat;
                    }
                    // Stop decoding powders
                    case DEC.POWDER_CHANGE_OP.NEW_ITEM: break outer;
                }
                break;
            }
        }
        curr_powder = powders.at(-1);
    }
    powders = powders.map(x => powderNames.get(x)).join("")
    return powders;
}

function parse_equipment(cursor) {
    const equipments = [];
    const powders = []
    for (let i = 0; i < DEC.EQUIPMENT_NUM; ++i) {
        const kind = cursor.advance_by(DEC.EQUIPMENT_KIND.BITLEN);
        // Parse equipment kind
        switch (kind) {
            case DEC.EQUIPMENT_KIND.NORMAL: {
                const id = cursor.advance_by(DEC.ITEM_ID_BITLEN);
                if (id === 0) {
                    equipments.push(null);
                } else {
                    equipments.push(idMap.get(id - 1));
                }
                break;
            }
            case DEC.EQUIPMENT_KIND.CRAFTED: {
                let craft = parse_craft({cursor: cursor});
                equipments.push(craft.hash); 
                break;
            }
            case DEC.EQUIPMENT_KIND.CUSTOM: {
                const custom_length_bits = cursor.advance_by(CUSTOM_MAX_CHARLEN) * 6;
                let custom = parse_custom({cursor: cursor.spawn(custom_length_bits)});
                equipments.push(custom.statMap.get("hash"));
                // Skip the length of the custom because we spawned a new cursor, so the original didn't mutate.
                cursor.skip(custom_length_bits);
                break;
            }
        }

        // If applicable, parse the powders for the current item
        if (!powderables.has(i)) continue;
        if (cursor.advance_by(DEC.EQUIPMENT_POWDERS_FLAG.BITLEN) === DEC.EQUIPMENT_POWDERS_FLAG.HAS_POWDERS) {
            powders.push(parse_powders(cursor));
        } else {
            powders.push("");
        }
    }
    return [equipments, powders];
}

function parse_tomes(cursor) {
    tomes = [];
    switch (cursor.advance_by(DEC.TOME_FLAG.BITLEN)) {
        case DEC.TOME_FLAG.NONE: break;
        case DEC.TOME_FLAG.HAS_TOME: {
            for (let i = 0; i < DEC.TOME_NUM; ++i) {
                switch (cursor.advance_by(DEC.TOME_KIND.BITLEN)) {
                    case DEC.TOME_KIND.NONE: tomes.push(null); break;
                    case DEC.TOME_KIND.USED: tomes.push(tomeIDMap.get(cursor.advance_by(DEC.TOME_ID_BITLEN))); break;
                }
            }
        }
    }
    return tomes;
}

function parse_sp(cursor) {
    const skillpoints = [];
    switch (cursor.advance_by(DEC.SP_FLAG.BITLEN)) {
        case DEC.SP_FLAG.AUTOMATIC: return null;
        case DEC.SP_FLAG.ASSIGNED: {
            for (let i = 0; i < DEC.SP_TYPES; ++i) {
                switch (cursor.advance_by(DEC.SP_ELEMENT_FLAG.BITLEN)) {
                    case DEC.SP_ELEMENT_FLAG.ELEMENT_ASSIGNED: {
                        // Sign extend the n-bit sp to 32 bits, read as 2's complement
                        const extension = 32 - DEC.MAX_SP_BITLEN;
                        let skp = cursor.advance_by(DEC.MAX_SP_BITLEN) << extension >> extension;
                        skillpoints.push(skp);
                        break;
                    }
                    case DEC.SP_ELEMENT_FLAG.ELEMENT_UNASSIGNED: {
                        skillpoints.push(null); 
                        break;
                    }
                }
            }
        }
    }
    return skillpoints;
}

function parse_level(cursor) {
    const flag = cursor.advance_by(DEC.LEVEL_FLAG.BITLEN);
    switch (flag) {
        case DEC.LEVEL_FLAG.MAX: return DEC.MAX_LEVEL;
        case DEC.LEVEL_FLAG.OTHER: return cursor.advance_by(DEC.LEVEL_BITLEN);
        default: 
            throw new Error(`Encountered unknown flag when parsing level!`)
    }
}

function parse_aspects(cursor, cls) {
    const flag = cursor.advance_by(DEC.ASPECT_FLAG.BITLEN) 
    const aspects = [];
    switch (flag) {
        case DEC.ASPECT_FLAG.NONE: break;
        case DEC.ASPECT_FLAG.HAS_ASPECTS: {
            for (let i = 0; i < DEC.NUM_ASPECTS; ++i) {
                switch (cursor.advance_by(DEC.ASPECT_KIND.BITLEN)) {
                    case DEC.ASPECT_KIND.NONE: {
                        aspects.push(null); 
                        break;
                    }
                    case DEC.ASPECT_KIND.USED: {
                        const aspect_id = cursor.advance_by(DEC.ASPECT_ID_BITLEN);
                        const aspect_tier = cursor.advance_by(DEC.ASPECT_TIER_BITLEN);
                        aspects.push([aspect_id_map.get(cls).get(aspect_id).displayName, aspect_tier + 1]);
                        break;
                    }
                }
            }
        }
    }
    return aspects;
}

async function load_latest_version() {
    const latest_ver_name = wynn_version_names[WYNN_VERSION_LATEST];

    const load_promises = [ 
        load_atree_data(latest_ver_name),
        load_major_id_data(latest_ver_name),
        item_loader.load_init(),
        ingredient_loader.load_init(),
        tome_loader.load_init(),
        aspect_loader.load_init(),
        load_encoding_constants(latest_ver_name)
    ];

    await Promise.all(load_promises);
}

async function handle_legacy_hash(url_tag) {
    // Legacy versioning using search query "?v=XX" in the URL itself.
    // Grab the version of the data from the search parameter "?v=" in the URL
    wynn_version_id = get_data_version_legacy();

    // wynn_version 18 is the last version that supports legacy encoding.
    if (wynn_version_id > 18) wynn_version_id = 18;
    return await parse_hash_legacy(url_tag);
}

/**
 * Parse the URL and populate all item fields.
 */
async function parse_hash() {
    const url_tag = window.location.hash.slice(1);

    if (!url_tag) {
        await load_latest_version();
        return [false, null];
    }

    // Binary encoding encodes the first character of the hash to be > 11 (or > B in Base64). if it isn't, fallback to legacy parsing.
    if (Base64.toInt(url_tag[0]) <= 11) { return await handle_legacy_hash(url_tag); }

    // Binary encoding, Create the BitVector from the URL.
    // The vector length is actually automatically calculated in the constructor but it's here just in case.
    const vec = new BitVector(url_tag, url_tag.length * 6);
    const cursor = new BitVectorCursor(vec, 0);

    // The version of the data.
    wynn_version_id = parse_header(cursor);

    // Load the correct data for the provided version, includes encoding data.
    // The reason we differentiate is that most of the heavy data can be loaded
    // locally if the version is the latest version.
    if (wynn_version_id !== WYNN_VERSION_LATEST) {
        await load_older_version();
    } else if (wynn_version_id === WYNN_VERSION_LATEST) {
        await load_latest_version();
    }

    // Parse all build information from the BitVector.
    const [equipment, powders] = parse_equipment(cursor);
    const tomes = parse_tomes(cursor);
    const skillpoints = parse_sp(cursor);
    const level = parse_level(cursor);

    // Get the class from the weapon to read aspects
    let weapon_type;
    const weapon_name = equipment[8];
    switch (weapon_name.slice(0, 3)) {
        case "CI-": weapon_type = parse_custom({hash: weapon_name.substring(3)}).statMap.get("type"); break;
        case "CR-": weapon_type = parse_craft({hash: weapon_name.substring(3)}).statMap.get("type"); break;
        default: weapon_type = itemMap.get(weapon_name).type;
    }
    const player_class = wep_to_class.get(weapon_type);

    const aspects = parse_aspects(cursor, player_class);

    // This provides the data for atree population, no other explicit step
    // needed in the parser
    atree_data = cursor.consume(); 

    // Populate all input fields apart from skillpoints, which need to be populated after build calculation
    for (const [i, eq] of equipment.entries()) { setValue(equipment_inputs[i], eq); } // Equipment
    for (let [i, powderset] of powders.entries()) { setValue(powder_inputs[i], powderset); } // Powders
    for (const [i, tome] of tomes.entries()) { setValue(tomeInputs[i], tome); } // Tomes
    setValue("level-choice", level); // Level

    // Aspects
    for (const [i, aspect_and_tier] of aspects.entries()) {
        if (aspect_and_tier !== null) {
            const [aspect, tier] = aspect_and_tier;
            setValue(aspectInputs[i], aspect);
            setValue(aspectTierInputs[i], tier);
        }
    }

    // Legacy necessity due to the builder
    // graph implementation.
    return [false, skillpoints];
}

/*  Stores the entire build in a string using B64 encoding and adds it to the URL.
 * Only for documentation purposes.
*/
function encodeBuildLegacy(build, powders, skillpoints, atree, atree_state, aspects) {

    if (build) {
        let build_string;
        
        //V6 encoding - Tomes
        //V7 encoding - ATree
        //V8 encoding - wynn version
        //V9 encoding - lootrun tome
        //V10 encoding - marathon, mysticism, and expertise tomes
        //V11 encoding - Aspects
        build_version = 11;
        build_string = "";
        tome_string = "";

        for (const item of build.items) {
            if (item.statMap.get("custom")) {
                let custom = "CI-"+encodeCustom(item, true);
                build_string += Base64.fromIntN(custom.length, 3) + custom;
                //build_version = Math.max(build_version, 5);
            } else if (item.statMap.get("crafted")) {
                build_string += "CR-"+encodeCraft(item);
            } else if (item.statMap.get("category") === "tome") {
                let tome_id = item.statMap.get("id");
                //if (tome_id <= 60) {
                    // valid normal tome. ID 61-63 is for NONE tomes.
                    //build_version = Math.max(build_version, 6);
                //}
                tome_string += Base64.fromIntN(tome_id, 2);
            } else {
                build_string += Base64.fromIntN(item.statMap.get("id"), 3);
            }
        }

        for (const skp of skillpoints) {
            build_string += Base64.fromIntN(skp, 2); // Maximum skillpoints: 2048
        }
        build_string += Base64.fromIntN(build.level, 2);
        for (const _powderset of powders) {
            let n_bits = Math.ceil(_powderset.length / 6);
            build_string += Base64.fromIntN(n_bits, 1); // Hard cap of 378 powders.
            // Slice copy.
            let powderset = _powderset.slice();
            while (powderset.length != 0) {
                let firstSix = powderset.slice(0,6).reverse();
                let powder_hash = 0;
                for (const powder of firstSix) {
                    powder_hash = (powder_hash << 5) + 1 + powder; // LSB will be extracted first.
                }
                build_string += Base64.fromIntN(powder_hash, 5);
                powderset = powderset.slice(6);
            }
        }
        build_string += tome_string;

        for (const [aspect, tier] of aspects) {
            build_string += Base64.fromIntN(aspect.id, 2);
            build_string += Base64.fromIntN(tier, 1);
        }

        if (atree.length > 0 && atree_state.get(atree[0].ability.id).active) {
            //build_version = Math.max(build_version, 7);
            const bitvec = encode_atree(atree, atree_state);
            build_string += bitvec.toB64();
        }

        return build_version.toString() + "_" + build_string;
    }
}

function get_full_url() {
    return window.location.href;
}

function copyBuild() {
    copyTextToClipboard(get_full_url());
    document.getElementById("copy-button").textContent = "Copied!";
}

function shareBuild(build) {
    if (!build) return;

    let lines = [
        get_full_url(),
        "> Wynnbuilder build:",
        ...build.equipment.map(x => `> ${x.statMap.get("displayName")}`),
        `> ${build.weapon.statMap.get("displayName")} [${build_powders[4].map(x => powderNames.get(x)).join("")}]`
    ];

    if (!build.tomes.every(tome => tome.statMap.has("NONE"))) {
        lines.push("> (Has Tomes)")
    }

    const text = lines.join('\n');
    copyTextToClipboard(text);
    document.getElementById("share-button").textContent = "Copied!";
}

/**
 * Ability tree encode and decode functions
 *
 * Based on a traversal, basically only uses bits to represent the nodes that are on (and "dark" outgoing edges).
 * credit: SockMower
 */

/**
 * Return: BitVector
 */
function encode_atree(atree, atree_state) {
    let ret_vec = new BitVector(0, 0);

    function traverse(head, atree_state, visited, ret) {
        for (const child of head.children) {
            if (visited.has(child.ability.id)) { continue; }
            visited.set(child.ability.id, true);
            if (atree_state.get(child.ability.id).active) {
                ret.append(1, 1);
                traverse(child, atree_state, visited, ret);
            }
            else {
                ret.append(0, 1);
            }
        }
    }

    traverse(atree[0], atree_state, new Map(), ret_vec);
    return ret_vec;
}

/**
 * Return: List of active nodes
 */
function decode_atree(atree, bits) {
    let i = 0;
    let ret = [];
    ret.push(atree[0]);
    function traverse(head, visited, ret) {
        for (const child of head.children) {
            if (visited.has(child.ability.id)) { continue; }
            visited.set(child.ability.id, true);
            if (bits.read_bit(i)) {
                i += 1;
                ret.push(child);
                traverse(child, visited, ret);
            }
            else {
                i += 1;
            }
        }
    }
    traverse(atree[0], new Map(), ret);
    return ret;
}
