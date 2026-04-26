/// <reference types="vite/client" />

export interface MealImageCacheAPI {
  resolve: (url: string) => Promise<string>;
}

declare global {
  interface Window {
    mealImageCache?: MealImageCacheAPI;
  }
}

export {};
