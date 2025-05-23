let colorMap = new Map(
    [
        ["Normal", "#fff"],
        ["Unique", "#ff5"],
        ["Rare","#f5f"],
        ["Legendary","#5ff"],
        ["Fabled","#f55"],
        ["Mythic","#a0a"],
        ["Crafted","#0aa"],
        ["Custom","#0aa"],
        ["Set","#5f5"]
    ]
);
let idPrefixes = {"displayName": "",
    "lvl":"Combat Level Min: ",
    "classReq":"Class Req: ",
    "strReq":"Strength Min: ",
    "dexReq":"Dexterity Min: ",
    "intReq":"Intelligence Min: ",
    "defReq":"Defense Min: ",
    "agiReq":"Agility Min: ",
    "nDam_":"Neutral Damage: ",
    "eDam_":"Earth Damage: ",
    "tDam_":"Thunder Damage: ",
    "wDam_":"Water Damage: ",
    "fDam_":"Fire Damage: ",
    "aDam_":"Air Damage: ",
    "atkSpd":"Attack Speed: ",
    "hp":"Health : ",
    "eDef":"Earth Defense: ",
    "tDef":"Thunder Defense: ",
    "wDef":"Water Defense: ",
    "fDef":"Fire Defense: ",
    "aDef":"Air Defense: ",
    "str":"Strength: ",
    "dex":"Dexterity: ",
    "int":"Intelligence: ",
    "def":"Defense: ",
    "agi":"Agility: ",
    "hpBonus":"Health Bonus: ",
    "hprRaw":"Raw Health Regen: ",
    "hprPct":"Health Regen %: ",
    "healPct":"Heal Effectiveness %: ",
    "sdRaw":"Spell Damage Raw: ",
    "rSdRaw":"Elem. Spell Damage Raw: ",
    "nSdRaw":"Neut. Spell Damage Raw: ",
    "eSdRaw":"Earth Spell Damage Raw: ",
    "tSdRaw":"Thunder Spell Damage Raw: ",
    "wSdRaw":"Water Spell Damage Raw: ",
    "fSdRaw":"Fire Spell Damage Raw: ",
    "aSdRaw":"Air Spell Damage Raw: ",
    "sdPct":"Spell Damage %: ",
    "rSdPct":"Elem. Spell Damage %: ",
    "nSdPct":"Neut. Spell Damage %: ",
    "eSdPct":"Earth Spell Damage %: ",
    "tSdPct":"Thunder Spell Damage %: ",
    "wSdPct":"Water Spell Damage %: ",
    "fSdPct":"Fire Spell Damage %: ",
    "aSdPct":"Air Spell Damage %: ",
    "mdRaw":"Melee Damage Raw: ",
    "rMdRaw":"Elem. Melee Damage Raw: ",
    "nMdRaw":"Neut. Melee Damage Raw: ",
    "eMdRaw":"Earth Melee Damage Raw: ",
    "tMdRaw":"Thunder Melee Damage Raw: ",
    "wMdRaw":"Water Melee Damage Raw: ",
    "fMdRaw":"Fire Melee Damage Raw: ",
    "aMdRaw":"Air Melee Damage Raw: ",
    "mdPct":"Melee Damage %: ",
    "rMdPct":"Elem. Melee Damage %: ",
    "nMdPct":"Neut. Melee Damage %: ",
    "eMdPct":"Earth Melee Damage %: ",
    "tMdPct":"Thunder Melee Damage %: ",
    "wMdPct":"Water Melee Damage %: ",
    "fMdPct":"Fire Melee Damage %: ",
    "aMdPct":"Air Melee Damage %: ",
    "damRaw":"Damage Raw: ",
    "rDamRaw":"Elemental Damage Raw: ",
    "nDamRaw":"Neutral Damage Raw: ",
    "eDamRaw":"Earth Damage Raw: ",
    "tDamRaw":"Thunder Damage Raw: ",
    "wDamRaw":"Water Damage Raw: ",
    "fDamRaw":"Fire Damage Raw: ",
    "aDamRaw":"Air Damage Raw: ",
    "damPct":"Damage %: ",
    "rDamPct":"Elemental Damage %: ",
    "nDamPct":"Neutral Damage %: ",
    "eDamPct":"Earth Damage %: ",
    "tDamPct":"Thunder Damage %: ",
    "wDamPct":"Water Damage %: ",
    "fDamPct":"Fire Damage %: ",
    "aDamPct":"Air Damage %: ",
    "critDamPct":"Crit Damage Bonus %: ",
    "mr":"Mana Regen: ",
    "ms":"Mana Steal: ",
    "ref":"Reflection: ",
    "ls":"Life Steal: ",
    "poison":"Poison: ",
    "thorns":"Thorns: ",
    "expd":"Exploding: ",
    "spd":"Walk Speed Bonus: ",
    "atkTier":"Attack Speed Bonus: ",
    "eDefPct":"Earth Defense %: ",
    "tDefPct":"Thunder Defense %: ",
    "wDefPct":"Water Defense %: ",
    "fDefPct":"Fire Defense %: ",
    "aDefPct":"Air Defense %: ",
    "rDefPct":"Elemental Defense %: ",
    "spPct1":"1st Spell Cost %: ",
    "spRaw1":"1st Spell Cost Raw: ",
    "spPct2":"2nd Spell Cost %: ",
    "spRaw2":"2nd Spell Cost Raw: ",
    "spPct3":"3rd Spell Cost %: ",
    "spRaw3":"3rd Spell Cost Raw: ",
    "spPct4":"4th Spell Cost %: ",
    "spRaw4":"4th Spell Cost Raw: ",
    "sprint":"Sprint Bonus: ",
    "sprintReg":"Sprint Regen Bonus: ",
    "jh":"Jump Height: ",
    "xpb":"Combat XP Bonus: ",
    "lb":"Loot Bonus: ",
    "lq":"Loot Quality: ",
    "spRegen":"Soul Point Regen: ",
    "eSteal":"Stealing: ",
    "gXp":"Gathering XP Bonus: ",
    "gSpd":"Gathering Speed Bonus: ",
    "kb":"Knockback: ",
    "weakenEnemy":"Weaken Enemy: ",
    "slowEnemy":"Slow Enemy: ",
    "maxMana":"Max Mana: ",
    "mainAttackRange":"Melee Range %: ",
    "slots":"Powder Slots: ",
    "set":"Set: ",
    "quest":"Quest Req: ",
    "restrict":"",
    "lore": ""
};

