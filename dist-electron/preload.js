import { contextBridge as e, ipcRenderer as t } from "electron";
//#region electron/preload.ts
e.exposeInMainWorld("electronAPI", {
	minimize: () => t.send("window-minimize"),
	maximize: () => t.send("window-maximize"),
	close: () => t.send("window-close"),
	isMaximized: () => t.invoke("is-window-maximized"),
	onWindowStateChange: (e) => {
		t.on("window-state-change", (t, n) => e(n.isMaximized));
	}
});
//#endregion
export {};
