import requests
import json
import re

from json_diff import json_diff

api_base_url = "https://api.wynncraft.com/v3/aspects/"
def get_aspect_data(wynn_class):
    url = api_base_url + wynn_class.lower()
    aspect_data = requests.get(url).json()
    return aspect_data

cleaner = re.compile('<.*?>') 

replace_strings = {
    "\ue01f ": "", # duration
    "\ue01e ": "", # Positive number? (I see this used on "effects")
    "\ue01d ": "", # AOE
    "\ue01c ": "", # Range
    "\ue01b ": "", # Negative number
    "\ue007 ": "", # Mana
    "\ue027 ": "", # Cooldown
    "\ue006 ": "", # Heal

    " \ue01a": "", # Focus
    " \u2699": "", # Discombobulated
    " \ue018": "", # Corrupted
    " \u2727": "", # Holy Power/Sacred Surge
    " \ue025": "", # Provoke
    " \u2741": "", # Resistance Bonus

    " \ue035": "", # Winded
    " \u273a": "", # Mana Bank
    " \u231a": "", # Timelocked

    " \ue019": "", # Marks
    " \ue030": "", # Clones
    " \ue013": "", # Momentum
    " \u2765": "", # Lured

    " \uE020": "", # Blood Pool
    " \uE031": "", # Bleeding
    " \u2698": "", # Puppets
    " \u265a": "", # Awakened
    " \u21f6": "", # Whipped

    " \\(\ue00d\\)": "", # Slowness
    " \\(\ue00b\\)": "", # Blindness
    " \\(\ue01b\\)": "", # "Damage Bonus" Reduction
    " \\(\ue015\\)": "", # Resistance Penalty

    " \\(\u2694\\)": "", # Damage Bonus
    " \\(\u2741\\)": "", # Resistance Bonus
    " \\(\u273e\\)": "", # Resistance Bonus (Only used for dissolution?)
    " \\(\u2748\\)": "", # ID Bonus/Radiance
    " \\(\u2617\\)": "", # Invincibility
    " \\(\u27b2\\)": "", # Speed Bonus (Time Dilation)
    " \u2764": "", # Overhealth

    "\u00b0": " degrees", # Degree symbol

    "Total Damage": "</br><span class='mc-white'>Total Damage</span>", # Total Damage Breakdown
    "\\(\ue005 Neutral": "</br>&emsp;(<span class='Neutral'>Neutral</span>", # turns out tclap doesnt follow below
    "\\(\ue005 Damage": "</br>&emsp;(<span class='Neutral'>Neutral</span>", # Neutral just says "Damage"
    "\\(\ue004 Water": "</br>&emsp;(<span class='Water'>Water</span>", # Water
    "\\(\ue003 Thunder": "</br>&emsp;(<span class='Thunder'>Thunder</span>", # Thunder
    "\\(\ue002 Fire": "</br>&emsp;(<span class='Fire'>Fire</span>", # Fire
    "\\(\ue001 Earth": "</br>&emsp;(<span class='Earth'>Earth</span>", # Earth
    "\\(\ue000 Air": "</br>&emsp;(<span class='Air'>Air</span>", # Air

    "\ue004 ": "</br>", # Water
    "\ue003 ": "</br>", # Thunder
    "\ue002 ": "</br>", # Fire
    "\ue001 ": "</br>", # Earth
    "\ue000 ": "</br>", # Air
}

# Source: https://stackoverflow.com/questions/37018475/python-remove-all-html-tags-from-string
def clean_description(string):
    return re.sub(cleaner, '', string)

def stylize_description(strings):
    def sub(s):
        for k, v in replace_strings.items():
            s = re.sub(k, v, s)
        return s
    result = []
    for text in strings:
        if '</br>' in text:
            result.append('</br>')
            continue
        if 'Archetype' in text or 'Ability Points' in text or 'Unlocking will block:' in text:
            break  
        result.append(sub(re.sub(cleaner, '', text)))

    if result[0] == "</br>":
        result[0] = ""
        
    if result[len(result)-1] == "</br>":
        result[len(result)-1] = ""

    return ' '.join(result).strip()


