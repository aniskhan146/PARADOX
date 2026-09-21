import { BrowserWindow as e, Menu as t, Tray as n, app as r, ipcMain as i, nativeImage as a } from "electron";
import o from "path";
//#region electron/main.ts
var s = null, c = null, l = !1;
function u() {
	s = new e({
		width: 1280,
		height: 800,
		minWidth: 900,
		minHeight: 600,
		frame: !1,
		transparent: !1,
		backgroundColor: "#0d0f14",
		webPreferences: {
			preload: o.join(__dirname, "preload.js"),
			nodeIntegration: !1,
			contextIsolation: !0,
			webSecurity: !1
		},
		icon: o.join(__dirname, "../public/icon.png")
	}), process.env.VITE_DEV_SERVER_URL ? s.loadURL(process.env.VITE_DEV_SERVER_URL) : s.loadFile(o.join(__dirname, "../dist/index.html")), s.on("close", (e) => (l || (e.preventDefault(), s?.hide()), !1)), s.on("maximize", () => {
		s?.webContents.send("window-state-change", { isMaximized: !0 });
	}), s.on("unmaximize", () => {
		s?.webContents.send("window-state-change", { isMaximized: !1 });
	});
}
function d() {
	let e = a.createFromPath(o.join(__dirname, "../public/icon.png"));
	c = new n(e.isEmpty() ? a.createEmpty() : e);
	let i = t.buildFromTemplate([
		{
			label: "Open PARADOX AI",
			click: () => {
				s?.show(), s?.focus();
			}
		},
		{ type: "separator" },
		{
			label: "Quit",
			click: () => {
				l = !0, r.quit();
			}
		}
	]);
	c.setToolTip("PARADOX AI Assistant"), c.setContextMenu(i), c.on("double-click", () => {
		s?.show(), s?.focus();
	});
}
i.on("window-minimize", () => {
	s?.minimize();
}), i.on("window-maximize", () => {
	s?.isMaximized() ? s.unmaximize() : s?.maximize();
}), i.on("window-close", () => {
	s?.hide();
}), i.handle("is-window-maximized", () => s?.isMaximized() ?? !1), r.whenReady().then(() => {
	u(), d(), r.on("activate", () => {
		e.getAllWindows().length === 0 ? u() : s?.show();
	});
}), r.on("before-quit", () => {
	l = !0;
}), r.on("window-all-closed", () => {
	process.platform !== "darwin" && r.quit();
});
//#endregion
export {};
