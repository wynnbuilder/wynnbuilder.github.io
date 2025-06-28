"""
A script to generate encoding constants based off the max IDs for each item.

Usage: python3 encoding_gen_const.py <version>
version - one of the versions in the data/ folder.

The script reads all relevant files from the corresponding data/ folder
and generates a file called "encoding_consts.json" according to the spec.

WARNING: Any edit to this file within the same version can cause irreperable breakage
of links due to changing bitlengths. "encoding_cosnts.json" must be handled with care
to ensure it's run after all item generation scripts and is not edited within the same version
unless there are fatal errors that justify it.
"""

import argparse
import json
import math
import itertools

"""
Return the minimum number of bits required to represent {num} in binary.

note: do not use math.ceil: 

1. `ceil(log_2(2^x)) = x`
2. `floor(log_2(2^x)) + 1 = x + 1`

If signed == True, the function returns the # of bits required to represent [-num, num).
"""
def get_bitlen(num, signed=False):
    if num == 1: 
        return 1
    return math.floor(math.log(num - int(signed), 2)) + 1 + int(signed)

def generate_id_map(arr):
    m = {v: i for i, v in enumerate(arr)}
    m["BITLEN"] = get_bitlen(len(m) - 1)
    return m

def generate_product(arr1, arr2):
    arr1 = list(arr1); arr2 = list(arr2)

    for x in (arr1, arr2):
        if "BITLEN" in x: x.remove("BITLEN")

    list_product = itertools.product(arr1, arr2)
    p = {v: i for i, v in enumerate(map("".join, list_product))}
    p["BITLEN"] = get_bitlen(len(p) - 1)
    return p

def generate_inverse(d):
    m = d.copy()

    if ("BITLEN" in m):
        m.pop("BITLEN")

    m = {i: v for v, i in m.items()}
    return m

################
# Data section #
################


bit_len_map = {}

# Items
bit_len_map["EQUIPMENT_KIND"] = generate_id_map(["NORMAL", "CRAFTED", "CUSTOM"])
bit_len_map["EQUIPMENT_POWDERS_FLAG"] = generate_id_map(["NO_POWDERS", "HAS_POWDERS"])
bit_len_map["EQUIPMENT_NUM"] = 9
bit_len_map["POWDERABLE_EQUIPMENT_NUM"] = 5

# Powders
bit_len_map["POWDER_ELEMENTS"] = ["E", "T", "W", "F", "A"]
bit_len_map["POWDER_TIERS"] = 6
bit_len_map["POWDER_WRAPPER_BITLEN"] = get_bitlen(len(bit_len_map["POWDER_ELEMENTS"]) - 1 - 1)
bit_len_map["POWDER_ID_BITLEN"] = get_bitlen(len(bit_len_map["POWDER_ELEMENTS"]) * bit_len_map["POWDER_TIERS"])
bit_len_map["POWDER_REPEAT_OP"] = generate_id_map(["REPEAT", "NO_REPEAT"])
bit_len_map["POWDER_REPEAT_TIER_OP"] = generate_id_map(["REPEAT", "NO_REPEAT"])
bit_len_map["POWDER_CHANGE_OP"] = generate_id_map(["NEW_POWDER", "NEW_ITEM"])

# Tomes
bit_len_map["TOME_FLAG"] = generate_id_map(["NONE", "HAS_TOME"])
bit_len_map["TOME_KIND"] = generate_id_map(["NONE", "USED"])
bit_len_map["TOME_NUM"] = 14

# Aspects
bit_len_map["ASPECT_TIERS"] = 4
bit_len_map["NUM_ASPECTS"] = 5
bit_len_map["ASPECT_TIER_BITLEN"] = get_bitlen(bit_len_map["ASPECT_TIERS"] - 1) # tiers are [1, ASPECT_TITERS], we can map to [0, ASPECT_TITERS - 1]
bit_len_map["ASPECT_FLAG"] = generate_id_map(["NONE", "HAS_ASPECTS"])
bit_len_map["ASPECT_KIND"] = generate_id_map(["NONE", "USED"])