let idSuffixes = {"displayName": "",
    "lvl":"",
    "classReq":"",
    "strReq":"",
    "dexReq":"",
    "intReq":"",
    "defReq":"",
    "agiReq":"",
    "nDam_":"",
    "eDam_":"",
    "tDam_":"",
    "wDam_":"",
    "fDam_":"",
    "aDam_":"",
    "atkSpd":"",
    "hp":"",
    "eDef":"",
    "tDef":"",
    "wDef":"",
    "fDef":"",
    "aDef":"",
    "str":"",
    "dex":"",
    "int":"",
    "def":"",
    "agi":"",
    "hpBonus":"",
    "hprRaw":"",
    "hprPct":"%",
    "healPct":"%",
    "sdRaw":"",
    "rSdRaw":"",
    "nSdRaw":"",
    "eSdRaw":"",
    "tSdRaw":"",
    "wSdRaw":"",
    "fSdRaw":"",
    "aSdRaw":"",
    "sdPct":"%",
    "rSdPct":"%",
    "nSdPct":"%",
    "eSdPct":"%",
    "tSdPct":"%",
    "wSdPct":"%",
    "fSdPct":"%",
    "aSdPct":"%",
    "mdRaw":"",
    "rMdRaw":"",
    "nMdRaw":"",
    "eMdRaw":"",
    "tMdRaw":"",
    "wMdRaw":"",
    "fMdRaw":"",
    "aMdRaw":"",
    "mdPct":"%",
    "rMdPct":"%",
    "nMdPct":"%",
    "eMdPct":"%",
    "tMdPct":"%",
    "wMdPct":"%",
    "fMdPct":"%",
    "aMdPct":"%",
    "damRaw":"",
    "rDamRaw":"",
    "nDamRaw":"",
    "eDamRaw":"",
    "tDamRaw":"",
    "wDamRaw":"",
    "fDamRaw":"",
    "aDamRaw":"",
    "damPct":"%",
    "rDamPct":"%",
    "nDamPct":"%",
    "eDamPct":"%",
    "tDamPct":"%",
    "wDamPct":"%",
    "fDamPct":"%",
    "aDamPct":"%",
    "critDamPct":"%",
    "mr":"/5s",
    "ms":"/3s",
    "ref":"%",
    "ls":"/3s",
    "poison":"/3s",
    "thorns":"%",
    "expd":"%",
    "spd":"%",
    "atkTier":" tier",
    "eDefPct":"%",
    "tDefPct":"%",
    "wDefPct":"%",
    "fDefPct":"%",
    "aDefPct":"%",
    "rDefPct":"%",
    "spPct1":"%",
    "spRaw1":"",
    "spPct2":"%",
    "spRaw2":"",
    "spPct3":"%",
    "spRaw3":"",
    "spPct4":"%",
    "spRaw4":"",
    "sprint":"%",
    "sprintReg":"%",
    "jh":"",
    "xpb":"%",
    "lb":"%",
    "lq":"%",
    "spRegen":"%",
    "eSteal":"%",
    "gXp":"%",
    "gSpd":"%",
    "kb": "%",
    "weakenEnemy": "%",
    "slowEnemy": "%",
    "maxMana": "",
    "mainAttackRange": "%",
    "slots":"",
    "set":" set.",
    "quest":"",
    "restrict":"",
    "lore": "",
};

