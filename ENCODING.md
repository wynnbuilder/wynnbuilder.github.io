# Overview

This is a technical overview of the encoding in use by Wynnbuilder.
The encoding uses a binary vector (or binary string, if you prefer) to store all relevant information about a build in a compact manner, and then converts the resulting vector into Base64, storing it in the Site's URL hash (the string of characters preceded by a "#" symbol).

The Builder encoder encodes the following information:
- The version of the build
- Equipment and it's powdering
- Skillpoint assignments
- Build level
- Tomes
- Aspects
- Ability tree

Anything that needs to be uniquely identified (i.e equipment, tomes and aspects) has a unique ID associated with it. the IDs are stable and do not change between versions, to preserve backwards compatibility. Those IDs are the information stored in the URL, not the names of the items.

For maximum efficiency, each version we calculate the maximum amount of bits required to store a particular type of ID and store it in a data file, which is then loaded before the decoding process. For example, if the largest ID for an item is 4975, the minimum number of bits required to store all IDs would be 12. In general, we store `floor(log_2(maxId)) + 1` for each identifiable type (if 0 is used to represent a null item, maxId is increased by 1 before calculation the length).
This generation done automatically by `py_script/encoding_gen_const.py` which also verifies certain aspects to make sure we maintain backwards compatibility.

# Specification - V12
This section details each part of the encoded vectors and how to interpret them.
in case of changes to the specification, an additional section titled "Specification VXX" will be appended, only detailing the changes made to the previous spec version.

- **Lengths denoted as "Dynamic"** are automatically generated from the versioned data in `data/*.json` files and from manually tracked data such as max in-game level, number of powder tiers etc.

- **String values in SCREAMING_CASE without an explicit associated integer value** (example of an associated value: `"SOME_NAME"=1`) are essentially enum variants. They need not be stable between versions.

- **Optional fields** are fields that are only encoded under specific conditions which are described in the same section as they're declared.

- **iff fields** are fields that must be encoded under the specified condition.

## Section A - Build Encoding

#### 1 - Build Header

| field   | length (in bits) | values   | range     |
| ------- | ---------------- | -------- | --------- |
| Legacy  | 6                | `uint32` | [0, 63]   |
| Version | 10               | `uint32` | [0, 1023] |

Each build must have it's first 6 bits set to a number representing whether it is a legacy or binary encoded build.
"Legacy" larger than 11 indicates a binary encoded build. anything less indicates a legacy build.

Each build must also have an associated "version" with it from which it loads the data. each vesrion corresponds to a folder in `data/`, and the
translation between version numbers and names can be found in `js/load_item.js:wynn_version_names`.

#### 2 - Equipment

| field                              | length (in bits) | values                        | range      |
| ---------------------------------- | ---------------- | ----------------------------- | ---------- |
| Equipment Kind                     | 2                | `NORMAL`, `CRAFTED`, `CUSTOM` | [0, 3]     |
| Custom Hash Length (iff `CUSTOM`)  | 12               | `uint32`                      | [0, 2^12)  |
| Custom Hash (iff `CUSTOM`)         | Dynamic          | binary blob                   | undefined  |
| Crafted Hash (iff `CRAFTED`)       | Dynamic          | binary blob                   | undefined  |
| Equipment ID (iff `NORMAL`)        | L (Dynamic)      | `uint32`                      | [0, 2^L)   |
| Powder flag (optional)             | 1                | `HAS_POWDERS`, `NO_POWDERS`   | [0, 1]     |

"Equipment Kind" denotes the kind of equipment to be encoded. Normal encoding is described in this section. Crafted and Custom encodings will be described in their own sections.

When "Equipment Kind" is Custom, the length (in bits) of the hash is encoded before the custom item itself is encoded.
When "Equipment Kind" is Crafted, the crafted hash is encoded as is.

Equipment IDs are encoded as `ID + 1` because an ID of 0 is used to indicate no item.
After which, a flag is appended to denote whether the item has any powders.

