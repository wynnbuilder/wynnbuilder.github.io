let player_build;
let build_powders;

function getItemNameFromID(id) { 
    return idMap.get(id); 
}

function getTomeNameFromID(id) {
    let res = tomeIDMap.get(id);
    if (res === undefined) { console.log('WARN: Deleting unrecognized tome, id='+id); return ""; }
    return res;
}

let atree_data = null;

/**
 * Load the latest version of hte data.
 * if the user has already opened the site before,
 * this saves bandwidth by using locally stored data.
 */
async function loadLatestVersion() {
    const latestVerName = wynn_version_names[WYNN_VERSION_LATEST];

    const loadPromises = [ 
        load_atree_data(latestVerName),
        load_major_id_data(latestVerName),
        item_loader.load_init(),
        ingredient_loader.load_init(),
        tome_loader.load_init(),
        aspect_loader.load_init(),
        load_encoding_constants(latestVerName)
    ];

    await Promise.all(loadPromises);
}

/**
 * Load an older version of the data, decoded from the build's hash.
 */
async function loadOlderVersion() {
    const updateMsg = 'This build was created in an older version of wynncraft '
                + `(${wynn_version_names[wynn_version_id]} < ${wynn_version_names[WYNN_VERSION_LATEST]}). `
                + 'Would you like to update to the latest version? Updating may break the build and ability tree.';

    const decodingVersion = wynn_version_id;
    // Upgrade the build to the latest version
    if (confirm(updateMsg)) {
        wynn_version_id = WYNN_VERSION_LATEST;
    }

    const versionName = wynn_version_names[wynn_version_id];
    const decodingVersionName = wynn_version_names[decodingVersion];
    assert(decodingVersion <= wynn_version_id, "decoding version cannot be larger than the encoding version.");
    const loadPromises = [ 
        load_atree_data(versionName),
        load_major_id_data(versionName),
        item_loader.load_old_version(versionName),
        ingredient_loader.load_old_version(versionName),
        tome_loader.load_old_version(versionName),
        aspect_loader.load_old_version(versionName),
        load_encoding_constants(versionName, decodingVersionName)
    ];
    console.log("Loading old version data...", versionName)
    await Promise.all(loadPromises);
}

/**
 * Encode the build's tomes and return the resulting vector.
 * @param {Tome[]} tomes 
 */
function encodeTomes(tomes) {
    const tomesVec = new EncodingBitVector(0, 0);
    if (tomes.every(t => t.statMap.has("NONE"))) {
        tomesVec.appendFlag("TOMES_FLAG", "NO_TOMES");
    } else {
        tomesVec.appendFlag("TOMES_FLAG", "HAS_TOMES");
        for (const tome of tomes) {
            if (tome.statMap.get("NONE")) {
                tomesVec.appendFlag("TOME_SLOT_FLAG", "UNUSED")
            } else {
                tomesVec.appendFlag("TOME_SLOT_FLAG", "USED")
                tomesVec.append(tome.statMap.get("id"), ENC.TOME_ID_BITLEN);
            }
        }
    }
    return tomesVec;
}

/**
 * Collect identical powders, keeping their original order in place.
 *
 * - T6 E6 T6 E6       => T6 T6 E6 E6
 * - T6 T4 T6 T4       => T6 T6 T4 T4
 * - F6 A6 F6 T6 T6 A6 => F6 F6 A6 A6 T6 T6
 *
 * @param {number[]} powders - An array of powder IDs for a given item.
 */
function collectPowders(powders) {
    const countingMap = new Map() // Map preserves insertion order even for integers
    for (const powder of powders) {
        if (countingMap.get(powder) === undefined) {
            countingMap.set(powder, 1);
        } else {
            countingMap.set(powder, countingMap.get(powder) + 1);
        }
    }
    return countingMap;
}