//Used for item IDs and ingredient id field IDs
//Used for ingredient IDs - name, lvl, tier. As of now, not used.
/*let ingPrefixes = {"name": "", "lvl": "", "tier": ""};
let ingSuffixes = {"name": "", "lvl": "", "tier": ""}*/
//Used for ingredient consumableIDs
let consumableIDPrefixes = {
    "charges": "Charges: ",
    "dura": "Duration: "
}
let consumableIDSuffixes = {
    "charges": "",
    "dura": " sec."
}
//Used for ingredient itemIDs
let itemIDPrefixes = {
    "dura": "Durability: ",
    "strReq": "Strength Min: ",
    "dexReq": "Dexterity Min: ",
    "intReq": "Intelligence Min: ",
    "defReq": "Defense Min: ",
    "agiReq": "Agility Min: "
}

//Used for ingredient posMods IDs
let posModPrefixes = {
    "left":"Effectiveness Left: ",
    "right":"Effectiveness Right: ",
    "above":"Effectiveness Above: ",
    "under":"Effectiveness Under: ",
    "touching":"Effectiveness Touching: ",
    "notTouching":"Effectiveness Not Touching: "
}
let posModSuffixes = {
    "left":"%",
    "right":"%",
    "above":"%",
    "under":"%",
    "touching":"%",
    "notTouching":"%"
}

/*
 * Display commands
 */
let build_overall_display_commands = [
    "#defense-stats",
    "!spacer",
    "mr", "ms",
    "ls",
    "poison",
    "ref", "thorns",
    "expd",
    "spd",
    "sprint", "sprintReg",
    "jh",
    "xpb", "lb", "lq",
    "spRegen",
    "eSteal",
    "gXp", "gSpd",
    "kb", "weakenEnemy", "slowEnemy",
];

let build_detailed_display_commands = [
    "#defense-stats",
    "!spacer",
    "mr", "ms", "maxMana",
    "hprRaw", "hprPct", "healPct",
    "ls",
    "!spacer",
    "sdRaw", "nSdRaw", "rSdRaw",
    "sdPct", "nSdPct", "rSdPct",
    "mdRaw", "nMdRaw", "rMdRaw",
    "mdPct", "nMdPct", "rMdPct",
    "damRaw", "nDamRaw", "rDamRaw",
    "damPct", "nDamPct", "rDamPct",
    "!elemental",
    "eSdRaw", "tSdRaw", "wSdRaw", "fSdRaw", "aSdRaw",
    "eSdPct", "tSdPct", "wSdPct", "fSdPct", "aSdPct",
    "eMdRaw", "tMdRaw", "wMdRaw", "fMdRaw", "aMdRaw",
    "eMdPct", "tMdPct", "wMdPct", "fMdPct", "aMdPct",
    "eDamRaw", "tDamRaw", "wDamRaw", "fDamRaw", "aDamRaw",
    "eDamPct", "tDamPct", "wDamPct", "fDamPct", "aDamPct",
    "eDefPct", "tDefPct", "wDefPct", "fDefPct", "aDefPct",
    "!elemental",
    "critDamPct",
    "!spacer",
    "rDefPct",
    "spPct1", "spRaw1", "spPct2", "spRaw2", "spPct3", "spRaw3", "spPct4", "spRaw4",
    "atkTier",
    "poison",
    "ref", "thorns",
    "expd",
    "spd",
    "sprint", "sprintReg",
    "jh",
    "xpb", "lb", "lq",
    "spRegen",
    "eSteal",
    "gXp", "gSpd",
    "kb", "weakenEnemy", "slowEnemy",
    "mainAttackRange"
];

