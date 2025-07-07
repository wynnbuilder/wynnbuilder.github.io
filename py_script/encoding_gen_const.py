"""
A script to generate encoding constants.

The script reads all relevant files from the corresponding data/ folder
and generates a file called "encoding_consts.json" according to the spec in ENCODING.md.

Usage: python3 encoding_gen_const.py <version> --[no]-override --[no]-write
version - one of the versions in the data/ folder.
--[no]-override - only if a change to an older version is mandatory via generation, use this flag
--[no]-write - the script works in "preview" by default, warning of potential dangers. If everyting is ok, this flag writes the file to disk.

WARNING: Re-generating data for previous, already existing versions can cause irrepairable breakage to already existing links,
and should never really occur.
"""

import argparse
import json
import math
import itertools
import os
from packaging.version import Version

"""
Return the minimum number of bits required to represent {num} in binary.

note: do not use math.ceil: 

1. `ceil(log_2(2^x)) = x`
2. `floor(log_2(2^x)) + 1 = x + 1`

If signed == True, the function returns the # of bits required to represent [-num, num).
"""
def get_bitlen(num, signed=False):
    if num == 1: 
        return 1 + int(signed)
    return math.floor(math.log(num - int(signed), 2)) + 1 + int(signed)

"""
Generate an ID map for an array of flags, and store the maximum bit length required to represent all flags.

Example: ["REPEAT", "NO_REPEAT"] => {"REPEAT": 0, "NO_REPEAT": 1, BITLEN: 1}
"""
def generate_id_map(arr):
    m = {v: i for i, v in enumerate(arr)}
    m["BITLEN"] = get_bitlen(len(m) - 1)
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
bit_len_map["POWDER_REPEAT_TIER_OP"] = generate_id_map(["REPEAT_TIER", "CHANGE_POWDER"])
bit_len_map["POWDER_CHANGE_OP"] = generate_id_map(["NEW_POWDER", "NEW_ITEM"])

# Tomes
bit_len_map["TOMES_FLAG"] = generate_id_map(["NO_TOMES", "HAS_TOMES"])
bit_len_map["TOME_SLOT_FLAG"] = generate_id_map(["UNUSED", "USED"])
bit_len_map["TOME_NUM"] = 14

# Aspects
bit_len_map["ASPECT_TIERS"] = 4
bit_len_map["NUM_ASPECTS"] = 5
bit_len_map["ASPECT_TIER_BITLEN"] = get_bitlen(bit_len_map["ASPECT_TIERS"] - 1) # tiers are [1, ASPECT_TITERS], we can map to [0, ASPECT_TITERS - 1]
bit_len_map["ASPECTS_FLAG"] = generate_id_map(["NO_ASPECTS", "HAS_ASPECTS"])
bit_len_map["ASPECT_SLOT_FLAG"] = generate_id_map(["UNUSED", "USED"])

# Atree

# Skillpoints
bit_len_map["MAX_SP"] = pow(2, 11) # Maximum allowed skillpoint value (signed)
bit_len_map["SP_TYPES"] = 5 # Types of skillpoints
bit_len_map["MAX_SP_BITLEN"] = get_bitlen(bit_len_map["MAX_SP"], signed=True)
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

parser = argparse.ArgumentParser(description="Generate encoding constants for Wynnbuilder's binary encoding.")
parser.add_argument('version', help='a data version folder name in `data/.`', default=None)
parser.add_argument("--override", action=argparse.BooleanOptionalAction, help='allows re-generating data for existing versions')
parser.add_argument("--write", action=argparse.BooleanOptionalAction, help='writes the data to a file')
parser.add_argument("--preview", action=argparse.BooleanOptionalAction, help='prints a preview of the data')
args = parser.parse_args()

if args.version is None:
    raise ArgumentError("Bad arguemnt - version should be one of in data/*.json")

version = args.version
override = args.override
write_premission = args.write
preview = args.preview

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
        print(f"WARNING: Encoding bitlen for len(lst) instead of item IDs. This could be an error - check manually.") 
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
    if max_id != 0:
        bit_len_map["ASPECT_ID_BITLEN"] = get_bitlen(max_id)
    else:
        bit_len_map["ASPECT_ID_BITLEN"] = 0

def get_data_versions():
    data_names = os.listdir("../data")
    data_names.sort(reverse=True, key=Version)
    return data_names

# https://stackoverflow.com/questions/27265939/comparing-python-dictionaries-and-nested-dictionaries
def diff_versions(prev_version_data, current_version_data, path=""):
    diff = False
    for k in prev_version_data:
        if k in current_version_data:
            if (type(current_version_data[k]) is dict):
                diff = diff_versions(prev_version_data[k], current_version_data[k], "%s -> %s" % (path, k) if path else k)
            if current_version_data[k] != prev_version_data[k]:
                curr_v = current_version_data[k]
                prev_v = prev_version_data[k]
                if (type(curr_v) is not type(prev_v)):
                    print(f"WARNING: mismatch between keys in {path} -> {k}")
                if type(curr_v) is int and curr_v < prev_v:
                    print("ERROR: Numeric values should not shrink between versions unless something fundamental about the game changed.")
                    print("If this is intended, take great care to make sure backwards compatability is retained, then change it manually.")
                    write_premission = False
                elif curr_v is list and len(curr_v) < len(prev_v):
                    print("WARNING: list in recent data is shorter than previous data. This either indicates a bug or requires an encoder change.")
                diff = True
                result = [
                   "%s: " % path if path else "TOP_LEVEL:",
                    " - %s : %s" % (k, prev_version_data[k]),
                    " + %s : %s" % (k, current_version_data[k])
                ]
                print("\n".join(result))
        else:
            print(f"WARNING: Adding new key '${k}' to encoding data. If this is intended, ignore this warning.")
    return diff


if __name__ == "__main__":
    all_data_versions = get_data_versions()
    assert version in all_data_versions, f"INVALID VERSION {version}: if this is indeed the version you meant to use please create a folder in `data/`."
    curr_version_idx = all_data_versions.index(version)
    assert curr_version_idx == 0 or override == True, f"WARNING: You are trying to modify an older encoding version. this could break backwards compatability. to override pass the --override flag."

    gen_items()
    gen_tomes()
    gen_aspects()

    if preview:
        print(json.dumps(bit_len_map, indent=2) + "\n")
        print("NOTE: Make sure to review errors and warnings.\n")

    if len(all_data_versions) != curr_version_idx:
        prev_version = all_data_versions[curr_version_idx + 1] if curr_version_idx == len(all_data_versions) else version
        with open(f"../data/{prev_version}/encoding_consts.json", "r") as infile:
            prev_version_data = json.load(infile)
            if diff_versions(prev_version_data, bit_len_map):
                print("\nWARNING: There's a change in data between old and new data. please make sure that this is intended before writing.")

    if write_premission:
        with open("encoding_consts.json", "w") as outfile:
            json.dump(bit_len_map, outfile, indent=2)
        with open(f"../data/{version}/encoding_consts.json", "w") as outfile:
            json.dump(bit_len_map, outfile)
