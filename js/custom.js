// NOTE: DO NOT DELETE ENTRIES FROM ARRAYS FOR BACKWARDS COMPAT REASONS!!!
const ci_save_order = ["name", "lore", "tier", "set", "slots", "type",
"material", "drop", "quest",
"nDam", "fDam", "wDam", "aDam", "tDam", "eDam",
"atkSpd", "hp",
"fDef", "wDef", "aDef", "tDef", "eDef",
"lvl", "classReq",
"strReq", "dexReq", "intReq", "defReq", "agiReq",
"str", "dex", "int", "agi", "def", "id",
"skillpoints", "reqs",
// NOTE: THESE ARE UNUSED.
"nDam_", "fDam_", "wDam_", "aDam_", "tDam_", "eDam_",
"majorIds", "hprPct", "mr",
"sdPct", "mdPct",
"ls", "ms", "xpb", "lb",
"ref", "thorns", "expd", "spd", "atkTier", "poison", "hpBonus", "spRegen", "eSteal", "hprRaw",
"sdRaw", "mdRaw",
"fDamPct", "wDamPct", "aDamPct", "tDamPct", "eDamPct",
"fDefPct", "wDefPct", "aDefPct", "tDefPct", "eDefPct",
"spPct1", "spRaw1", "spPct2", "spRaw2", "spPct3", "spRaw3", "spPct4", "spRaw4",
"rSdRaw",
"sprint", "sprintReg", "jh", "lq", "gXp", "gSpd", "durability", "duration", "charges", "maxMana", "critDamPct",
/*"sdRaw", "rSdRaw",*/ "nSdRaw", "eSdRaw", "tSdRaw", "wSdRaw", "fSdRaw", "aSdRaw",
/*"sdPct",*/ "rSdPct", "nSdPct", "eSdPct", "tSdPct", "wSdPct", "fSdPct", "aSdPct",
/*"mdRaw",*/ "rMdRaw", "nMdRaw", "eMdRaw", "tMdRaw", "wMdRaw", "fMdRaw", "aMdRaw",
/*"mdPct",*/ "rMdPct", "nMdPct", "eMdPct", "tMdPct", "wMdPct", "fMdPct", "aMdPct",
"damRaw", "rDamRaw", "nDamRaw", "eDamRaw", "tDamRaw", "wDamRaw", "fDamRaw", "aDamRaw",
"damPct", "rDamPct", "nDamPct", /*"eDamPct", "tDamPct", "wDamPct", "fDamPct", "aDamPct",*/
"healPct",
"mainAttackRange", "kb", "weakenEnemy", "slowEnemy",
"rDefPct"
];

const non_rolled_strings = ["name", "lore", "tier", "set", "type", "material", "drop", "quest", "majorIds", "classReq", "atkSpd", "displayName", "nDam", "fDam", "wDam", "aDam", "tDam", "eDam", "nDam_", "fDam_", "wDam_", "aDam_", "tDam_", "eDam_", "durability", "duration"];

//omitted restrict - it's always "Custom Item"
//omitted displayName - either it's the same as name (repetitive) or it's "Custom Item"
//omitted category - can always get this from type
//omitted fixId - we will denote this early in the string.
//omitted "nDam_", "fDam_", "wDam_", "aDam_", "tDam_", "eDam_" - will be calculated on display

// TODO: Add an exclude list

/**
 * A constant encompassing all the necessary info for custom item encoding.
 * if something in this structure changes, the version number must be increased
 * and handled in the respective decoder.
 * The values are detailed in ENCODING.md.
 */
const CUSTOM_ENC = {
    CUSTOM_VERSION_BITLEN: 7,
    CUSTOM_ENCODING_VERSION: 2,
    CUSTOM_FIXED_IDS_FLAG: {
        FIXED: 0,
        RANGED: 1,
        BITLEN: 1,
    },
    ID_IDX_BITLEN: 10,
    ID_LENGTH_BITLEN: 5,
    ITEM_TYPE_BITLEN: 4,
    ITEM_TIER_BITLEN: 4,
    ITEM_ATK_SPD_BITLEN: 4,
    ITEM_CLASS_REQ_BITLEN: 4,
    TEXT_CHAR_LENGTH_BITLEN: 16,
}

/** Used to encode the text portions of a custom item. */
const bootstringEncoder = new BootstringEncoder(0, 1, 52, 104, 700, 38, '-');

