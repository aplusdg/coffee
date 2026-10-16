export const FLOOR = -0.84;
export const RIM = 0.94;
export const DURATION = 11;
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const smooth = (x, a, b) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const innerRadius = (y) =>
  0.7 + ((clamp(y, -0.88, RIM) + 0.88) / 1.82) * 0.23;
export const liquidRadius = (y) => innerRadius(y) - 0.055;

// Representative house recipes, in mL. Iced milk drinks have a cold-foam finish.
export const MENU = Object.freeze({
  "flat-white": {
    name: "Flat White",
    description: "Double espresso · silky milk",
    hot: { espresso: 40, milk: 140, foam: 5 },
    iced: { espresso: 40, milk: 140, foam: 4 },
  },
  latte: {
    name: "Latte",
    description: "Smooth milk · a soft finish",
    hot: { espresso: 30, milk: 180, foam: 15 },
    iced: { espresso: 30, milk: 180, foam: 12 },
  },
  cappuccino: {
    name: "Cappuccino",
    description: "Rich espresso · pillowy foam",
    hot: { espresso: 30, milk: 120, foam: 45 },
    iced: { espresso: 30, milk: 120, foam: 35 },
  },
  "long-black": {
    name: "Long Black",
    description: "Espresso & water · no milk",
    hot: { espresso: 60, water: 150 },
    iced: { espresso: 60, water: 150 },
  },
});
const labels = {
  espresso: "ESPRESSO",
  milk: "MILK",
  foam: "FOAM",
  water: "WATER",
};
const messages = {
  espresso: "Pulling a rich espresso…",
  milk: "Folding in silky milk…",
  foam: "Adding a soft foam finish…",
  water: "Pouring water for your Long Black…",
};
const cache = new Map();
export function getRecipe(coffee = "cappuccino", temperature = "hot") {
  if (!MENU[coffee] || !["hot", "iced"].includes(temperature))
    throw new Error("Please choose a coffee from the menu.");
  const key = `${temperature}/${coffee}`;
  if (cache.has(key)) return cache.get(key);
  const menu = MENU[coffee],
    ingredients = menu[temperature];
  const sequence =
    coffee === "long-black"
      ? ["water", "espresso"]
      : ["espresso", "milk", "foam"];
  const components = sequence.filter((type) => ingredients[type] > 0);
  const rates = { espresso: 25, milk: 70, water: 70, foam: 24 };
  const weights = components.map((type) =>
    Math.max(0.5, ingredients[type] / rates[type]),
  );
  const totalWeight = weights.reduce((sum, x) => sum + x, 0);
  const available = DURATION - 0.45 - (components.length - 1) * 0.28;
  let start = 0;
  const stages = components.map((type, i) => {
    const duration = (available * weights[i]) / totalWeight;
    const stage = {
      type,
      start,
      end: start + duration,
      amount: ingredients[type],
      message: messages[type],
    };
    start = stage.end + 0.28;
    return stage;
  });
  const recipe = {
    ...menu,
    ingredients,
    stages,
    hasMilk: Boolean(ingredients.milk),
    total: components.reduce((sum, type) => sum + ingredients[type], 0),
    surface: temperature === "iced" ? 0.58 : 0.74,
    ratioLabel: components.map((type) => labels[type]).join(" / "),
    ratio: components.map((type) => ingredients[type]).join(" / ") + " mL",
  };
  cache.set(key, recipe);
  return recipe;
}
// Volume of the tapered interior, rather than treating height as volume.
export function volumeAt(y) {
  const h = Math.max(0, y - FLOOR),
    r = liquidRadius(FLOOR),
    slope = 0.23 / 1.82;
  return (
    Math.PI * (r * r * h + r * slope * h * h + (slope * slope * h * h * h) / 3)
  );
}
export function heightAtVolume(volume) {
  let low = FLOOR,
    high = RIM;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (volumeAt(mid) < volume) low = mid;
    else high = mid;
  }
  return volume <= 0 ? FLOOR : (low + high) / 2;
}
export function recipeAt(t, coffee = "cappuccino", temperature = "hot") {
  const recipe = getRecipe(coffee, temperature),
    amounts = { espresso: 0, milk: 0, water: 0, foam: 0 };
  let pour = null;
  for (const stage of recipe.stages) {
    const progress = smooth(t, stage.start, stage.end);
    amounts[stage.type] = stage.amount * progress;
    if (t >= stage.start && t < stage.end) pour = { ...stage, progress };
  }
  const unitVolume = volumeAt(recipe.surface) / recipe.total;
  const liquidMl = amounts.espresso + amounts.milk + amounts.water;
  const level = heightAtVolume(liquidMl * unitVolume);
  const surface = heightAtVolume((liquidMl + amounts.foam) * unitVolume);
  const foamHeight = surface - level;
  return {
    amounts,
    level,
    surface,
    foamHeight,
    foamRadius: liquidRadius(surface) - 0.006,
    radius: liquidRadius(level),
    foam: recipe.ingredients.foam ? amounts.foam / recipe.ingredients.foam : 0,
    milk: recipe.ingredients.milk ? amounts.milk / recipe.ingredients.milk : 0,
    coffee: amounts.espresso / recipe.ingredients.espresso,
    pour,
    message: pour?.message || "Letting your coffee settle…",
  };
}