/**
 * Encode the powders for a given equipment piece and return the resulting vector.
 * Powder encoding is detailed in `ENCODING.md`.
 *
 * @param {number[]} powderset - an array of powders IDs for a given item.
 * @param {number} version - The data version.
 */
function encodePowders(powderset, version) {
    const powdersVec = new EncodingBitVector(0, 0);

    if (powderset.length === 0) {
        powdersVec.appendFlag("EQUIPMENT_POWDERS_FLAG", "NO_POWDERS");
        return powdersVec;
    }

    const collectedPowders = collectPowders(powderset); // Collect repeating powders

    powdersVec.appendFlag("EQUIPMENT_POWDERS_FLAG", "HAS_POWDERS");

    let previousPowder = -1;
    for (const [powder, count] of collectedPowders) {
        if (previousPowder >= 0) {
            powdersVec.appendFlag("POWDER_REPEAT_OP", "NO_REPEAT");
            if (powder % POWDER_TIERS === previousPowder % POWDER_TIERS) {
                powdersVec.appendFlag("POWDER_REPEAT_TIER_OP", "REPEAT_TIER");
                const numElements = ENC.POWDER_ELEMENTS.length;
                const powderElement = Math.floor(powder % numElements);
                const previousPowderElement = Math.floor(previousPowder % numElements);
                const elementWrapper = mod(powderElement - previousPowderElement, numElements) - 1; 
                powdersVec.append(elementWrapper, ENC.POWDER_WRAPPER_BITLEN);
            } else {
                powdersVec.appendFlag("POWDER_REPEAT_TIER_OP", "CHANGE_POWDER");
                powdersVec.appendFlag("POWDER_CHANGE_OP", "NEW_POWDER");
                powdersVec.append(encodePowderIdx(powder, ENC.POWDER_TIERS), ENC.POWDER_ID_BITLEN);
            }
        } else {
            powdersVec.append(encodePowderIdx(powder, ENC.POWDER_TIERS), ENC.POWDER_ID_BITLEN);
        }
        for (let i = 1; i < count; ++i) {
            powdersVec.appendFlag("POWDER_REPEAT_OP", "REPEAT")
        }
        previousPowder = powder;
    }
    powdersVec.appendFlag("POWDER_REPEAT_OP", "NO_REPEAT");
    powdersVec.appendFlag("POWDER_REPEAT_TIER_OP", "CHANGE_POWDER");
    powdersVec.appendFlag("POWDER_CHANGE_OP", "NEW_ITEM")

    return powdersVec;
}

/**
 * Return the appropriate equipment flag given an item.
 * @param {Item | Craft | Custom} eq 
 * @returns number
 */
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
 * and their corresponding index in the build powders array.
 */
const powderables = new Map([0, 1, 2, 3, 8].map((x, i) => [x, i]));

/** Length, in chars, of the custom binary string */
const CUSTOM_STR_LENGTH_BITLEN = 12; 

/**
 * Encode all wearable equipment and return the resulting vector.
 * 
 * @param {Array<Item | Craft | Custom>} equipment - An array of the equipment to encode 
 * @param {number[]} powders - An array of powder ids for each powderable item 
 * @param {number} version - encoding version 
 * @returns {EncodingBitVector}
 */
