# Project context and business rules

This document describes the behavior **currently implemented** in The Arcane Bazaar. It is a reference for changes made by people or AI. When a rule changes, update the relevant section and check the linked code and tests. The implementation remains the source of truth.

## Purpose

The application presents a catalog of D&D items and calculates buying and selling prices for campaigns. Calculated prices are a campaign aid, not official rules. The interface and displayed data use the original English names.

## Catalog and data sources

- The catalog is built from `items.json`, `items-base.json`, and `magicvariants.json` in `src/features/catalog/data/`. Item artwork is loaded separately from `fluff-items.json` when an item sheet opens. These files are immutable inputs: transformations and presentation fixes belong in the processing code, without rewriting the source files.
- Loading validates the required structure of all three files, resolves internal references and copies, normalizes the items, and caches the complete operation. A failed load can be retried later.
- The catalog distinguishes common items, magic items, item groups, base items, and generic variants. A specific variant is built for each valid generic-variant/base-item combination, while the catalog displays the generic family once with compatible base items as options.
- Each catalog item has a stable ID derived from its origin, source, and name; variant combinations also include the base and variant. ID collisions and invalid options stop catalog construction.

References: [loading](src/features/catalog/model/items/load-json.ts), [catalog construction](src/features/catalog/model/items/build-catalog.ts), [normalization](src/features/catalog/model/items/normalize-item.ts).

## Item classification and presentation

- A base item or a record whose original rarity is `none` or `unknown` is classified as `Common`; all other records are classified as `Magic`. Displayed rarity is normalized to the `Rarity` values; unrecognized values become `Unknown`.
- Every item has one primary category and may belong to additional categories. Explicit exceptions and structured fields determine the primary category first; the name and description help classify the item when needed. Markers such as `Cursed`, `Consumable`, and `Wondrous` may add secondary categories. `Other` is the fallback.
- An explicit price in the JSON is expressed in hundredths of a GP and converted to GP. If it is absent, estimated prices by rarity are: `Common` 100 GP, `Uncommon` 400 GP, `Rare` 4,000 GP, `Very Rare` 40,000 GP, and `Legendary` 200,000 GP. Other rarities have no estimated price. An explicit price of zero is preserved and marked as explicit.
- Availability derived from rarity is `Available` for `None`, `Common`, and `Uncommon`; `Limited` for `Rare` and `Very Rare`; and `Unavailable` for the remaining rarities. This value exists in the model, but the current filtering function **does not apply it as a filter**.
- A valid subtype appears below the item name on the item sheet, except for items in the `Trade Good` primary category: their subtype appears at the start of the Description section, even when they have no other description text. Numeric weight is displayed in pounds (`lb`). Attunement is required when `reqAttune` is true or contains text. Textual requirements, source page, weapon/armor information, and description paragraphs appear on the item sheet when valid data exists; missing fields are not invented. Weapon card values and each name in equipment property lists start with an uppercase letter. When a weapon has an ammunition type, its Ammunition property shows that type in parentheses (for example, `Ammunition (Bolt)`). Light armor displays its base AC with `+ Dex` (for example, Studded Leather Armor is `12 + Dex`); medium armor includes the maximum Dexterity modifier (for example, Chain Shirt is `AC 13 + Dex (max 2)`). Base damage and armor class appear in their equipment cards rather than being repeated at the end of the description. Armor with a Stealth penalty or numeric Strength requirement includes the corresponding rule text in the description as well as the structured card. Equipment cards use three columns on wide screens, two on intermediate screens, and one on narrow screens.
- Vehicle items display a Vehicle Information section when structured data exists. It can show speed in mph, cargo tonnage and passenger capacity, crew (including ranges), AC, HP, damage threshold, personal travel cost per mile per passenger, and shipping cost per 100 lb per mile. Cost fields are converted from hundredths of a GP. Missing fields are omitted, and vehicles with no structured specifications do not show the section.
- Mount items display a Mount Information section with speed in feet and carrying capacity in pounds when those values exist. The Monster Stat Block card shows the monster name from an explicit stat block reference in the description, or the item's name when no such reference exists. Missing speed and capacity values are omitted.
- Structured tables in item descriptions retain their captions, column headings, rows, and order among description paragraphs. The item sheet renders them as accessible tables with a minimum column width of 30 px, while the existing plain-text description remains available for catalog processing.
- The item sheet matches artwork by item name and source, including explicit `_copy` references in `fluff-items.json`, and uses the first image from the matching record. When a specific variant has no artwork of its own, it uses the artwork of its generic variant, including any explicit fluff copy inherited by that generic variant. Internal image paths point to `https://5e.tools/img/`. Artwork in the item sheet has padding around it. The image area is omitted when no image is available or the image fails to load; rarity and type badges remain visible in the summary. Selecting a real image opens a full-screen viewer with controls and keyboard navigation through all images for that item; optional artwork credits appear there. Same-name items from different sources do not share images unless an explicit copy or variant relationship connects them.
- Spellcasting Focus items show a Spellcasting Focus Information section listing eligible classes when the item has focus class data or a known focus subtype. A focus marked usable by any spellcaster, either with a true focus flag or the complete spellcaster class list, displays `Any Spellcaster`. Standard Arcane Focus, Druidic Focus, and Holy Symbol groups and their individual PHB/XPHB forms display their shared focus description before any form-specific text. The Druidic Focus requirement lists Druid and Ranger; standard focus class requirements take precedence over incomplete focus metadata.
- Every item in the Instrument category displays a Spellcasting Focus Requirement of `Bard` in the Spellcasting Focus Information section.

