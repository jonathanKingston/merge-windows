class windowManager {
  constructor() {
    this.windowHistory = {};
    this.windowHistory[true] = { previous: browser.windows.WINDOW_ID_NONE, current: browser.windows.WINDOW_ID_NONE };
    this.windowHistory[false] = { previous: browser.windows.WINDOW_ID_NONE, current: browser.windows.WINDOW_ID_NONE };
    this.contextMenus = {};

    browser.contextMenus.onClicked.addListener((info, tab) => {
      this.merge(this.contextMenus[info.menuItemId], tab.windowId);
    });
    browser.windows.onFocusChanged.addListener(() => {
      this.calculateContextMenu();
    });
    this.calculateContextMenu();
  }

  async getCurrentWindows() {
    const currentWindow = await browser.windows.getCurrent();
    if (this.windowHistory[currentWindow.incognito].current !== currentWindow.id) {
      this.windowHistory[currentWindow.incognito].previous = this.windowHistory[currentWindow.incognito].current;
      this.windowHistory[currentWindow.incognito].current = currentWindow.id;
    }
    const windows = await browser.windows.getAll({});
    return windows.filter((windowObj) => {
      return windowObj.id !== currentWindow.id && windowObj.incognito === currentWindow.incognito;
    }).sort((a, b) => {
      if (a.id === this.windowHistory[currentWindow.incognito].previous) {
        return -1;
      } else if (b.id === this.windowHistory[currentWindow.incognito].previous) {
        return 1;
      }
      return 0;
    });
  }

  async calculateContextMenu() {
    const windows = await this.getCurrentWindows();
    const id = "merge-windows";
    browser.contextMenus.remove(id);
    for (let contextMenuId in this.contextMenus) {
      browser.contextMenus.remove(contextMenuId);
      delete this.contextMenus[contextMenuId];
    }
    if (windows.length > 0) {
      browser.contextMenus.create({
        id,
        title: "Merge Windows",
      });
      this.contextMenus[browser.contextMenus.create({
        title: "Merge all windows",
        contexts: ["all", "tab"],
        parentId: id
      })] = Infinity;
      if (windows.length > 1) {
        this.contextMenus[browser.contextMenus.create({
          type: "separator",
          contexts: ["all", "tab"],
          parentId: id
        })] = NaN;
        for (let window in windows) {
          this.contextMenus[browser.contextMenus.create({
            title: "Merge with " + windows[window].title,
            contexts: ["all", "tab"],
            parentId: id
          })] = windows[window].id;
        }
      }
    }
  }

  async merge(target, source) {
    const windowMap = new Map();
    const windows = target === Infinity ? await this.getCurrentWindows() : [await browser.windows.get(target)];
    let repin = [];
    const promises = windows.map(async function (windowObj) {
      const tabs = await browser.tabs.query({windowId: windowObj.id});
      windowMap.set(windowObj, tabs.map((tab) => {
        if (tab.pinned) {
          repin.push(browser.tabs.update(tab.id, {pinned: false}));
        }
        return tab.id;
      }));
    });
    await Promise.all(promises);
    const repinTabs = await Promise.all(repin);
    windows.forEach((windowObj) => {
      browser.tabs.move(windowMap.get(windowObj), {index: -1, windowId: source});
    });
    repinTabs.forEach((tab) => {
      browser.tabs.update(tab.id, {pinned: true});
    });
    this.calculateContextMenu();
  }
};

new windowManager();