function encodeEquipment(equipment, powders, version) {
    const equipmentVec = new EncodingBitVector(0, 0);

    for (const [idx, eq] of equipment.entries()) {
        const equipmentKind = getEquipmentKind(eq);
        equipmentVec.append(equipmentKind, ENC.EQUIPMENT_KIND.BITLEN);
        switch (equipmentKind) {
            case ENC.EQUIPMENT_KIND.NORMAL: {
                let eqID = 0;
                if (eq.statMap.get("NONE") !== true) {
                    eqID = eq.statMap.get("id") + 1;
                }
                equipmentVec.append(eqID, ENC.ITEM_ID_BITLEN);
                break;
            }
            case ENC.EQUIPMENT_KIND.CRAFTED: {
                const craftedHash = eq.statMap.get("hash").substring(3);
                // Legacy versions start with their first bit set
                if (Base64.toInt(craftedHash[0]) & 0x1 === 1) {
                    equipmentVec.merge([encodeCraft(eq)]);
                } else {
                    equipmentVec.appendB64(craftedHash);
                }
                break;
            }
            case ENC.EQUIPMENT_KIND.CUSTOM: {
                const customHash = eq.statMap.get("hash").substring(3);
                // Legacy versions start with their first bit set
                if (Base64.toInt(customHash[0]) & 0x1 === 1) {
                    const newCustom = encodeCustom(eq, true);
                    equipmentVec.append(newCustom.length / 6, CUSTOM_STR_LENGTH_BITLEN);
                    equipmentVec.merge([newCustom]);
                } else {
                    equipmentVec.append(customHash.length, CUSTOM_STR_LENGTH_BITLEN);
                    equipmentVec.appendB64(customHash);
                }
                break;
            }
        }

        // Encode powders
        if (powderables.has(idx)) {
            equipmentVec.merge([encodePowders(powders[powderables.get(idx)], version)]);
        }
    }
    return equipmentVec;
}

/**
 * Encode skillpoints.
 * The term "manual assignment" refers to skillpoints manually assigned in **Wynnbuilder** and not in **Wynncraft**.
 *
 * Assigned skillpoints are in the range [-2**ENC.MAX_SP_BITLEN, 2**ENC.MAX_SP_BITLEN).
 * @param {number[]} finalSp - Array of skillpoints after manual assignment from the user in `etwfa` order.
 * @param {number[]} originalSp - Array of skillpoints before manual assignment from the user in `etwfa` order. 
 * @param {number} version - Encoding version
 * @returns {EncodingBitVector}
 */
function encodeSp(finalSp, originalSp, version) {
    const spDeltas = zip2(finalSp, originalSp).map(([x, y]) => x - y);
    const spBitvec = new EncodingBitVector(0, 0);

    if (spDeltas.every(x => x === 0)) {
        // No manually assigned skillpoints, let the builder handle the rest.
        spBitvec.appendFlag("SP_FLAG", "AUTOMATIC")
    } else {
        // We have manually assigned skillpoints
        spBitvec.appendFlag("SP_FLAG", "ASSIGNED");
        for (const [i, sp] of finalSp.entries()) {
            if (spDeltas[i] === 0) {
                // The specific element has no manually assigned skillpoints
                spBitvec.appendFlag("SP_ELEMENT_FLAG", "ELEMENT_UNASSIGNED");
            } else {
                // The specific element has manually assigned skillpoints
                spBitvec.appendFlag("SP_ELEMENT_FLAG", "ELEMENT_ASSIGNED");
                // Truncate to fit within the specified range.
                const truncSp = sp & ((1 << ENC.MAX_SP_BITLEN) - 1)
                spBitvec.append(truncSp, ENC.MAX_SP_BITLEN);
            }
        }
    }

    return spBitvec;
}

/**
 * Encode the build's level.
 * Encoding:
 * - Max level - encode a LEVEL_FLAG.MAX flag.
 * - Any other level - encode a LEVEL_FLAG.OTHER flag, then endcode the level in LEVEL_BITLEN bits.
 *
 * @param {number} level - The build's level.
 * @param {version} version - The data verison.
 */
function encodeLevel(level, version) {
    const levelVec = new EncodingBitVector(0, 0);
    if (level === ENC.MAX_LEVEL) {
        levelVec.appendFlag("LEVEL_FLAG", "MAX");
    } else {
        levelVec.appendFlag("LEVEL_FLAG", "OTHER");
        levelVec.append(level, ENC.LEVEL_BITLEN)
    }
    return levelVec;
}

/**
 * Encode aspects.
 * @param {AspectSpec[]} aspects - an array of aspects.
 * @param {number} version - the data version.
 */
