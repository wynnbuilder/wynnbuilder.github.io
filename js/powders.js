let powderIDs = new Map();
let powderNames = new Map();
let _powderID = 0;
let POWDER_TIERS = 6;

for (const x of skp_elements) {
    for (let i = 1; i <= POWDER_TIERS; ++i) {
        powderIDs.set(x+i, _powderID);
        powderNames.set(_powderID, x+i);
        _powderID++;
    }
}

// Ordering: [dmgMin, dmgMax, convert, defPlus, defMinus (+6 mod 5)]
class Powder {
    constructor(min, max, convert, defPlus, defMinus) {
        this.min = min;
        this.max = max;
        this.convert = convert;
        this.defPlus = defPlus;
        this.defMinus = defMinus;
    }
}
function _p(a,b,c,d,e) { return new Powder(a,b,c,d,e); } //bruh moment

let powderStats = [
    _p(3,6,17,2,1), _p(5,8,21,4,2), _p(6,10,25,8,3), _p(7,10,31,14,5), _p(9,11,38,22,9), _p(11,13,46,30,13),
    _p(1,8,9,3,1), _p(1,12,11,5,1), _p(2,15,13,9,2), _p(3,15,17,14,4), _p(4,17,22,20,7), _p(5,20,28,28,10),
    _p(3,4,13,3,1), _p(4,6,15,6,1), _p(5,8,17,11,2), _p(6,8,21,18,4), _p(7,10,26,28,7), _p(9,11,32,40,10),
    _p(2,5,14,3,1), _p(4,8,16,5,2), _p(5,9,19,9,3), _p(6,9,24,16,5), _p(8,10,30,25,9), _p(10,12,37,36,13),
    _p(2,6,11,3,1), _p(3,10,14,6,2), _p(4,11,17,10,3), _p(5,11,22,16,5), _p(7,12,28,24,9), _p(8,14,35,34,13)
];

//Ordering: [weapon special name, weapon special effects, armor special name, armor special effects]
class PowderSpecial{
    constructor(wSpName, wSpEff, aSpName, aSpEff, cap){
        this.weaponSpecialName = wSpName;
        this.weaponSpecialEffects = wSpEff;
        this.armorSpecialName = aSpName;
        this.armorSpecialEffects = aSpEff;
        this.cap = cap;
    }
}
function _ps(a,b,c,d,e) { return new PowderSpecial(a,b,c,d,e); } //bruh moment

let powderSpecialStats = [
    _ps("Quake",new Map([["Radius",[4.5,5,5.5,6,6.5]], ["Damage",[240,280,320,360,400]] ]),"Rage",new Map([ ["Damage", [0.2,0.4,0.6,0.8,1.0]],["Description", "% " + "\u2764" + " Missing below 75%"] ]),240), //e
    _ps("Chain Lightning",new Map([ ["Chains", [5,6,7,8,9]], ["Damage", [200,225,250,275,300]] ]),"Kill Streak",new Map([ ["Damage", [3,4.5,6,7.5,9]],["Duration", [5,5,5,5,5]],["Description", "Mob Killed"] ]),150), //t
    _ps("Curse",new Map([ ["Duration", [4,4,4,4,4]],["Damage Boost", [10,12.5,15,17.5,20]] ]),"Concentration",new Map([ ["Damage", [0.05,0.1,0.15,0.2,0.25]],["Duration",[1,1,1,1,1]],["Description", "Mana Used"] ]),100), //w
    _ps("Courage",new Map([ ["Duration", [4,4,4,4,4]],["Damage", [60, 70, 80, 90, 100]],["Damage Boost", [10,12.5,15,17.5,20]] ]),"Endurance",new Map([ ["Damage", [2,3,4,5,6]],["Duration", [8,8,8,8,8]],["Description", "Hit Taken"] ]),100), //f
    _ps("Wind Prison",new Map([ ["Duration", [3,3.5,4,4.5,5]],["Damage Boost", [100,125,150,175,200]],["Knockback", [8,12,16,20,24]] ]),"Dodge",new Map([ ["Damage",[2,3,4,5,6]],["Duration",[2,3,4,5,6]],["Description","Near Mobs"] ]),100) //a
];

/**
 * TODO(@orgold): Document
 */