- "Powder Flag" is encoded iff the item type is powderable.
- "Powder Flag" is `NO_POWDERS` if the item has no powders applied, otherwise `HAS_POWDERS`.
- "Weapon" is always the last type of equipment encoded.

if "Powder Flag" exists and is `HAS_POWDERS`, encode powders. Otherwise, continue encoding the next item.

There is nothing to signify reaching the end of the "equipment" block, rather, we keep track of the number of equipments encoded. Once we reach the maximum number of equipment pieces, we proceed.

##### 2.1 - Powders

| field                                   | length (in bits)                               | values                         | range    |
| --------------------------------------- | ---------------------------------------------- | ------------------------------ | -------- |
| Powder ID                               | L (Dynamic) = floor(log_2(NUM_ELEM\*TIERS))+1  | `uint32`                       | [0, 2^L) |
| Powder Repeat Flag (optional)           | 1                                              | `REPEAT`, `NO_REPEAT`          | [0, 1]   |
| Powder Tier Repeat Flag (optional)      | 1                                              | `REPEAT_TIER`, `CHANGE_POWDER` | [0, 1]   |
| Powder Element Wrap (iff `REPEAT_TIER`) | L (Dynamic) = floor(log_2(NUM_ELEMENTS-1))+1   | `uint32`                       | [0, 2^L) |
| Powder Change Flag                      | 1                                              | `NEW_POWDER`, `NEW_ITEM`       | [0, 1]   |

Before encoding, powders are collected by order of appearance, preserving their original relative position. an Example of that is `E6 A6 E4 E6 A6 => E6 E6 A6 A6 E4`. This is allowed, even though it changes the powder order, because it's consistent with powder application mechanics.

They are then are encoded as unique IDs equal to `pid = indexof(PowderElement) * NUM_POWDER_TIERS + (PowderTier - 1)`, where `NUM_POWDER_TIERS` is an unspecified value corresponding to the latest amount of powder tiers. This is analogous to making a matrix of `NUM_POWDER_ELEMENTS * NUM_POWDER_TIERS`, assigning each cell with a powder.

After the first powder is encoded, there are 4 scenarios:
1. The next powder is the same exact powder.
2. The next powder is the same tier, different element.
3. The next powder is the same element, different tier.
4. The next powder is a completely different powder.

Scenarios 1 and 2 are common enough to optimize, while 3 is rarely seen in probably over 99% of builds except super low level ones (mixing powder tiers) and so we can ignore it.

1. In scenario 1, instead of encoding another powder ID, we encode a "Powder Repeat Flag" with the value `REPEAT`. `REPEAT` can be encoded as many times as the next powder is still the exact same as the previous one.
2. If 1 is false but 2 is true, encode `NO_REPEAT`. If the powders have the same tier, encode `REPEAT_TIER`. Encode 
   ```js
   // Note: % is the Modulus operator, not the Remainder operator.
   element_wrap = ((next_element - curr_element) % NUM_ELEMENTS) - 1
   ```
   When decoding, this number "wraps" the previous element into the new one in the following way:
   ```js
   new_element = (curr_element + element_wrap + 1) % NUM_ELEMENTS
   powder = new_element * NUM_POWDER_TIERS + (PowderTier - 1)
   ```
3. if 2 is false, encode `CHANGE_POWDER`. if there are additional powders, encode `NEW_POWDER`. otherwise, encode `NEW_ITEM`.

To allow flexibility in case the number of powder tiers or elements changes, we store the number of powder tiers  and elements available for each version. when encoding to a specific version with some given `old_num_tiers`, the index is corrected in the following way:

```js
element = floor(pid / NUM_POWDER_TIERS)
tier = pid % NUM_POWDER_TIERS
encoded_idx = element * old_num_tiers + tier
```

Decoding requires the opposite transformation:

