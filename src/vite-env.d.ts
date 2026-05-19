/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOONACULAR_API_KEY?: string;
  readonly DEV: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface MealImageCacheAPI {
  resolve: (url: string) => Promise<string>;
}

export interface LocalRecipesAPI {
  search: (
    ingredients: string[],
    limit?: number,
  ) => Promise<Record<string, unknown>[]>;
  getById: (id: number | string) => Promise<Record<string, unknown> | null>;
  resolveImage: (filename: string | null) => Promise<string>;
}

declare global {
  const __APP_VERSION__: string;

  interface Window {
    mealImageCache?: MealImageCacheAPI;
    localRecipes?: LocalRecipesAPI;
  }
}

export {};