function decodePowderIdx(powder_idx, num_tiers) {
    assert(POWDER_TIERS >= num_tiers, "The versioned data's tiers can never exceed the cutting edge amount: this breaks encoding.");
    const pid = powder_idx + Math.floor((powder_idx / num_tiers)) * (POWDER_TIERS - num_tiers);
    return pid;
}

/**
 * TODO(@orgold): Document
 */
function encodePowderIdx(powder_idx, num_tiers) {
    assert(POWDER_TIERS >= num_tiers, "The versioned data's tiers can never exceed the cutting edge amount: this breaks encoding.");
    const pid = Math.floor(powder_idx / POWDER_TIERS) * num_tiers + (powder_idx % POWDER_TIERS);
    return pid;
}

/**
 * Apply armor powders.
 * Encoding shortcut assumes that all powders give +def to one element
 * and -def to the element "behind" it in cycle ETWFA, which is true
 * as of now and unlikely to change in the near future.
 */
function applyArmorPowders(expandedItem) {
    const powders = expandedItem.get('powders');
    for(const id of powders){
        let powder = powderStats[id];
        let name = powderNames.get(id).charAt(0);
        let prevName = skp_elements[(skp_elements.indexOf(name) + 4 )% 5];
        expandedItem.set(name+"Def", (expandedItem.get(name+"Def") || 0) + powder["defPlus"]);
        expandedItem.set(prevName+"Def", (expandedItem.get(prevName+"Def") || 0) - powder["defMinus"]);
    }
}

const damage_keys = [ "nDam_", "eDam_", "tDam_", "wDam_", "fDam_", "aDam_" ];
const damage_present_key = 'damagePresent';
/**
 * Apply weapon powders. MUTATES THE ITEM!
 * Adds entries for `damage_keys` and `damage_present_key`
 * For normal items, `damage_keys` is 6x2 list (elem: [min, max])
 * For crafted items, `damage_keys` is 6x2x2 list (elem: [minroll: [min, max], maxroll: [min, max]])
 */
function apply_weapon_powders(item) {
    let present;
    if (item.get("tier") !== "Crafted") {
        let weapon_result = calc_weapon_powder(item);
        let damages = weapon_result[0];
        present = weapon_result[1];
        for (const i in damage_keys) {
            item.set(damage_keys[i], damages[i]);
        }
    } else {
        let base_low = [item.get("nDamBaseLow"),item.get("eDamBaseLow"),item.get("tDamBaseLow"),item.get("wDamBaseLow"),item.get("fDamBaseLow"),item.get("aDamBaseLow")];
        let results_low = calc_weapon_powder(item, base_low);
        let damage_low = results_low[0];
        let base_high = [item.get("nDamBaseHigh"),item.get("eDamBaseHigh"),item.get("tDamBaseHigh"),item.get("wDamBaseHigh"),item.get("fDamBaseHigh"),item.get("aDamBaseHigh")];
        let results_high = calc_weapon_powder(item, base_high);
        let damage_high = results_high[0];
        present = results_high[1];
        
        for (const i in damage_keys) {
            item.set(damage_keys[i], [damage_low[i], damage_high[i]]);
        }
    }
    item.set(damage_present_key, present);
}

/**
 * Calculate weapon damage from powder.
 *
 * Params:
 * weapon: Weapon to apply powder to
 * damageBases: used by crafted
 *
 * Return:
 * [damages, damage_present]
 */
