/**
 * Cozinha: escolhe o prato a partir dos ingredientes postos na panela (até MAX_INGREDIENTS).
 * Vale a receita de maior prioridade cujos ingredientes estão todos na panela; ingredientes
 * a mais vão junto. Sem receita: "Comida Duvidosa". Lógica pura (testável).
 */
import { DUBIOUS_FOOD, INGREDIENTS, MAX_INGREDIENTS, RECIPES, type Recipe } from '../data/interactive';

export function isIngredient(itemId: string): boolean {
  return (INGREDIENTS as readonly string[]).includes(itemId);
}

/** Receita que sai com estes ingredientes (null = comida duvidosa). */
export function matchRecipe(ingredients: readonly string[]): Recipe | null {
  if (!ingredients.length) return null;
  const count = new Map<string, number>();
  for (const id of ingredients) count.set(id, (count.get(id) ?? 0) + 1);
  let best: Recipe | null = null;
  let bestScore = -Infinity;
  for (const r of RECIPES) {
    let ok = true;
    let used = 0;
    for (const [id, n] of Object.entries(r.needs)) {
      if ((count.get(id) ?? 0) < n) {
        ok = false;
        break;
      }
      used += n;
    }
    if (!ok) continue;
    const score = r.priority * 10 + used;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

/** Item resultante. */
export function cookResult(ingredients: readonly string[]): string {
  if (ingredients.length > MAX_INGREDIENTS) ingredients = ingredients.slice(0, MAX_INGREDIENTS);
  return matchRecipe(ingredients)?.result ?? DUBIOUS_FOOD;
}