/**
 * Encode a custom item and return the resulting vector.
 *
 * @param {Custom} custom - The Custom item object ot encode.
 * @param {boolean} verbose - whether to store some partially redundent fields.
 */
function encodeCustom(custom, verbose) {
    const customVec = new EncodingBitVector(0, 0, CUSTOM_ENC);
    if (!custom) return customVec;

    // Legacy versions always have their first bit set.
    customVec.append(0, 1);

    // Encode the encoding version
    customVec.append(CUSTOM_ENC.CUSTOM_ENCODING_VERSION, CUSTOM_ENC.CUSTOM_VERSION_BITLEN);

    // Encode whether the IDS are fixed or Not
    let fixedIDs = false;
    if (custom.statMap.get("fixID") === true) {
        fixedIDs = true;
        customVec.appendFlag("CUSTOM_FIXED_IDS_FLAG", "FIXED");
    } else {
        customVec.appendFlag("CUSTOM_FIXED_IDS_FLAG", "RANGED");
    }

    // Encode IDs
    for (const [i, id] of ci_save_order.entries()) {
        // TODO(@orgold): make a set from rolledIDs to make this check O(1).
        // This check occurs frequently accross the codebase and might be expensive.
        if (rolledIDs.includes(id)) {
            // Encode rolled IDs
            let valMin = custom.statMap.get("minRolls").has(id) ? custom.statMap.get("minRolls").get(id) : 0;
            let valMax = custom.statMap.get("maxRolls").has(id) ? custom.statMap.get("maxRolls").get(id) : 0;
            if (valMin === 0 && valMax === 0) continue;

            customVec.append(i, CUSTOM_ENC.ID_IDX_BITLEN)
            const minLen = Math.max(1, Math.floor(Math.log2(Math.abs(valMin))) + 2);
            const maxLen = Math.max(1, Math.floor(Math.log2(Math.abs(valMax))) + 2);
            const idLen = clamp(minLen, maxLen, 32);
            const mask = (1 << idLen) - 1
            customVec.append(idLen - 1, CUSTOM_ENC.ID_LENGTH_BITLEN);
            customVec.append(valMin & mask, idLen);
            if (!fixedIDs) customVec.append(valMax & mask, idLen);
        } else {
            // Encode non-rolled IDs
            let damages = ["nDam", "eDam", "tDam", "wDam", "fDam", "aDam"];
            let idVal = custom.statMap.get(id);

            if (id == "majorIds") {
                if (idVal.length > 0) {
                    idVal = idVal[0];
                } else {
                    idVal = "";
                }
            }

            if (typeof idVal === "string" && idVal !== "") {
                const verboseIDs = ["lore", "majorIds", "quest", "materials", "drop", "set"];
                if ((damages.includes(id) && idVal === "0-0") || (!verbose && verboseIDs.includes(id))) {
                    continue;
                }

                customVec.append(i, CUSTOM_ENC.ID_IDX_BITLEN);

                switch (id) {
                    case "type": customVec.append(all_types.indexOf(capitalizeFirst(idVal)), CUSTOM_ENC.ITEM_TYPE_BITLEN); break;
                    case "tier": customVec.append(tiers.indexOf(idVal), CUSTOM_ENC.ITEM_TIER_BITLEN); break;
                    case "atkSpd": customVec.append(attackSpeeds.indexOf(idVal), CUSTOM_ENC.ITEM_ATK_SPD_BITLEN); break;
                    case "classReq": customVec.append(classes.indexOf(capitalizeFirst(idVal)), CUSTOM_ENC.ITEM_CLASS_REQ_BITLEN); break;
                    default: {
                        const lenMask = (1 << CUSTOM_ENC.TEXT_CHAR_LENGTH_BITLEN) - 1;
                        const encodedText = bootstringEncoder.encode(idVal);
                        console.log(encodedText.length);
                        customVec.append(encodedText.length & lenMask, CUSTOM_ENC.TEXT_CHAR_LENGTH_BITLEN);
                        customVec.appendB64(encodedText);
                        break;
                    }
                }
            } else if (typeof idVal === "number" && idVal != 0) {
                // Non rolled numeric IDs
                customVec.append(i, CUSTOM_ENC.ID_IDX_BITLEN);
                const len = Math.min(32, Math.floor(Math.log2(Math.abs(idVal))) + 2);
                const mask = (1 << len) - 1;
                customVec.append(len - 1, CUSTOM_ENC.ID_LENGTH_BITLEN);
                customVec.append(idVal & mask, len);
            }
        }
    }

    // Pad with zeroes to fit perfectly in a B64 string
    customVec.append(0, 6 - (customVec.length % 6));
    return customVec;
}