if __name__ == "__main__":
    with open("aspect_map.json", "r") as aspect_ids_file:
        aspect_ids = json.load(aspect_ids_file)

    classes = [
        "Archer",
        "Warrior",
        "Mage",
        "Assassin",
        "Shaman"
    ]
    
    empty_aspect = {
        "displayName": None,
        "id": 0,
        "class": None,
        "tier": None,
        "tiers": [
            {
                "threshold": 0,
                "description": None,
                "abilities": []
            }
        ]
    }

    with open("../js/builder/aspects.json", "r") as aspects_data_file:
        old_aspect_data = json.load(aspects_data_file)
    
    try:
        with open("api_aspects.json", "r") as old_api_file:
            old_api_data = json.load(old_api_file)
    except FileNotFoundError:
        old_api_data = {c: None for c in classes}

    api_data = {}

    aspect_changes = {c: [] for c in classes}
    all_output_unordered = {c: {} for c in classes}

    for wynn_class in classes:
        print(f"Processing aspects for {wynn_class}...")
        known_aspects = old_aspect_data[wynn_class]
        known_aspect_map = {aspect['displayName']: aspect for aspect in known_aspects}

        aspect_data = get_aspect_data(wynn_class)
        api_data[wynn_class] = aspect_data
        old_class_data = old_api_data[wynn_class]

        id_map = aspect_ids[wynn_class]
        for name, aspect in aspect_data.items():
            
            old_tier_data = None
            if name in known_aspect_map:
                old_tier_data = known_aspect_map[name]['tiers']

            tier_data = []
            for i in range(len(aspect['tiers'])):
                data = aspect['tiers'][str(i+1)]

                if old_tier_data is not None and len(old_tier_data) > i:
                    abils = old_tier_data[i]['abilities']
                else:
                    abils = []
                tier_data.append({
                    'threshold': data['threshold'],
                    'description': stylize_description(data['description']),
                    'abilities': abils
                })

            if name not in id_map:
                print(f"New aspect: {name}")
                aspect_id = len(id_map)
                id_map[name] = aspect_id

            else:
                aspect_id = id_map[name]
                if old_class_data is not None:
                    if name not in old_class_data:
                        print(f"Already registered new aspect [{name}]? Likely a bug!")
                        continue
                    if json_diff(old_class_data[name], aspect):
                        aspect_changes[wynn_class].append(name)

            aspect_info = {
                "displayName": name,
                "id": aspect_id,
                "tier": aspect['rarity'][0].upper() + aspect['rarity'][1:],
                "tiers": tier_data
            }
            all_output_unordered[wynn_class][name] = aspect_info

    all_output = {c: [] for c in classes}
    for wynn_class in classes:
        known_aspects = old_aspect_data[wynn_class]
        new_aspects = all_output_unordered[wynn_class]
        for aspect in known_aspects:
            aspect_name = aspect['displayName']
            if aspect_name in new_aspects:
                all_output[wynn_class].append(new_aspects[aspect_name])
                del new_aspects[aspect_name]

        all_output[wynn_class].extend(new_aspects.values())
    
    print("Finished processing aspects")
    print("Summary of changed aspects:")
    for wynn_class in classes:
        print(wynn_class)
        print("---------------------")
        if len(aspect_changes[wynn_class]) > 0:
            print("\t", "\n\t".join(aspect_changes[wynn_class]))
        else:
            print("No Changes")
        print("---------------------")

    with open("api_aspects.json", "w") as api_file:
        json.dump(api_data, api_file, indent=2)

    with open("aspects.json", "w") as output_file:
        json.dump(all_output, output_file, indent=2)

    with open("aspect_map.json", "w") as aspect_ids_file:
        json.dump(aspect_ids, aspect_ids_file, indent=2)