function encodeAspects(aspects, version) {
    const aspectsVec = new EncodingBitVector(0, 0);

    if (aspects.every(([aspect, _]) => aspect.NONE === true)) {
        aspectsVec.appendFlag("ASPECTS_FLAG", "NO_ASPECTS");
    } else {
        aspectsVec.appendFlag("ASPECTS_FLAG", "HAS_ASPECTS");
        for (const [aspect, tier] of aspects) {
            if (aspect.NONE === true) {
                aspectsVec.appendFlag("ASPECT_SLOT_FLAG", "UNUSED");
            } else {
                aspectsVec.appendFlag("ASPECT_SLOT_FLAG", "USED");
                aspectsVec.append(aspect.id, ENC.ASPECT_ID_BITLEN);
                aspectsVec.append(tier - 1, ENC.ASPECT_TIER_BITLEN);
            }
        }
    }

    return aspectsVec;
}

/** An indication tha the vector is in binary format. */
const VECTOR_FLAG = 0xC;

/** The length, in bits, of the version field of the header. */
const VERSION_BITLEN = 10;

/**
 * Encode a header with metadata about the build.
 * The flag and the version length are hardcoded because
 * they are decoded before any data loading.
 *
 * @param {number} encoding_version - The version to encode.
 */
function encodeHeader(encoding_version) {
    const headerVec = new EncodingBitVector(0, 0);

    // Legacy versions used versions 0..11 in decimal to encode.
    // In order to differentiate with minimal sacrifice, encode
    // the first character to be > 11.
    headerVec.append(VECTOR_FLAG, 6);
    headerVec.append(encoding_version, VERSION_BITLEN);
    return headerVec;
}

/**
 * Encodes the build according to the spec in `ENCODING.md` and returns the resulting BitVector.
 *
 * @param {Build} build - The calculated player build.
 * @param {Array<Array<number>>} powders - An array of powdersets for each item.
 * @param {number[]} skillpoints - An array of the skillpoint values to encode.
 * @param {Object} atree - An object representation of the ability tree.
 * @param {Object} atree_state - An object representation of the ability tree state.
 * @param {AspectSpec[]} aspects - An array of aspects.
 * @returns {EncodingBitVector}
 */
function encodeBuild(build, powders, skillpoints, atree, atree_state, aspects) {
    if (!build) return;

    const finalVec = new EncodingBitVector(0, 0);

    const vecs = [
        encodeHeader(wynn_version_id),
        encodeEquipment([...build.equipment, build.weapon], powders, wynn_version_id),
        encodeTomes(build.tomes, powders, wynn_version_id),
        encodeSp(skillpoints, build.total_skillpoints, wynn_version_id),
        encodeLevel(build.level, wynn_version_id),
        encodeAspects(aspects, wynn_version_id),
        encodeAtree(atree, atree_state, wynn_version_id),
    ]

    finalVec.merge(vecs)

    return finalVec;
}

/**
 * Decode the header portion of an encoded build.
 * @param {BitVectorCursor} cursor - a cursor into the BitVector representation of the build.
 * @returns {number}
 */
function decodeHeader(cursor) {
    const binaryFlag = cursor.advanceBy(6);
    return cursor.advanceBy(VERSION_BITLEN);
}

/**
 * Decode the powders portion of an encoded build, for a given item.
 *
 * @param {BitVectorCursor} cursor - a cursor into the BitVector representation of the build.
 * @returns {number[]}
 *
 * TODO(@orgold): Refactor this code to not use 3 nested switch cases
 */