References: [normalization](src/features/catalog/model/items/normalize-item.ts), [categories](src/features/catalog/model/items/categories.ts), [item sheet](src/features/catalog/components/item/ItemModal/ItemModal.tsx).

## Groups and variants

- Magic groups collect referenced members as selectable versions. Members incorporated into a group no longer appear separately in the catalog. Exact name and source matches take priority; when none exists, a group reference may match a unique generic variant from the same source whose name adds the ` (*)` marker. Invalid references are recorded in diagnostics.
- A member's explicit rarity takes precedence. If it is `Unknown` or `Varies`, the member may inherit a known rarity from the group. Evolving item groups may gain an inferred initial version; if that version's rarity cannot be determined, it remains `Unknown`.
- A base item matches a variant only when it meets the requirements, does not match the exclusions, and has a compatible edition. Base items representing package contents are excluded from combinations.
- Effective variant price follows this priority: value expression, multiplier of the base item's value, or sum of the base and variant prices. If the required data is missing, the effective price remains variable (`null`).
- Selecting a group version comes before selecting a variant base. Until a required selection is made, the calculator does not show a final price. The item sheet and calculation use the item resolved from the selected combination.

References: [groups](src/features/catalog/model/items/build-item-groups.ts), [variants](src/features/catalog/model/items/build-variants.ts), [selection](src/features/catalog/model/items/resolve-item-selection.ts).

## Sources and settings

- Available sources are organized by edition (`5e` or `5.5e`) and group. All are selected by default. Source code comparisons ignore letter case and surrounding whitespace.
- Deselecting a source hides its items. It also removes group options originating from that source and variant bases whose source was deselected. A group or variant with no remaining options disappears.
- Source selection is stored in IndexedDB. On load, unknown codes are discarded and the known source order is restored. If storage is unavailable, changes may last only for the current session; if saving fails, the previous selection is restored.
- “Reset local data” deletes the local database and recreates the default settings with all sources selected.

References: [source registry](src/features/catalog/model/sources.ts), [visibility](src/features/catalog/model/content-visibility.ts), [persistence](src/features/settings/api/settings-database.ts), [settings state](src/features/settings/model/SettingsProvider.tsx).

## Search, filters, and navigation

- Search matches text against an item's name and tags without distinguishing letter case. Type, rarity, category, and source also participate in filtering.
- Only one item type is selected at a time; the screen starts with `Common`. Available rarities, categories, and sources are calculated from visible items of the selected type. Incompatible selections are removed when the type or available sources change.
- The Item type and Category filter sections start expanded. Category also expands when switching to `Magic`.
- Selecting `All` for categories or sources clears only the selections in that group. Multiple selected categories act as alternatives: an item needs to belong to any one of them.
- The list starts sorted by name in ascending order. It can also be sorted by type, category, rarity, and price; items without a price come last when sorting by price in ascending order.
- Pagination starts at 20 items per page and offers 10, 20, 50, and 100. Changing filters, sorting, or page size returns to the first page.

References: [filtering](src/features/catalog/model/filtering.ts), [catalog state](src/features/catalog/components/Catalog.tsx), [pagination](src/features/catalog/components/listing/Pagination.tsx).

## Price calculation

- The calculator requires a finite base price **greater than zero**. If an item has no base price, the user may enter a manual value in GP. An explicit price of zero remains valid in the catalog but produces no calculator result; the manual value is used only when the base price is `null`.
- With no adjustments, buying costs 100% of the base price and selling returns 50%. Buying (`B`) and selling (`S`) percentage adjustments are summed separately. Each total is limited to the range from -90% to +300%.
- Economy, market, party reputation, and negotiation apply to all items. Magic frequency applies only to `Magic` items. Custom modifiers apply the same percentage to buying and selling.
- The default options (`stable`, `regular`, `neutral`, `standard`, and `standard`) apply 0%. The other currently implemented options are:

| Group | Option | Buy | Sell |
| --- | --- | ---: | ---: |
| Economy | `prosperous` | +20% | +20% |
| Economy | `depressed` | -10% | -10% |
| Market | `competitive` | -20% | -15% |
| Market | `blackMarket` | +35% | +30% |
| Market | `restricted` | +25% | +25% |
| Reputation | `despised` | +12% | -12% |
| Reputation | `mistrusted` | +6% | -6% |
| Reputation | `honored` | -6% | +6% |
| Reputation | `admired` | -12% | +12% |
| Negotiation | `success` | -10% | +10% |
| Negotiation | `failure` | +10% | -10% |
| Magic frequency | `rare` | +25% | +25% |
| Magic frequency | `abundant` | -15% | -15% |

- Formulas: `buy = base price × (1 + B/100)`; `sell = base price × 0.5 × (1 + S/100)`. Results are rounded to thousandths of a CP and can be displayed in GP, SP, and CP (`1 GP = 10 SP = 100 CP`).
- Changing the selected item resets the modifiers and manual price. Changing the group version or variant base clears the manual price.

References: [pricing rules](src/features/catalog/model/pricing.ts), [currency conversion](src/features/catalog/model/currency.ts), [calculator](src/features/catalog/components/pricing/PriceCalculator.tsx).

## Maintaining this document

Update the affected rule when implemented behavior changes. Record only the current state here; use Git history or a `CHANGELOG.md` for changes by version. Verify statements against the code and tests before adding or removing rules. For implementation and architecture instructions, see [AGENTS.md](AGENTS.md).
