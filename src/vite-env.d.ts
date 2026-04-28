/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOONACULAR_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export interface MealImageCacheAPI {
  resolve: (url: string) => Promise<string>;
}

declare global {
  const __APP_VERSION__: string;

  interface Window {
    mealImageCache?: MealImageCacheAPI;
  }
}

export {};