/**
 * Legacy verison of encodeCustom.
 *
 * @param {Map} custom - the statMap of the CI
 * @param {boolean} verbose - if we want lore and majorIds to display
 */
function encodeCustomLegacy(custom, verbose) {
    if (custom) {
        if (custom.statMap) {
            custom = custom.statMap;
        }
        let hash = "1";
        //version 1
        if (custom.has("fixID") && custom.get("fixID")) {
            hash += "1";
        } else {
            hash += "0";
        }
        for (const i in ci_save_order) {
            let id = ci_save_order[i];
            if (rolledIDs.includes(id)) {
                let val_min = custom.get("minRolls").has(id) ? custom.get("minRolls").get(id) : 0;
                let val_max = custom.get("maxRolls").has(id) ? custom.get("maxRolls").get(id) : 0;
                // 0 - both pos
                // 1 - min neg max pos
                // 2 - min pos max neg (how?)
                // 3 - min neg max neg
                let sign = (Boolean(val_min / Math.abs(val_min) < 0) | 0) + 2 * (Boolean(val_max / Math.abs(val_max) < 0) | 0);
                //console.log(id + ": " + sign);
                let min_len = Math.max(1, Math.ceil(log(64, Math.abs(val_min) + 1)));
                let max_len = Math.max(1, Math.ceil(log(64, Math.abs(val_max) + 1)));
                let len = Math.max(min_len, max_len);
                val_min = Math.abs(val_min);
                val_max = Math.abs(val_max);

                if (val_min != 0 || val_max != 0) {
                    if (custom.get("fixID")) {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(len, 2) + sign + Base64.fromIntN(val_min, len);
                    } else {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(len, 2) + sign + Base64.fromIntN(val_min, len) + Base64.fromIntN(val_max, len);
                    }
                }
            } else {
                let damages = ["nDam", "eDam", "tDam", "wDam", "fDam", "aDam"]; //"nDam_", "eDam_", "tDam_", "wDam_", "fDam_", "aDam_"
                let val = custom.get(id);
                if (id == "majorIds") {
                    if (val.length > 0) {
                        val = val[0];
                    }
                    else {
                        val = "";
                    }
                }

                if (typeof (val) === "string" && val !== "") {
                    if ((damages.includes(id) && val === "0-0") || (!verbose && ["lore", "majorIds", "quest", "materials", "drop", "set"].includes(id))) { continue; }
                    if (id === "type") {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(all_types.indexOf(val.substring(0, 1).toUpperCase() + val.slice(1)), 1);
                    } else if (id === "tier") {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(tiers.indexOf(val), 1);
                    } else if (id === "atkSpd") {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(attackSpeeds.indexOf(val), 1);
                    } else if (id === "classReq") {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(classes.indexOf(val), 1);
                    } else {
                        hash += Base64.fromIntN(i, 2) + Base64.fromIntN(val.replaceAll(" ", "%20").length, 2) + val.replaceAll(" ", "%20"); //values cannot go above 4096 chars!!!! Is this ok?
                    }
                } else if (typeof (val) === "number" && val != 0) {
                    let len = Math.max(1, Math.ceil(log(64, Math.abs(val) + 1)));
                    let sign = Boolean(val / Math.abs(val) < 0) | 0;
                    //console.log(sign);
                    //hash += Base64.fromIntN(i,2) + Base64.fromIntN(val,Math.max(1,Math.ceil(log(64,Math.abs(val))))) + "_";
                    hash += Base64.fromIntN(i, 2) + Base64.fromIntN(len, 2) + sign + Base64.fromIntN(Math.abs(val), len);
                }
            }
        }

        return hash;
    }
    return "";
}

/**
 * Decode a custom item from a Base64 string representation or a BitVector. 
 * Falls back to legacy parsing if the hash supplied is a legacy hash, see "getCustomFromHash".
 *
 * @param {Object} arg
 * @param {BitVectorCursor | undefined} arg.cursor - A cursor into a bit vector representing the custom item. 
 * @param {string | undefined} arg.hash - A Base64 string representation of the custom item.
 */