```js
// pid is the value decoded from the bitvector
element = floor(pid / old_num_tiers)
// the additional width of the new powder matrix
difference_per_element = NUM_POWDER_TIERS - old_num_tiers
// the resulting locaiton in the latest powder matrix
decoded_idx = pid + element * difference_per_element
```

The number of elements is stored to decode the "powder wrapping" part of repeating a tier, because decoding the next element given a particular "wrap" requires knowledge of the number of elements present at the time of encoding.

#### 3 - Tomes

| field                         | length (in bits) | values                  | range    |
| ----------------------------- | ---------------- | ----------------------- | -------- |
| Has Tomes                     | 1                | `HAS_TOMES`, `NO_TOMES` | [0, 1]   |
| Slot in use (iff `HAS_TOMES`) | 1                | `UNUSED`, `USED`        | [0, 1]   |
| Tome ID (iff `USED`)          | L (Dynamic)      | `uint32`                | [0, 2^L) |

Tomes are very simple:
1. If the build has no tomes, encode `NO_TOMES`, continue.
2. If the build has at least 1 tome, encode `HAS_TOMES`. For every tome, if the tome is used, encode the "Tome in use" flag `USED` followed by the Tome ID. otherwise, encode `UNUSED`.

#### 4 - Skillpoints

| field                                      | length (in bits) | values                             | range         |
| ------------------------------------------ | ---------------- | ---------------------------------- | ------------- |
| Assigned SKP                               | 1                | `ASSIGNED`, `UNASSIGNED`           | [0, 1]        |
| Element Assigned (iff `ASSIGNED`)          | 1                | `ASSIGNED_ELEM`, `UNASSIGNED_ELEM` | [0, 1]        |
| Skillpoints Assigned (iff `ASSIGNED_ELEM`) | 12               | `int32`                            | [-2048, 2047] |

skillpoints are only encoded if the user changed the automatically calculated values. If there has been no change, an "Assigned SKP" `UNASSIGNED` flag is appended. otherwise, an `ASSIGNED` flag is appended.

if `ASSIGNED` is present, encode each skillpoint element in the order `etwfa` accordingly:
1. if the element has manually assigned skillpoints, encode `ASSIGNED_ELEM` alongside the new value truncated to 12 bits. 
2. otherwise, encode `UNASSIGNED_ELEM`.

Notice that since "Skillpoints Assigned" is a signed integer, when decoding, the stored number needs to be read as 2's complement. In javascript, this means sign extending it into a 32-bit number.

#### 5 - Build level

| field                 | length (in bits) | values           | range    |
| --------------------- | ---------------- | ---------------- | -------- |
| Max Level             | 1                | `MAX`, `NOT_MAX` | [0, 1]   |
| Level (iff `NOT_MAX`) | L (Dynamic)      | `uint32`         | [0, 2^L) |

If the build level is the version's max level, encode `MAX`. Otherwise, encode `NOT_MAX` followed by the level.

#### 6 - Aspects

| field                             | length (in bits) | values                      | range    |
| --------------------------------- | ---------------- | --------------------------- | -------- |
| Has Aspects                       | 1                | `HAS_ASPECTS`, `NO_ASPECTS` | [0, 1]   |
| Aspect in use (iff `HAS_ASPECTS`) | 1                | `UNUSED`, `USED`            | [0, 1]   |
| Aspect ID (iff `USED`)            | L (Dynamic)      | `uint32`                    | [0, 2^L) |

Aspects are encoded exactly like tomes. When decoding, make sure to load the correct aspect map based on the current weapon.

#### 7 - Ability Tree

The ability tree is encoded the same as version 7 of the legacy encoding, as it is already in binary format, and is always the last item in the BitVector. This is the pseudocode describing the procedure.

