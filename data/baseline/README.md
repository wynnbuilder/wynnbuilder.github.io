# Data Baseline

This directory contains the **source-of-truth** data files that are edited by hand. All other files in versioned `data/<ver>/` directories are generated from these.

## Directory layout

| Path | Purpose |
|------|---------|
| `data/baseline/*.json` | Hand-edited source-of-truth data (atree, major IDs, aspects, recipes, map locations, territories) |
| `data/baseline/maps/` | Persistent ID/name mappings that must stay stable across runs (tracked) |
| `data/baseline/compressed/` | Compressed copies of source data |
| `data/temp/` | Generated intermediate outputs from `py_script/` (gitignored) |
| `data/<ver>/` | Final per-version data consumed by the app |

## Updating ability trees / major IDs

1. Edit `atree_constants.json` and/or `major_ids_clean.json` in this directory.
2. From `py_script/`, run `python3 atree-generateID.py` — writes minified output to `data/temp/`.
3. Copy the output files from `data/temp/` into the target `data/<ver>/` directory (see full suite below).

## Generating the full data suite for a new version

When a new game version drops and you need to create a complete `data/<ver>/` directory (see `data/2.2.0.14/` for an example of the expected output), follow the workflow below. All script outputs land in `data/temp/` unless they are persistent mappings (which update `data/baseline/maps/` in place).

```bash
# 0. Set the version
VER=X.X.X.X

# 1. Create the version directory
mkdir -p data/$VER

# 2. Generate item/tome/ingredient data from API
#    Reads: data/baseline/maps/{id,ing,tome}_map.json (updated in place),
#           data/baseline/{clean,ingreds_clean,tomes,major_ids_clean}.json
#    Writes: data/temp/{item_out,ing_out,tome_out,major_ids_clean,dump}.json
cd py_script
python3 v3_process_items.py

# 3. (Optional) Update recipes — writes data/temp/recipes_clean.json
python3 process_recipes.py ../data/baseline/recipes.json ../data/temp/recipes_clean.json

# 4. Check for new aspects — writes data/temp/aspects.json, data/temp/api_aspects.json
python3 get_aspects.py

# 5. Manually review data/temp/ outputs and promote approved changes into
#    data/baseline/ by copying:
#      data/temp/item_out.json       -> data/baseline/clean.json
#      data/temp/ing_out.json        -> data/baseline/ingreds_clean.json
#      data/temp/tome_out.json       -> data/baseline/tomes.json
#      data/temp/recipes_clean.json  -> data/baseline/recipes_clean.json
#      data/temp/major_ids_clean.json-> data/baseline/major_ids_clean.json
#      data/temp/aspects.json        -> data/baseline/aspects.json
#    Also update data/baseline/atree_constants.json by hand as needed.

# 6. Compile/minify atree, major IDs, aspects — writes to data/temp/
python3 atree-generateID.py

# 7. dps_data.json is maintained in data/baseline/ and is propagated unchanged to
#    the version directory in step 8 below — there is no generation step.

# 8. Copy all generated files into the version directory.
#    Minified atree/aspects/majid come straight from data/temp/;
#    items/ingreds/tomes/recipes/dps pull from data/baseline/ (the reviewed sources).
cp ../data/temp/atree_constants_min.json ../data/$VER/atree.json
cp ../data/temp/aspects_min.json         ../data/$VER/aspects.json
cp ../data/temp/major_ids_min.json       ../data/$VER/majid.json
python3 compress_json.py ../data/baseline/clean.json         ../data/$VER/items.json
python3 compress_json.py ../data/baseline/clean.json         ../data/baseline/compressed/compress.json
python3 compress_json.py ../data/baseline/ingreds_clean.json ../data/$VER/ingreds.json
python3 compress_json.py ../data/baseline/ingreds_clean.json         ../data/baseline/compressed/ingreds_compress.json
python3 compress_json.py ../data/baseline/tomes.json         ../data/$VER/tomes.json
python3 compress_json.py ../data/baseline/recipes_clean.json       ../data/$VER/recipes.json
python3 compress_json.py ../data/baseline/recipes_clean.json       ../data/baseline/compressed/recipes_compress.json
cp ../data/baseline/dps_data.json ../data/$VER/dps_data.json

# 8b. Refresh the cutting-edge compressed copies of the hand-edited map/territory
#     sources (loaded directly by load_map.js from data/baseline/compressed/).
python3 compress_json.py ../data/baseline/terrs_clean.json         ../data/baseline/compressed/terrs_compress.json
python3 compress_json.py ../data/baseline/maploc_clean.json        ../data/baseline/compressed/maploc_compress.json

# 9. Generate encoding constants (preview first, then write)
#    Preview prints to stdout; --write saves to data/temp/encoding_consts.json
#    AND data/$VER/encoding_consts.json
python3 encoding_gen_const.py $VER
python3 encoding_gen_const.py $VER --write
```

### Quick one-liner (atree/aspects/majid/items only)

For smaller updates that only touch atree, aspects, major IDs, or items:

```bash
VER=X.X.X.X
cd py_script

python atree-generateID.py && cp ../data/temp/atree_constants_min.json ../data/$VER/atree.json && cp ../data/temp/aspects_min.json ../data/$VER/aspects.json && cp ../data/temp/major_ids_min.json ../data/$VER/majid.json && python compress_json.py ../data/baseline/clean.json ../data/$VER/items.json && python compress_json.py ../data/baseline/clean.json ../data/baseline/compressed/compress.json
```

## Bumping DB version constants

When baseline data files change, the corresponding IndexedDB version constants in `js/load_*.js` must be incremented so that browsers invalidate their cached data:

| Baseline file changed | Constant to bump | Location |
|----------------------|------------------|----------|
| `clean.json` | `ITEM_DB_VERSION` | `js/load_item.js` |
| `ingreds_clean.json` | `ING_DB_VERSION` | `js/load_ing.js` |
| `tomes.json` | `TOME_DB_VERSION` | `js/load_tome.js` |
| `aspects.json` | `ASPECT_DB_VERSION` | `js/load_aspect.js` |

Note: `atree.json` and `majid.json` are loaded directly from the versioned data directory (not via IndexedDB), so they don't have a DB version constant.