function decodeCustom({cursor: cursor, hash: hash}) {
    if (cursor === undefined) {
        if (hash === undefined) throw new Error("decodeCustom must be called with either a hash or a BitVectorCursor.");
        cursor = new BitVectorCursor(new BitVector(hash, hash.length * 6));
    }

    const statMap = new Map();
    statMap.set("hash", "CI-" + cursor.bitVec.sliceB64(cursor.currIdx, cursor.endIdx));

    const legacy = cursor.advance();
    if (legacy) {
        if (hash === undefined) throw new Error("Tried to decode legacy encoded item but got binary.");
        const customItem = getCustomFromHash("CI-" + hash);
        return customItem;
    }

    statMap.set("minRolls", new Map())
    statMap.set("maxRolls", new Map())

    // here for future reference
    const version = cursor.advanceBy(CUSTOM_ENC.CUSTOM_VERSION_BITLEN);

    let fixedIDs = cursor.advanceBy(CUSTOM_ENC.CUSTOM_FIXED_IDS_FLAG.BITLEN) === CUSTOM_ENC.CUSTOM_FIXED_IDS_FLAG.FIXED;
    if (fixedIDs) statMap.set("fixID", true);

    while (cursor.currIdx + CUSTOM_ENC.ID_IDX_BITLEN <= cursor.endIdx) {
        const id = ci_save_order[cursor.advanceBy(CUSTOM_ENC.ID_IDX_BITLEN)];
        if (rolledIDs.includes(id)) {
            // Sign extend the id_len-bit values
            const idLen = cursor.advanceBy(CUSTOM_ENC.ID_LENGTH_BITLEN) + 1;
            const extension = 32 - idLen;
            const minRoll = (cursor.advanceBy(idLen) << extension) >> extension;
            if (!fixedIDs) {
                let maxRoll = (cursor.advanceBy(idLen) << extension) >> extension;
                statMap.get("minRolls").set(id, minRoll);
                statMap.get("maxRolls").set(id, maxRoll);
            } else {
                statMap.get("minRolls").set(id, minRoll);
                statMap.get("maxRolls").set(id, minRoll);
            }
            continue;
        }

        let idVal = null;

        if (non_rolled_strings.includes(id)) {
            switch (id) {
                case "type": idVal = all_types[cursor.advanceBy(CUSTOM_ENC.ITEM_TIER_BITLEN)]; break;
                case "tier": idVal = tiers[cursor.advanceBy(CUSTOM_ENC.ITEM_TYPE_BITLEN)]; break;
                case "atkSpd": idVal = attackSpeeds[cursor.advanceBy(CUSTOM_ENC.ITEM_ATK_SPD_BITLEN)]; break;
                case "classReq": idVal = classes[cursor.advanceBy(CUSTOM_ENC.ITEM_CLASS_REQ_BITLEN)]; break;
                default: {
                    let textLen = cursor.advanceBy(CUSTOM_ENC.TEXT_CHAR_LENGTH_BITLEN) & 0xFFFFFFFF;
                    const text = cursor.advanceByChars(textLen);
                    idVal = bootstringEncoder.decode(text); 
                    break;
                }
            }
        } else {
            const idLen = cursor.advanceBy(CUSTOM_ENC.ID_LENGTH_BITLEN) + 1;
            const extension = 32 - idLen;
            idVal = cursor.advanceBy(idLen) << extension >> extension;
        }
        if (id === "majorIds") idVal = [idVal];
        statMap.set(id, idVal);
    }

    statMap.set("custom", true);
    return new Custom(statMap);
}

/**
 * Legacy verison of `decodeCustom`.
 * NOTE: There's an issue with the interaction between powders and custom items
 * that causes the elemental of the item to change.
 * to reproduce check out this link and watch Obsolescent Panoply's elemental defenses after each reload: https://wynnbuilder.github.io/builder/#11_02sCI-10000LObsolescent%20Panoply0230401020500G020ee0H010o0J0215k0K010o0L020Fo0M0201D0O010P0P010P0R010Z0S010Z0T01050U01050V011A0t0106P0u013110z0200c2Z150106P160106P170106P180106P190106P2SH2SI2SJ2SK2SL2SM2SN0Qp0g1D0g0g0g1G10003600000z0z0+0+0+0+0-1T2Y2Y2Z2Z2a2a401401401401401
 *
 *
 * @param {string} hash - A Base64 representation of a custom item.
 */