function decodePowders(cursor) {
    // HAS_POWDERS flag is true, so we know there's at least 1 powder.
    let powders = [decodePowderIdx(cursor.advanceBy(DEC.POWDER_ID_BITLEN), DEC.POWDER_TIERS)];
    let prevPowder = powders[0];
    outer: while (true) {
        repeat: switch (cursor.advanceBy(DEC.POWDER_REPEAT_OP.BITLEN)) {
            // Repeat the previous powders
            case DEC.POWDER_REPEAT_OP.REPEAT: {
                powders.push(prevPowder);
                break;
            }
            // Don't repeat previous powder
            case DEC.POWDER_REPEAT_OP.NO_REPEAT: {
                switch (cursor.advanceBy(DEC.POWDER_REPEAT_TIER_OP.BITLEN)) {
                    // Decode a new powder
                    case DEC.POWDER_REPEAT_TIER_OP.REPEAT_TIER: {
                        const powderWrap = cursor.advanceBy(DEC.POWDER_WRAPPER_BITLEN);
                        const prevPowderElem = Math.floor(prevPowder / POWDER_TIERS); 
                        const prevPowderTier = prevPowder % POWDER_TIERS;
                        const newPowderElem = (prevPowderElem + powderWrap + 1) % DEC.POWDER_ELEMENTS.length;
                        const newPowder = newPowderElem * POWDER_TIERS + prevPowderTier;
                        powders.push(newPowder);
                        break repeat;
                    };
                    case DEC.POWDER_REPEAT_TIER_OP.CHANGE_POWDER: {
                        switch (cursor.advanceBy(DEC.POWDER_CHANGE_OP.BITLEN)) {
                            case DEC.POWDER_CHANGE_OP.NEW_POWDER: {
                                powders.push(decodePowderIdx(cursor.advanceBy(DEC.POWDER_ID_BITLEN), DEC.POWDER_TIERS));
                                break repeat;
                            }
                            // Stop decoding powders
                            case DEC.POWDER_CHANGE_OP.NEW_ITEM: break outer;

                        };
                    }
                }
                break;
            }
        }
        prevPowder = powders.at(-1);
    }
    powders = powders.map(x => powderNames.get(x)).join("")
    return powders;
}

/**
 * Decode the equipment portion of an encoded build, including powders, and return both.
 *
 * @param {BitVectorCursor} cursor - a cursor into the BitVector representation of the build.
 * @returns {[Array<Item | Cusotm | Craft>, number[]]}
 *
 * TODO(@orgold): Refactor this code to not use 3 nested switch cases
 */
function decodeEquipment(cursor) {
    const equipments = [];
    const powders = []
    for (let i = 0; i < DEC.EQUIPMENT_NUM; ++i) {
        const kind = cursor.advanceBy(DEC.EQUIPMENT_KIND.BITLEN);
        // Decode equipment kind
        switch (kind) {
            case DEC.EQUIPMENT_KIND.NORMAL: {
                const id = cursor.advanceBy(DEC.ITEM_ID_BITLEN);
                if (id === 0) {
                    equipments.push(null);
                } else {
                    equipments.push(idMap.get(id - 1));
                }
                break;
            }
            case DEC.EQUIPMENT_KIND.CRAFTED: {
                let craft = decodeCraft({cursor: cursor});
                equipments.push(craft.hash); 
                break;
            }
            case DEC.EQUIPMENT_KIND.CUSTOM: {
                const customLengthBits = cursor.advanceBy(CUSTOM_STR_LENGTH_BITLEN) * 6;
                let custom = decodeCustom({cursor: cursor.spawn(customLengthBits)});
                equipments.push(custom.statMap.get("hash"));
                // Skip the length of the custom because we spawned a new cursor, so the original didn't mutate.
                cursor.skip(customLengthBits);
                break;
            }
        }

        // If applicable, decode the powders for the current item
        if (!powderables.has(i)) continue;
        if (cursor.advanceBy(DEC.EQUIPMENT_POWDERS_FLAG.BITLEN) === DEC.EQUIPMENT_POWDERS_FLAG.HAS_POWDERS) {
            powders.push(decodePowders(cursor));
        } else {
            powders.push("");
        }
    }
    return [equipments, powders];
}

