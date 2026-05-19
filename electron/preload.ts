import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mealImageCache', {
  resolve: (url: string): Promise<string> =>
    ipcRenderer.invoke('meal-image-cache:resolve', url),
});

contextBridge.exposeInMainWorld('localRecipes', {
  search: (ingredients: string[], limit?: number) =>
    ipcRenderer.invoke('local-recipes:search', { ingredients, limit }),
  getById: (id: number | string) =>
    ipcRenderer.invoke('local-recipes:get-by-id', id),
  resolveImage: (filename: string | null) =>
    ipcRenderer.invoke('local-recipes:resolve-image', filename),
});