function getCustomFromHash(hash) {
    let name = hash.slice();
    let statMap;
    try {
        if (name.slice(0, 3) === "CI-") {
            name = name.substring(3);
        } else {
            throw new Error("Not a custom item!");
        }

        //probably change vers and fixID to be encoded and decoded to/from B64 in the future
        let version = name.charAt(0);
        let fixID = Boolean(parseInt(name.charAt(1), 10));
        let tag = name.substring(2);
        statMap = new Map();
        statMap.set("minRolls", new Map());
        statMap.set("maxRolls", new Map());

        if (version === "1") {
            //do the things
            if (fixID) {
                statMap.set("fixID", true);
            }
            while (tag !== "") {
                let id = ci_save_order[Base64.toInt(tag.slice(0, 2))];
                let len = Base64.toInt(tag.slice(2, 4));
                if (rolledIDs.includes(id)) {
                    let sign = parseInt(tag.slice(4, 5), 10);
                    let minRoll = Base64.toInt(tag.slice(5, 5 + len));
                    if (!fixID) {
                        let maxRoll = Base64.toInt(tag.slice(5 + len, 5 + 2 * len));
                        if (sign > 1) {
                            maxRoll *= -1;
                        }
                        if (sign % 2 == 1) {
                            minRoll *= -1;
                        }
                        statMap.get("minRolls").set(id, minRoll);
                        statMap.get("maxRolls").set(id, maxRoll);
                        tag = tag.slice(5 + 2 * len);
                    } else {
                        if (sign != 0) {
                            minRoll *= -1;
                        }
                        statMap.get("minRolls").set(id, minRoll);
                        statMap.get("maxRolls").set(id, minRoll);
                        tag = tag.slice(5 + len);
                    }
                } else {
                    let val;
                    if (non_rolled_strings.includes(id)) {
                        if (id === "tier") {
                            val = tiers[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else if (id === "type") {
                            val = all_types[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else if (id === "atkSpd") {
                            val = attackSpeeds[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else if (id === "classReq") {
                            val = classes[Base64.toInt(tag.charAt(2))];
                            len = -1;
                        } else { //general case
                            val = tag.slice(4, 4 + len).replaceAll("%20", " ");
                        }
                        tag = tag.slice(4 + len);
                    } else {
                        let sign = parseInt(tag.slice(4, 5), 10);
                        val = Base64.toInt(tag.slice(5, 5 + len));
                        if (sign == 1) {
                            val *= -1;
                        }
                        tag = tag.slice(5 + len);
                    }
                    if (id === "majorIds") {
                        val = [val];
                    }
                    statMap.set(id, val);
                }
            }
            statMap.set("hash", "CI-" + name);
            statMap.set("custom", true);
            return new Custom(statMap);
        }
    } catch (error) {
        console.log(error);
        console.log(statMap);
        return undefined;
    }

}

/** An object representing a Custom Item. Mostly for vanity purposes.
 * @dep Requires the use of attackSpeeds from `builder/build.js`.
*/
class Custom {
    /**
     * @description Construct a custom item (CI) from a statMap. 
     * @param {statMap}: A map with keys from rolledIDs or nonRolledIDs or minRolls/maxRolls and values befitting the keys. minRolls and maxRolls are their own maps and have the same keys, but with minimum and maximum values (for rolls). 
     * 
     */
    constructor(statMap) {
        this.statMap = statMap;
        // TODO patch
        // this.statMap.set("majorIds", [this.statMap.get("majorIds")]);
        this.initCustomStats();
    }

    setHash(hash) {
        let ihash = hash.slice();
        if (ihash.slice(0, 3) !== "CI-") {
            ihash = "CI-" + hash;
        }

        this.hash = ihash;
        this.statMap.set("hash", ihash);
    }

    updateName(name) {
        this.name = name;
        this.displayName = name;
    }

    /* Get all stats for this CI. 
     * Stores in this.statMap.
     * Follows the expandedItem item structure, similar to a crafted item.
     * TODO: Check if this is even useful
    */
    initCustomStats() {
        //this.setHashVerbose(); //do NOT move sethash from here please
        // console.log(this.statMap);

        for (const id of ci_save_order) {
            if (rolledIDs.includes(id)) {
                if (!(this.statMap.get("minRolls").has(id) && this.statMap.get("minRolls").get(id))) {
                    this.statMap.get("minRolls").set(id, 0);
                    this.statMap.get("maxRolls").set(id, 0);
                }
            } else {
                if (non_rolled_strings.includes(id)) {
                    if (!(this.statMap.has(id) && this.statMap.get(id))) {
                        this.statMap.set(id, "");
                    }
                } else {
                    if (!(this.statMap.has(id) && this.statMap.get(id))) {
                        this.statMap.set(id, 0);
                    }
                }
            }
        }
        let type = this.statMap.get("type").toLowerCase();
        if (weaponTypes.includes(type)) {
            for (const n of ["nDam", "eDam", "tDam", "wDam", "fDam", "aDam"]) {
                if (!(this.statMap.has(n) && this.statMap.get(n))) {
                    this.statMap.set(n, "0-0");
                }
            }
        }
        else {
            for (const n of ["nDam", "eDam", "tDam", "wDam", "fDam", "aDam"]) {
                if (this.statMap.has(n)) {
                    this.statMap.delete(n);
                }
            }
        }

        if (this.statMap.get("type")) {
            this.statMap.set("type", this.statMap.get("type").toLowerCase());
            if (armorTypes.includes(this.statMap.get("type"))) {
                this.statMap.set("category", "armor");
            } else if (accessoryTypes.includes(this.statMap.get("type"))) {
                this.statMap.set("category", "accessory");
            } else if (weaponTypes.includes(this.statMap.get("type"))) {
                this.statMap.set("category", "weapon");
            } else if (consumableTypes.includes(this.statMap.get("type"))) {
                this.statMap.set("category", "consumable");
            } else if (tome_types.includes(this.statMap.get("type"))) {
                this.statMap.set("category", "tome");
            }
        }

        if (this.statMap.get("tier") === "Crafted") {
            this.statMap.set("crafted", true);

            for (const e of skp_elements) {
                this.statMap.set(e + "DamLow", this.statMap.get(e + "Dam"));
            }
            this.statMap.set("nDamLow", this.statMap.get("nDam"));
            this.statMap.set("hpLow", this.statMap.get("hp"));
            for (const e of skp_order) {
                this.statMap.get("minRolls").set(e, this.statMap.get(e));
                this.statMap.get("maxRolls").set(e, this.statMap.get(e));
            }
            // for (const e of ["durability", "duration"]) {
            //     if (this.statMap.get(e) === "") {
            //         this.statMap.set(e, [0,0]);
            //     } else {
            //         this.statMap.set(e, [this.statMap.get(e).split("-")[0],this.statMap.get(e).split("-")[1]])
            //     }
            // }

            this.statMap.set("lvlLow", this.statMap.get("lvl"));
            if (this.statMap.get("category") === "weapon") {
                //this is for powder purposes.
                //users will likely not stick to the 0.9,1.1 rule because custom item. We will get around this by breaking everything and rewarding users for sticking to 0.9,1.1.
                this.statMap.set("nDamBaseLow", Math.floor((parseFloat(this.statMap.get("nDamLow")) + parseFloat(this.statMap.get("nDam"))) / 2));
                this.statMap.set("nDamBaseHigh", Math.floor((parseFloat(this.statMap.get("nDamLow")) + parseFloat(this.statMap.get("nDam"))) / 2));
                for (const e in skp_elements) {
                    this.statMap.set(skp_elements[e] + "DamBaseLow", Math.floor((parseFloat(this.statMap.get(skp_elements[e] + "DamLow")) + parseFloat(this.statMap.get(skp_elements[e] + "Dam"))) / 2));
                    this.statMap.set(skp_elements[e] + "DamBaseHigh", Math.floor((parseFloat(this.statMap.get(skp_elements[e] + "DamLow")) + parseFloat(this.statMap.get(skp_elements[e] + "Dam"))) / 2));
                }
                this.statMap.set("ingredPowders", []);
            }
        }

        if (this.statMap.get("category") !== "weapon") {
            this.statMap.set("atkSpd", "");
            for (const n in ["nDam", "eDam", "tDam", "wDam", "fDam", "aDam"]) {
                //this.statMap.set(n,"");
            }
        } else {

        }


        if (this.statMap.get("name") && this.statMap.get("name") !== "") {
            this.statMap.set("displayName", this.statMap.get("name"));
        } else {
            this.statMap.set("displayName", "Custom Item");
        }
        this.statMap.set("powders", []);


        this.statMap.set("reqs", [this.statMap.get("strReq"), this.statMap.get("dexReq"), this.statMap.get("intReq"), this.statMap.get("defReq"), this.statMap.get("agiReq")]);
        this.statMap.set("skillpoints", [this.statMap.get("str"), this.statMap.get("dex"), this.statMap.get("int"), this.statMap.get("def"), this.statMap.get("agi")]);


        this.statMap.set("restrict", "Custom Item")
    }

    copy() {
        return new Custom(new Map(this.statMap));
    }
}