/**
 * Decode the tome portion of an encoded build.
 *
 * @param {BitVectorCursor} cursor - a cursor into the BitVector representation of the build.
 * @returns {Tome[]}
 */
function decodeTomes(cursor) {
    tomes = [];
    switch (cursor.advanceBy(DEC.TOMES_FLAG.BITLEN)) {
        case DEC.TOMES_FLAG.NO_TOMES: break;
        case DEC.TOMES_FLAG.HAS_TOMES: {
            for (let i = 0; i < DEC.TOME_NUM; ++i) {
                switch (cursor.advanceBy(DEC.TOME_SLOT_FLAG.BITLEN)) {
                    case DEC.TOME_SLOT_FLAG.UNUSED: tomes.push(null); break;
                    case DEC.TOME_SLOT_FLAG.USED: tomes.push(tomeIDMap.get(cursor.advanceBy(DEC.TOME_ID_BITLEN))); break;
                }
            }
        }
    }
    return tomes;
}

/**
 * Decode the skillpoint portion of an encoded build.
 *
 * @param {BitVectorCursor} cursor - a cursor into the BitVector representation of the build.
 * @returns {number[]}
 */
function decodeSp(cursor) {
    const skillpoints = [];
    switch (cursor.advanceBy(DEC.SP_FLAG.BITLEN)) {
        case DEC.SP_FLAG.AUTOMATIC: return null;
        case DEC.SP_FLAG.ASSIGNED: {
            for (let i = 0; i < DEC.SP_TYPES; ++i) {
                switch (cursor.advanceBy(DEC.SP_ELEMENT_FLAG.BITLEN)) {
                    case DEC.SP_ELEMENT_FLAG.ELEMENT_ASSIGNED: {
                        // Sign extend the n-bit sp to 32 bits, read as 2's complement
                        const extension = 32 - DEC.MAX_SP_BITLEN;
                        let skp = cursor.advanceBy(DEC.MAX_SP_BITLEN) << extension >> extension;
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

/**
 * Decode the build's level.
 */
function decodeLevel(cursor) {
    const flag = cursor.advanceBy(DEC.LEVEL_FLAG.BITLEN);
    switch (flag) {
        case DEC.LEVEL_FLAG.MAX: return DEC.MAX_LEVEL;
        case DEC.LEVEL_FLAG.OTHER: return cursor.advanceBy(DEC.LEVEL_BITLEN);
        default: 
            throw new Error(`Encountered unknown flag when parsing level!`)
    }
}

function decodeAspects(cursor, cls) {
    const flag = cursor.advanceBy(DEC.ASPECTS_FLAG.BITLEN);
    const aspects = [];
    switch (flag) {
        case DEC.ASPECTS_FLAG.NO_ASPECTS: break;
        case DEC.ASPECTS_FLAG.HAS_ASPECTS: {
            for (let i = 0; i < DEC.NUM_ASPECTS; ++i) {
                switch (cursor.advanceBy(DEC.ASPECT_SLOT_FLAG.BITLEN)) {
                    case DEC.ASPECT_SLOT_FLAG.UNUSED: {
                        aspects.push(null); 
                        break;
                    }
                    case DEC.ASPECT_SLOT_FLAG.USED: {
                        const aspectID = cursor.advanceBy(DEC.ASPECT_ID_BITLEN);
                        const aspectTier = cursor.advanceBy(DEC.ASPECT_TIER_BITLEN);
                        aspects.push([aspect_id_map.get(cls).get(aspectID).displayName, aspectTier + 1]);
                        break;
                    }
                }
            }
        }
    }
    return aspects;
}

async function handleLegacyHash(urlTag) {
    // Legacy versioning using search query "?v=XX" in the URL itself.
    // Grab the version of the data from the search parameter "?v=" in the URL
    wynn_version_id = getDataVersionLegacy();

    // wynn_version 18 is the last version that supports legacy encoding.
    return await decodeHashLegacy(urlTag);
}

/**
 * Decode the URL and populate all item fields.
 */
async function decodeHash() {
    const urlTag = window.location.hash.slice(1);

    if (!urlTag) {
        await loadLatestVersion();
        return null;
    }

    // Binary encoding encodes the first character of the hash to be > 11 (or > B in Base64). if it isn't, fallback to legacy parsing.
    if (Base64.toInt(urlTag[0]) <= 11) { return await handleLegacyHash(urlTag); }

    // Binary encoding, Create the BitVector from the URL.
    // The vector length is actually automatically calculated in the constructor but it's here just in case.
    const vec = new BitVector(urlTag, urlTag.length * 6);
    const cursor = new BitVectorCursor(vec, 0);

    // The version of the data.
    wynn_version_id = decodeHeader(cursor);

    // Load the correct data for the provided version, includes encoding data.
    // The reason we differentiate is that most of the heavy data can be loaded
    // locally if the version is the latest version.
    if (wynn_version_id !== WYNN_VERSION_LATEST) {
        await loadOlderVersion();
    } else if (wynn_version_id === WYNN_VERSION_LATEST) {
        await loadLatestVersion();
    }

    // Decode all build information from the BitVector.
    const [equipment, powders] = decodeEquipment(cursor);
    const tomes = decodeTomes(cursor);
    const skillpoints = decodeSp(cursor);
    const level = decodeLevel(cursor);

    // Get the class from the weapon to read aspects
    let weaponType;
    const weaponName = equipment[8];
    switch (weaponName.slice(0, 3)) {
        case "CI-": weaponType = decodeCustom({hash: weaponName.substring(3)}).statMap.get("type"); break;
        case "CR-": weaponType = decodeCraft({hash: weaponName.substring(3)}).statMap.get("type"); break;
        default: weaponType = itemMap.get(weaponName).type;
    }
    const playerClass = wep_to_class.get(weaponType);

    const aspects = decodeAspects(cursor, playerClass);

    // This provides the data for atree population, no other explicit step
    // needed in the decoder
    atree_data = cursor.consume(); 

    // Populate all input fields apart from skillpoints, which need to be populated after build calculation
    for (const [i, eq] of equipment.entries()) { setValue(equipment_inputs[i], eq); } // Equipment
    for (let [i, powderset] of powders.entries()) { setValue(powder_inputs[i], powderset); } // Powders
    for (const [i, tome] of tomes.entries()) { setValue(tomeInputs[i], tome); } // Tomes
    setValue("level-choice", level); // Level

    // Aspects
    for (const [i, aspectAndTier] of aspects.entries()) {
        if (aspectAndTier !== null) {
            const [aspect, tier] = aspectAndTier;
            setValue(aspectInputs[i], aspect);
            setValue(aspectTierInputs[i], tier);
        }
    }

    return skillpoints;
}

/**
 * Get the data version from the search parameters of the URL.
 * Should only be called if the encoding version is >= 8.
 */
function getDataVersionLegacy() {
    // parse query parameters
    // https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
    const urlParams = new URLSearchParams(window.location.search);
    const versionID = urlParams.get('v');
    let wynnVersion = parseInt(versionID); // Declared in load_item.js
    if (isNaN(wynnVersion) || wynnVersion > LAST_LEGACY_VERSION || wynnVersion < 0) {
        // TODO: maybe make the NAN try to use the human readable version?
        // NOTE: Failing silently... do we want to raise a loud error?
        console.log("Explicit version not found or invalid, using latest version");
        wynnVersion = LAST_LEGACY_VERSION;
    }
    else {
        console.log(`Build link for wynn version ${wynnVersion} (${wynn_version_names[wynnVersion]})`);
    }
    return wynnVersion;
}

/**
 * The legacy version of decodePowders.
 */
function decodePowdersLegacy(powder_info) {
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

// The last data version supported by legacy encoding.
LAST_LEGACY_VERSION = 18

/*
 * Decode legacy hashes.
 *
 * Populate fields based on url, and calculate build.
 * TODO: THIS CODE IS GOD AWFUL result of being lazy
 * fix all the slice() and break into functions or do something about it... its inefficient, ugly and error prone
 */
async function decodeHashLegacy(url_tag) {
    //default values
    let equipment = [null, null, null, null, null, null, null, null, null];
    let tomes = [null, null, null, null, null, null, null, null];
    let powdering = ["", "", "", "", ""];
    let info = url_tag.split("_");
    let version = info[0];
    // Whether skillpoints are manually updated. True if they should be set to something other than default values
    let skillpoints = [null, null, null, null, null];
    let level = 106;

    let version_number = parseInt(version);
    let data_str = info[1];

    if (version_number >= 8) {
        wynn_version_id = getDataVersionLegacy();
    } else {
        // Change the default to oldest. (A time before v8)
        wynn_version_id = 0;
    }

    // the deal with this is because old versions should default to 0 (oldest wynn item version), and v8+ defaults to latest.
    // its ugly... but i think this is the behavior we want...
    await loadOlderVersion();

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
        let res = decodePowdersLegacy(powder_info);
        powdering = res[0];
    } else if (version_number == 2) {
        let skillpoint_info = data_str.slice(0, 10);
        for (let i = 0; i < 5; ++i ) {
            skillpoints[i] = Base64.toIntSigned(skillpoint_info.slice(i*2,i*2+2));
        }

        let powder_info = data_str.slice(10);
        let res = decodePowdersLegacy(powder_info);
        powdering = res[0];
    } else if (version_number <= 11){
        level = Base64.toInt(data_str.slice(10,12));
        setValue("level-choice",level);
        let skillpoint_info = data_str.slice(0, 10);
        for (let i = 0; i < 5; ++i ) {
            skillpoints[i] = Base64.toIntSigned(skillpoint_info.slice(i*2,i*2+2));
        }

        let powder_info = data_str.slice(12);

        let res = decodePowdersLegacy(powder_info);
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
        else { item_type = itemMap.get(equipment[8]).type };

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

    return skillpoints;
}

/**  
 *  Stores the entire build in a string using B64 encoding.
 *  Here only for documentation purposes.
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
                build_string += "CR-"+encodeCraftLegacy(item);
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
            const bitvec = encodeAtree(atree, atree_state);
            build_string += bitvec.toB64();
        }

        return build_version.toString() + "_" + build_string;
    }
}

function getFullURL() {
    return window.location.href;
}

function useCopyButton(id, text, default_text) {
    copyTextToClipboard(text);
    setText(id, "Copied!");
    setTimeout(() => setText(id, default_text), 1000);
}

function copyBuild() {
    useCopyButton("copy-button", getFullURL(), "Copy short");
}

function shareBuild(build) {
    if (!build) return;

    let lines = [
        getFullURL(),
        "> Wynnbuilder build:",
        ...build.equipment.map(x => `> ${x.statMap.get("displayName")}`),
        `> ${build.weapon.statMap.get("displayName")} [${build_powders[4].map(x => powderNames.get(x)).join("")}]`
    ];

    if (!build.tomes.every(tome => tome.statMap.has("NONE"))) {
        lines.push("> (Has Tomes)")
    }

    const text = lines.join('\n');
    useCopyButton("share-button", text, "Copy for sharing");
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
function encodeAtree(atree, atree_state) {
    let retVec = new BitVector(0, 0);

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

    traverse(atree[0], atree_state, new Map(), retVec);
    return retVec;
}

/**
 * Return: List of active nodes
 */
function decodeAtree(atree, bits) {
    let i = 0;
    let ret = [];
    ret.push(atree[0]);
    function traverse(head, visited, ret) {
        for (const child of head.children) {
            if (visited.has(child.ability.id)) { continue; }
            visited.set(child.ability.id, true);
            if (bits.readBit(i)) {
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
