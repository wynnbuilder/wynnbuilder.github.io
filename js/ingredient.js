const item_url_base = location.href.split("#")[0];
const item_url_tag = location.hash.slice(1);

let item;

function init_itempage() {
    //displayExpandedItem(expandItem(itemMap.get(item_url_tag).statMap, []), "item-view");
    try{ 
        item = expandIngredient(ingMap.get(item_url_tag.replaceAll("%20"," ")), []);
        displayExpandedIngredient(item, "item-view");
        displayAdditionalInfo("additional-info", item);
    } catch (error) {
        console.log(error);
        console.log(error.stack);
    }
}

(async function() {
    await Promise.resolve(ingredient_loader.load_init());
    init_itempage();
})();