```python
# Encode an ability tree configuration into a binary blob.
# NOTE: this algorithm only works for "connected" (valid) ability trees.
# Its behavior is not well defined otherwise. 
# 
# Parameters: 
# tree_data: Object containing ability tree structure. 
# tree_state: Object containing info about which abilities are selected. 
def function encode(tree_data, tree_state): 
    return_vector = BitVector() 
    visited = Set()

    function recursive_traverse(head_node): 
        for each child of head_node, in order: 
            if child is not in visited: 
                add child to visited set 
                if tree_state.is_active(child): 
                    append bit 1 to return_vector 
                    recursive_traverse(child) 
                else: append bit 0 to return_vector
    recursive_traverse(tree_data.root) 
    return return_vector 

# Decode a binary blob into an ability tree configuration 
# 
# Parameters: 
# tree_data: Object containing ability tree structure. 
# tree_state: Object containing info about which abilities are selected. 
# tree_bitvector: raw binary data, accessed one bit at a time function
def decode(tree_data, tree_state, tree_bitvector): 
    i = 0 
    visited = Set()	

    function recursive_traverse(head_node): 
        for each child of head_node, in order: 
            if child is not in visited: 
                add child to visited set 
                if tree_bitvector[i]: 
                    child.active = True 
                    recursive_traverse(child) 
                else: 
                    child.active = False 
                i = i + 1
```


## Section B - Crafted Encoding
Crafted encoding does not use data versioning to exploit information because version clashes between crafteds and builds would become a nightmare. Instead, it has static values that should allow it to keep working for a good amount of time. It does, however, keep an "Encoding Version" which only controls the encoder, and has nothing to do with data loading.

Crafted encoding is composed of the following sections:
- Legacy flag
- Encoding version
- Ingredients
- Recipe
- Level
- Material tiers
- Attack speed
- 6-bit padding

#### 1 - Legacy flag
a 1 bit indicator to indicate whether the craft should be parsed with legacy encoding or binary encoding.

| field       | length (in bits) | values                 | range  |
| ----------- | ---------------- | ---------------------- | ------ |
| Legacy Flag | 1                | `BINARY`=0, `LEGACY`=1 | [0, 1] |

#### 2 - Encoding version
Used to allow versioning of the encoder itself in case something breaking changes, to maintain backwards compatibility. Has nothing to do with loading data.

| field   | length (in bits) | values  | range     |
| ------- | ---------------- | ------- | --------- |
| Version | 7                | `uin32` | [0, 1023] |

#### 3 - Ingredients
The 6 ingredients dictating the stats of the crafted item. each ingredient ID is encoded as-is, with 4000 being the ID of the "None" ingredient, and 4001-4030 being the IDs for powders when they're used as ingredients.

| field         | length (in bits) | values   | range     |
| ------------- | ---------------- | -------- | --------- |
| Ingredient ID | 12               | `uin32`  | [0, 4096] |

#### 4 - Recipe
The recipe dictating the level and the type of the craft. encoded as an ID.

| field     | length (in bits) | values   | range     |
| --------- | ---------------- | -------- | --------- |
| Recipe ID | 12               | `uin32`  | [0, 4096] |

#### 5 - Material tiers
For each of the materials used, encodes `material_tier - 1`.

| field         | length (in bits) | values   | range  |
| ------------- | ---------------- | -------- | ------ |
| Material tier | 3                | `uin32`  | [0, 7] |

#### 6 - Attack speed
If the encoded recipe is a weapon recipe, encode the index of the attack speed within a predefined attack speed list, otherwise skip this step.

| field        | length (in bits) | values   | range   |
| ------------ | ---------------- | -------- | ------  |
| Attack Speed | 4                | `uin32`  | [0, 15] |

#### 7 - Base64 Padding
Because we need to be able to embed the crafted item encoding into the builder's encoded URL
directly from it's hash as to not waste additional compute, the bit vector is padded with zeroes until it's length is a multiple of 6. This ensures it fits exactly within a Base64 string, and avoids potential issues. When decoding, simply skip the additional zeroes.

