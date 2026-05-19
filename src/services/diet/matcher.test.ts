import { describe, expect, it } from 'vitest';
import { inferDietFlags } from './matcher';

describe('inferDietFlags — animal products are never vegan', () => {
  const cases = [
    'beef chuck roast',
    'ground round',
    'kiełbasa',
    'kielbasa',
    'polish sausage',
    'spareribs',
    'frankfurters',
    'chicken breasts',
    'anchovy paste',
    'fish sauce',
    'worcestershire sauce',
    'gelatin',
    'honey',
    'chicken stock',
    'parmesan cheese',
    'heavy cream',
    'eggs',
  ];
  for (const c of cases) {
    it(`"${c}" is not vegan`, () => {
      expect(inferDietFlags([c]).vegan).toBe(false);
    });
  }
});

describe('inferDietFlags — plant alternatives are not flagged animal', () => {
  const cases = [
    'coconut meat',
    'beyond meat',
    'impossible burger',
    'tofurky',
    'vegan sausage',
    'plant-based chicken',
    'meatless meatballs',
    'oat milk',
    'almond milk',
    'coconut milk',
    'peanut butter',
    'almond butter',
    'cashew cheese',
    'nutritional yeast',
    'seitan',
    'mock duck',
    'imitation crab',
    'soy chorizo',
    'tofu',
  ];
  for (const c of cases) {
    it(`"${c}" is vegan`, () => {
      expect(inferDietFlags([c]).vegan).toBe(true);
    });
  }
});

describe('inferDietFlags — category logic', () => {
  it('dairy is vegetarian but not vegan', () => {
    const r = inferDietFlags(['whole milk', 'cheddar cheese']);
    expect(r.vegan).toBe(false);
    expect(r.vegetarian).toBe(true);
    expect(r.dairyFree).toBe(false);
  });
  it('egg is vegetarian but not vegan', () => {
    const r = inferDietFlags(['2 large eggs']);
    expect(r.vegan).toBe(false);
    expect(r.vegetarian).toBe(true);
  });
  it('gelatin is not vegetarian', () => {
    const r = inferDietFlags(['unflavored gelatin']);
    expect(r.vegetarian).toBe(false);
  });
  it('fish sauce is not vegetarian', () => {
    const r = inferDietFlags(['1 tbsp fish sauce']);
    expect(r.vegetarian).toBe(false);
  });
  it('a fully plant recipe is vegan + vegetarian', () => {
    const r = inferDietFlags(['tofu', 'soy sauce', 'scallions', 'rice']);
    expect(r.vegan).toBe(true);
    expect(r.vegetarian).toBe(true);
  });
  it('gluten detection: pasta is not GF', () => {
    expect(inferDietFlags(['spaghetti']).glutenFree).toBe(false);
  });
  it('gluten-free flour is not flagged gluten', () => {
    expect(inferDietFlags(['gluten-free flour']).glutenFree).toBe(true);
  });
});

describe('inferDietFlags — the tricky overrides', () => {
  it('"coconut meat" does not trigger "meat"', () => {
    expect(inferDietFlags(['1 cup coconut meat']).vegan).toBe(true);
  });
  it('"butternut squash" does not trigger "butter"', () => {
    expect(inferDietFlags(['butternut squash']).dairyFree).toBe(true);
  });
  it('"beefsteak tomato" does not trigger "beef"', () => {
    expect(inferDietFlags(['2 beefsteak tomatoes']).vegan).toBe(true);
  });
  it('"eggplant" does not trigger "egg"', () => {
    expect(inferDietFlags(['1 eggplant']).vegan).toBe(true);
  });
});

describe('inferDietFlags — audit fixes (local trove)', () => {
  it('"hamburger" means ground beef in legacy recipes — not vegan or vegetarian', () => {
    const r = inferDietFlags(['5 lb. hamburger']);
    expect(r.vegan).toBe(false);
    expect(r.vegetarian).toBe(false);
  });
  it('"egg-size" is a size descriptor, not chicken egg — stays vegan + vegetarian', () => {
    const r = inferDietFlags([
      'celeriac (2 medium egg-size pieces)',
    ]);
    expect(r.vegan).toBe(true);
    expect(r.vegetarian).toBe(true);
    expect(r.explain.animalMatches.some((m) => m.category === 'egg')).toBe(
      false,
    );
  });
});