function calc_weapon_powder(weapon, damageBases) {
    let powders = weapon.get("powders").slice();

    // Array of neutral + ewtfa damages. Each entry is a pair (min, max).
    let damages = [
        weapon.get('nDam').split('-').map(Number),
        weapon.get('eDam').split('-').map(Number),
        weapon.get('tDam').split('-').map(Number),
        weapon.get('wDam').split('-').map(Number),
        weapon.get('fDam').split('-').map(Number),
        weapon.get('aDam').split('-').map(Number)
    ];

    //Give crafted weapons a base damage
    if(damageBases != null)
        damages[0] = [Math.floor(damageBases[0] * 0.9), Math.floor(damageBases[0] * 1.1)];

    //Applying Spell Conversions
    //let neutralBase = damages[0].slice();
    let neutralRemainingRaw = damages[0].slice();

    //apply powders to weapon (1.21 fked implementation)
    let powder_apply_order = [];
    let powder_apply_map = new Map();
    
    //First apply powders from powder master, then ingredients if crafted, then calculate the total change.
    for (const powderID of powders) {
        const powder = powderStats[powderID];
        // Bitwise to force conversion to integer (integer division).
        const element = (powderID/6) | 0;
        const conversion_ratio = powder.convert/100;

        if (powder_apply_map.has(element)) {
            let apply_info = powder_apply_map.get(element);
            apply_info.conv += conversion_ratio;
            apply_info.min += powder.min;
            apply_info.max += powder.max;
        }
        else {
            let apply_info = {
                conv: conversion_ratio,
                min: powder.min,
                max: powder.max
            };
            powder_apply_order.push(element);
            powder_apply_map.set(element, apply_info);
        }
    }

    //New 2.1 calculations for crafted ingredient powders
    //TODO: more verification that this is correct?
    //Essentially, ingredient powders now apply after the powder master application.
    if (weapon.get("tier") === "Crafted" && !weapon.get("custom")) {
        for (const p of weapon.get("ingredPowders")) {
            const powder = powderStats[p];  //use min, max, and convert
            // Bitwise to force conversion to integer (integer division).
            const element = (p/6) | 0;
            
            //Half the normal bonuses for powders
            let powder_max_bonus = Math.floor(powder.max / 2);
            let powder_min_bonus = Math.floor(powder.min / 2);
            let powder_conv_bonus = powder.convert / 100 / 2;

            if (powder_apply_map.has(element)) {
                let apply_info = powder_apply_map.get(element);
                apply_info.conv += powder_conv_bonus;
                apply_info.min += powder_min_bonus;
                apply_info.max += powder_max_bonus;
            }
            else {
                let apply_info = {
                    conv: powder_conv_bonus,
                    min: powder_min_bonus,
                    max: powder_max_bonus
                };
                powder_apply_order.push(element);
                powder_apply_map.set(element, apply_info);
            }
        }
    }

    for (const element of powder_apply_order) {
        const apply_info = powder_apply_map.get(element);
        const conversion_ratio = apply_info.conv;
        const min_diff = Math.min(neutralRemainingRaw[0], conversion_ratio * neutralRemainingRaw[0]);
        const max_diff = Math.min(neutralRemainingRaw[1], conversion_ratio * neutralRemainingRaw[1]);
        neutralRemainingRaw[0] -= min_diff;
        neutralRemainingRaw[1] -= max_diff;
        damages[element+1][0] += min_diff;
        damages[element+1][1] += max_diff;
        damages[element+1][0] += apply_info.min;
        damages[element+1][1] += apply_info.max;
    }

    /*
    //apply powders to weapon
    for (const powderID of powders) {
        const powder = powderStats[powderID];
        // Bitwise to force conversion to integer (integer division).
        const element = (powderID/6) | 0;
        let conversionRatio = powder.convert/100;
        if (neutralRemainingRaw[1] > 0) {
            let min_diff = Math.min(neutralRemainingRaw[0], conversionRatio * neutralBase[0]);
            let max_diff = Math.min(neutralRemainingRaw[1], conversionRatio * neutralBase[1]);

            damages[element+1][0] = Math.floor(round_near(damages[element+1][0] + min_diff));
            damages[element+1][1] = Math.floor(round_near(damages[element+1][1] + max_diff));
            neutralRemainingRaw[0] = Math.floor(round_near(neutralRemainingRaw[0] - min_diff));
            neutralRemainingRaw[1] = Math.floor(round_near(neutralRemainingRaw[1] - max_diff));
            //damages[element+1][0] += min_diff;
            //damages[element+1][1] += max_diff;
            //neutralRemainingRaw[0] -= min_diff;
            //neutralRemainingRaw[1] -= max_diff;
        }
        damages[element+1][0] += powder.min;
        damages[element+1][1] += powder.max;
    }
    */

    // The ordering of these two blocks decides whether neutral is present when converted away or not.
    damages[0] = neutralRemainingRaw;

    // The ordering of these two blocks decides whether neutral is present when converted away or not.
    let present_elements = []
    for (const damage of damages) {
        present_elements.push(damage[1] > 0);
    }
    return [damages, present_elements];
}