# Atree

# Skillpoints
bit_len_map["MAX_SP"] = pow(2, 11)  # Maximum allowed skillpoint value (signed)
bit_len_map["SP_TYPES"] = 5 # Types of skillpoints
bit_len_map["MAX_SP_BITLEN"] = get_bitlen(bit_len_map["MAX_SP"], True)
bit_len_map["SP_FLAG"] = generate_id_map(["ASSIGNED", "AUTOMATIC"])
bit_len_map["SP_ELEMENT_FLAG"] = generate_id_map(["ELEMENT_UNASSIGNED", "ELEMENT_ASSIGNED"])

# Level
bit_len_map["LEVEL_FLAG"] = generate_id_map(["MAX", "OTHER"])
bit_len_map["MAX_LEVEL"] = 106
bit_len_map["LEVEL_BITLEN"] = get_bitlen(bit_len_map["MAX_LEVEL"])

# CRAFTED ITEMS

#######################
# End of Data section #
#######################


items_filename = "items.json"
aspects_filename = "aspects.json"
atree_filename = "atree.json"
ing_filename = "ingreds.json"
recipes_filename = "recipes.json"
tomes_filename = "tomes.json"

parser = argparse.ArgumentParser(description="Process raw pulled item data.")
parser.add_argument('version', help='input file to read data from', default=None)
args = parser.parse_args()

if args.version is None:
    raise ArgumentError("Bad arguemnt - version should be one of in data/*.json")

version = args.version

def get_file(path):
    data_path = f'../data/{version}/{path}' 
    with open(data_path, "r") as infile:
        return json.load(infile)

"""
Get the maximum #id of a list of items.
Since the lists are edited manually and are not
guarenteed to be sorted by IDs or to not have holes, check
each item in the list.

Here, "item" refers to any object with an ID property.
"""
def get_max_id(lst):
    max_id = 0
    zero_id = False
    item = None 
    for x in lst:
        if x["id"] > max_id:
            max_id = x["id"]
            item = x
        if x["id"] == 0:
            zero_id = True

    # print(f'- Max id: "{max_id}" of "{item['displayName']}"')
    # Make sure the number of items in the list does not exceed the maximum ID
    # Account for an ID of 0.
    if len(lst) - 1 > max_id or (len(lst) - 1 == max_id and zero_id == False):
        print(f"WARNING: There are more items in the list ({len(lst)}) than there are IDs ({max_id}).") 
        print(f"WARNING: Encoding len(lst) instead of item IDs.") 
        max_id = len(lst)
    return max_id

def gen_items():
    data = get_file(items_filename)
    # Add 1 because none items are encoded as 0, all other items as id + 1
    max_id = get_max_id(data["items"]) + 1
    bit_len_map["ITEM_ID_BITLEN"] = get_bitlen(max_id)

def gen_tomes():
    data = get_file(tomes_filename)
    max_id = get_max_id(data["tomes"])
    bit_len_map["TOME_ID_BITLEN"] = get_bitlen(max_id)

def gen_aspects():
    data = get_file(aspects_filename)
    max_id = 0
    for cls, aspects in data.items():
        m = get_max_id(aspects)
        if m > max_id:
            max_id = m
    print(f'Max aspect id: "{max_id}"')
    if max_id != 0:
        bit_len_map["ASPECT_ID_BITLEN"] = get_bitlen(max_id)
    else:
        bit_len_map["ASPECT_ID_BITLEN"] = 0

if __name__ == "__main__":
    gen_items()
    gen_tomes()
    gen_aspects()
    with open("encoding_consts.json", "w") as outfile:
        json.dump(bit_len_map, outfile, indent=2)
    with open(f"../data/{version}/encoding_consts.json", "w") as outfile:
        json.dump(bit_len_map, outfile)
