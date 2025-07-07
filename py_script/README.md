# Data generation workflow

#### Process for generating new data:
- run `py_scripts/v3_process_items.py` in `py_script/` to generate item, tome, ing data (and unprocessed majid data).
- (optional) run `py_script/process_recipes.py` to update crafting recipes.
- Copy the generated files into cutting edge `*compress.json`, and versioned `data/<ver>/`.
- run `py_script/get_aspects.py` to see if any aspects need updating, and generate stubs for new aspects. The log output of this program is useful for manual updating aspects.
- Update aspects, majid, atree to make sure they work.
- run `py_script/atree-generateID.py` in `js/builder` to "compile/link" and minify majid, atree, aspects. Copy result files `*_min/clean.json` into `data/<ver>` and rename according to previous versions.
- run `py_script/research/plot_dps.py` to generate dps data, copy the resuling file into `data/<ver>`.

#### Generating encoding data:
After generating all new data for a version, run `py_script/encode_gen_const.py <ver>` to preview the resulting data. `ver` is one of the directories in `data/`. This runs the script in preview mode and will print out the resulting json alongside possible errors and warnings. If data preview is unnecessary, use the `--no-preview` flag.
After fixing warnings and errors, run the same command with the `--write` flag to write the data into `data/<ver>/encoding_consts.js`.

By default the script only allows generation for the latest version in `data/` to avoid link breakages. If re-generating data is required, use the `--override` flag.

