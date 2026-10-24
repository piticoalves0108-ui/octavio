import { describe, expect, it } from 'vitest';
import { cookResult, isIngredient, matchRecipe } from '../src/interactive/cooking';
import { DUBIOUS_FOOD, INGREDIENTS, RECIPES } from '../src/data/interactive';
import { ITEMS } from '../src/data/items';

describe('cozinha', () => {
  it('todas as receitas usam ingredientes válidos e dão itens que existem', () => {
    for (const r of RECIPES) {
      expect(ITEMS[r.result], r.id).toBeDefined();
      expect(ITEMS[r.result].use, r.id).toBeDefined();
      for (const id of Object.keys(r.needs)) expect(isIngredient(id), `${r.id}: ${id}`).toBe(true);
    }
    for (const id of INGREDIENTS) expect(ITEMS[id], id).toBeDefined();
    expect(ITEMS[DUBIOUS_FOOD]).toBeDefined();
  });

  it('escolhe a receita mais específica', () => {
    expect(cookResult(['carne_crua'])).toBe('espetinho');
    expect(cookResult(['carne_crua', 'cogumelo'])).toBe('prato_cacador');
    expect(cookResult(['cogumelo', 'carne_crua', 'maca', 'erva_lumen'])).toBe('banquete_arcano');
    expect(cookResult(['cogumelo', 'cogumelo'])).toBe('ensopado_cogumelos');
    expect(cookResult(['maca', 'frutas_silvestres'])).toBe('torta_frutas');
    expect(cookResult(['carne_crua', 'carne_crua'])).toBe('assado_farto');
  });

  it('ingredientes extras vão junto; nada combina = comida duvidosa', () => {
    expect(cookResult(['maca', 'maca', 'maca'])).toBe('maca_assada');
    expect(cookResult(['fragmento_eter'])).toBe(DUBIOUS_FOOD);
    expect(matchRecipe([])).toBeNull();
  });
});