// full
//"#defense-stats",
//"str", "dex", "int", "def", "agi",
//"!spacer",
//"mr", "ms",
//"hprRaw", "hprPct",
//"ls",
//"sdRaw", "sdPct",
//"mdRaw", "mdPct",
//"!elemental",
//"fDamPct", "wDamPct", "aDamPct", "tDamPct", "eDamPct",
//"!elemental",
//"spPct1", "spRaw1", "spPct2", "spRaw2", "spPct3", "spRaw3", "spPct4", "spRaw4",
//"atkTier",
//"poison",
//"ref", "thorns",
//"expd",
//"spd",
//"rainbowRaw",
//"sprint", "sprintReg",
//"jh",
//"xpb", "lb", "lq",
//"spRegen",
//"eSteal",
//"gXp", "gSpd",

let build_basic_display_commands = [
    '#defense-stats',
    // defense stats [hp, ehp, hpr, ]
    // "sPot", // base * atkspd + spell raws
    // melee potential
    // "mPot", // melee% * (base * atkspd) + melee raws
    "mr", "ms",
    "ls",
    "poison",
    "spd",
    "atkTier",
]

let sq2_item_display_commands = [
    "displayName",
    "atkSpd",
    "!elemental",
    "hp",
    "nDam_", "eDam_", "tDam_", "wDam_", "fDam_", "aDam_",
    "!spacer",
    "fDef", "wDef", "aDef", "tDef", "eDef",
    "!elemental",
    "classReq",
    "lvl",
    "strReq", "dexReq", "intReq", "defReq","agiReq",
    "!spacer",
    "str", "dex", "int", "def", "agi",
    "hpBonus",
    "hprRaw", "hprPct", "healPct",
    "mr", "ms",
    "ref", "thorns",
    "ls",
    "poison",
    "expd",
    "spd",
    "atkTier",
    "sdRaw", "nSdRaw", "rSdRaw",
    "sdPct", "nSdPct", "rSdPct",
    "mdRaw", "nMdRaw", "rMdRaw",
    "mdPct", "nMdPct", "rMdPct",
    "damRaw", "nDamRaw", "rDamRaw",
    "damPct", "nDamPct", "rDamPct",
    "!elemental",
    "fSdRaw", "wSdRaw", "aSdRaw", "tSdRaw", "eSdRaw",
    "fSdPct", "wSdPct", "aSdPct", "tSdPct", "eSdPct",
    "fMdRaw", "wMdRaw", "aMdRaw", "tMdRaw", "eMdRaw",
    "fMdPct", "wMdPct", "aMdPct", "tMdPct", "eMdPct",
    "fDamRaw", "wDamRaw", "aDamRaw", "tDamRaw", "eDamRaw",
    "fDamPct", "wDamPct", "aDamPct", "tDamPct", "eDamPct",
    "fDefPct", "wDefPct", "aDefPct", "tDefPct", "eDefPct",
    "critDamPct",
    "!elemental",
    "rDefPct",

    "spPct1", "spRaw1", "spPct2", "spRaw2", "spPct3", "spRaw3", "spPct4", "spRaw4",
    "sprint", "sprintReg",
    "jh",
    "xpb", "lb", "lq",
    "spRegen",
    "eSteal",
    "gXp", "gSpd",
    "kb", "weakenEnemy", "slowEnemy", "maxMana",
    "mainAttackRange",
    "majorIds",
    "!spacer",
    "slots",
    "!spacer",
    "set",
    "lore",
    "quest",
    "restrict",
];

let sq2_ing_display_order = [
    "displayName", //tier will be displayed w/ name
    "!spacer",
    "ids",
    "!spacer",
    "posMods",
    "itemIDs",
    "consumableIDs",
    "!spacer",
    "lvl",
    "skills",
]

let elem_colors = [
    "#00AA00",
    "#FFFF55",
    "#55FFFF",
    "#FF5555",
    "#FFFFFF"
]
