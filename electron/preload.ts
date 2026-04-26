import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mealImageCache', {
  resolve: (url: string): Promise<string> =>
    ipcRenderer.invoke('meal-image-cache:resolve', url),
});