## Section C - Custom item encoding
Custom items are also versioned separately from the data. The fields in the custom item encoding are almost entirely optional and are encoded based on a stable encoding order defined in `js/custom.js`.
The IDs encoded are separated into different categories, each handled differently, and with quite a bit of special casing to go along with it.

Custom encoding parts:
- Legacy flag
- Encoder version
- Fixed IDs
- ID fields
- Base64 Padding

Legacy flag and encoder version are exactly the same as Crafted encoding, read up in the relevant section.

#### 1 - Fixed IDs
Custom items have 2 modes - rolled IDs and fixed IDs. This is simply a 1 bit flag.

| field     | length (in bits) | values            | range  |
| --------- | ---------------- | ----------------- | ------ |
| Fixed IDs | 1                | `FIXED`, `RANGED` | [0, 1] |

#### 2 - ID Fields
There are a couple different kinds of ID fields. each field is preceded by an index into the array dictating the encoding order, and handled based on the value of the ID returned from that index.

| field | length (in bits) | values   | range     |
| ----- | ---------------- | -------- | --------- |
| Index | 10               | `uint32` | [0, 1023] |

After reading the value from the array there are several options for categories of IDs:
- Rolled IDs
- Non-Rolled IDs
	- Non-Rolled constant length IDs
	- Non-Rolled variable length string IDs
	- Non-Rolled numeric IDs

##### 2.1 - Rolled IDs
If the ID is a rolled ID it's encoded in the following way:

| field                                     | length (in bits) |  values  | range         |
| ----------------------------------------- | ---------------- |  ------  | ------------- |
| ID Value length (in bits)                 | 5                | `uint32` | [0, 31]       |
| ID ValueMin                               | Variable         | `int32`  | [-2^31, 2^31) |
| ID ValueMax (iff "Fixed IDs" == `RANGED`) | Variable         | `int32`  | [-2^31, 2^31) |

The length (in bits) required to encode the Value of the id is encoded as `id_length - 1`, and implementors must ensure that `id_length > 0`. afterwards the minimum ID value is encoded as a 2's complement signed integer of length `id_length`. If the IDs are not fixed, an additional maximum value is encoded in the same way.

##### 2.2 - Non-Rolled constant length IDs
These are IDs with predetermined possible values and therefore sizes, and they include `type`, `tier`, `atkSpd` and `classReq`. Each of them is encoded as an index into an array containing their respective values.

| field                        | length (in bits) | values   | range   |
| ---------------------------- | ---------------- | -------- | ------- |
| type (optional)              | 4                | `uint32` | [0, 15] |
| tier (optional)              | 4                | `uint32` | [0, 15] |
| attak speed (optional)       | 4                | `uint32` | [0, 15] |
| class requirement (optional) | 4                | `uint32` | [0, 15] |

##### 2.3 - Non-Rolled variable length string IDs
These are IDs that can hold any string value. the IDs are encoded as Base64 in two possible ways:
1. Base64 string that is read as text.
2. Base64 string that is read as UTF-8 binary.

| field                         | length (in bits) | values                | range     |
| ----------------------------- | ---------------- | --------------------- | --------- |
| Text type                     | 1                | `BASE\_64`, `UTF\_8`  | [0, 1]    |
| Text length (in Base64 chars) | 16               | `uint32`              | [0, 2^16) |
| Text content                  | Variable         | UTF-8 Encoded string  | undefined |

If the text content is entirely Base64 compatible, as is the case with some single-word names, a text type of `BASE_64` is encoded. otherwise, a text type of `UTF_8` is encoded and the text is encoded into `Base64`. Afterwards, the length (in bits) of the resulting Base64 string is encoded, clamped to a 24-bit maximum value, followed by the string itself.

##### 2.4 - Non-Rolled variable length numeric IDs
These are encoded exactly the same as the `FIXED` case of rolledIDs.

#### 3 - Base64 Padding
Exactly like crafted items, we need to pad the resulting vector to be exactly a multiple of 6 long, for the same reasons.
