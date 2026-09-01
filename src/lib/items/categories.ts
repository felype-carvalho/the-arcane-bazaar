import type { Category } from "../../types";
import type { JsonRecord } from "./raw-types";

export const CATEGORIES: Category[] = [
    "Adventuring Gear",
    "Ammunition",
    "Amulet",
    "Apparel",
    "Armor",
    "Bag/Container",
    "Clockwork",
    "Consumable",
    "Explosive",
    "Food and Drink",
    "Gem",
    "Instrument",
    "Mount",
    "Other",
    "Poison",
    "Potion",
    "Ring",
    "Scroll",
    "Service",
    "Spellcasting Focus",
    "Staff / Rod",
    "Summonable",
    "Tattoo",
    "Tome",
    "Tool",
    "Trade Good",
    "Vehicle",
    "Weapon",
];

export const CATEGORY_ICONS: Record<Category, string> = {
    Consumable: "🍎",
    Potion: "🧪",
    Scroll: "📜",
    Apparel: "🥋",
    Ring: "💍",
    Amulet: "📿",
    Weapon: "🗡️",
    Armor: "🛡️",
    "Spellcasting Focus": "🔮",
    "Staff / Rod": "🪄",
    Tattoo: "🫟",
    Clockwork: "⚙️",
    Instrument: "🎻",
    "Bag/Container": "🛍️",
    Gem: "💎",
    Tome: "📖",
    Tool: "🛠️",
    Summonable: "🐉",
    Ammunition: "🏹",
    "Adventuring Gear": "🧭",
    Explosive: "💣",
    "Food and Drink": "🍺",
    Mount: "🏇",
    Poison: "⚗️",
    Service: "🤝",
    "Trade Good": "⚖️",
    Vehicle: "🧭",
    Other: "🌟",
};

const STRUCTURED_TYPES: Array<[Category, ReadonlySet<string>]> = [
    ["Weapon", new Set(["M", "R"])],
    ["Armor", new Set(["LA", "MA", "HA", "S"])],
    ["Ammunition", new Set(["A", "AF"])],
    ["Potion", new Set(["P"])],
    ["Scroll", new Set(["SC"])],
    ["Ring", new Set(["RG"])],
    ["Spellcasting Focus", new Set(["SCF", "WD"])],
    ["Instrument", new Set(["INS"])],
    ["Tool", new Set(["T", "AT", "GS"])],
    ["Adventuring Gear", new Set(["G", "TAH"])],
    ["Explosive", new Set(["EXP"])],
    ["Food and Drink", new Set(["FD"])],
    ["Mount", new Set(["MNT"])],
    ["Gem", new Set(["$G"])],
    ["Trade Good", new Set(["TG", "TB", "$", "$A", "$C"])],
    ["Vehicle", new Set(["AIR", "SHP", "SPC", "VEH"])],
];

const CATEGORY_OVERRIDES: Readonly<Record<string, Category>> = {
    "deck of many things|dmg": "Other",
    "deck of many things|xdmg": "Other",
    "portable hole|dmg": "Bag/Container",
    "portable hole|xdmg": "Bag/Container",
};

const normalizeText = (value: string) =>
    value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("en-US");
const containsWord = (text: string, words: readonly string[]) =>
    words.some((word) =>
        new RegExp(
            `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i",
        ).test(text),
    );

export function typeAbbreviation(type: unknown): string {
    return typeof type === "string" ? type.split("|")[0].toUpperCase() : "";
}

export function resolveCategory(
    entity: JsonRecord,
    description = "",
): Category {
    const name = typeof entity.name === "string" ? entity.name : "";
    const source = typeof entity.source === "string" ? entity.source : "";
    const override =
        CATEGORY_OVERRIDES[
            `${name.toLocaleLowerCase("en-US")}|${source.toLocaleLowerCase("en-US")}`
        ];
    if (override) return override;

    const abbreviation = typeAbbreviation(entity.type);
    if (entity.tattoo === true) return "Tattoo";
    if (entity.poison === true) return "Poison";
    if (entity.staff === true || abbreviation === "RD") return "Staff / Rod";
    if (entity.weapon === true) return "Weapon";
    if (entity.armor === true) return "Armor";
    for (const [category, types] of STRUCTURED_TYPES)
        if (types.has(abbreviation)) return category;

    const text = normalizeText(`${name} ${description}`);
    if (
        containsWord(text, [
            "amulet",
            "necklace",
            "periapt",
            "medallion",
            "brooch",
            "talisman",
        ])
    )
        return "Amulet";
    if (
        containsWord(text, [
            "boots",
            "cloak",
            "gloves",
            "gauntlets",
            "helm",
            "helmet",
            "hat",
            "belt",
            "bracers",
            "robe",
            "slippers",
            "goggles",
            "mask",
        ])
    )
        return "Apparel";
    if (
        containsWord(text, [
            "bag",
            "pouch",
            "haversack",
            "bottle",
            "flask",
            "bowl",
            "box",
            "chest",
            "coffer",
            "quiver",
        ]) ||
        text.includes("portable hole")
    )
        return "Bag/Container";
    if (text.includes("clockwork") || text.includes("mechanical device"))
        return "Clockwork";
    if (containsWord(text, ["book", "manual", "tome", "codex", "grimoire"]))
        return "Tome";
    if (
        /\b(summon|summons|summoned|conjure|conjures|materialize|creates?)\b.{0,80}\b(creature|beast|spirit|elemental|construct)\b/i.test(
            text,
        )
    )
        return "Summonable";
    if (
        containsWord(text, [
            "gem",
            "pearl",
            "jewel",
            "crystal",
            "bead",
            "stone",
        ])
    )
        return "Gem";
    if (
        containsWord(text, ["hireling", "service"]) ||
        text.includes("spellcasting service")
    )
        return "Service";
    const miscTags = Array.isArray(entity.miscTags) ? entity.miscTags : [];
    if (
        miscTags.includes("CNS") ||
        /\b(consumed|destroyed|disintegrates|single use|one use)\b/i.test(text)
    )
        return "Consumable";
    return "Other";
}
