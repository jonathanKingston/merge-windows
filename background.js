const windowManager = {
  init() {
    browser.contextMenus.create({
      title: "Merge all windows",
      contexts: ["all"]
    });
    browser.contextMenus.onClicked.addListener(() => {
      this.merge();
    });
  },

  async merge() {
    const windowMap = new Map();
    const windows = await browser.windows.getAll();
    let biggestCount = 0;
    let biggest = null;
    let repin = [];
    const promises = windows.map(async function (windowObj) {
      const tabs = await browser.tabs.query({windowId: windowObj.id});
      windowMap.set(windowObj, tabs.map((tab) => {
        if (tab.pinned) {
          repin.push(browser.tabs.update(tab.id, {pinned: false}));
        }
        return tab.id;
      }));
      if (tabs.length > biggestCount) {
        biggest = windowObj;
        biggestCount = tabs.length;
      }
    });
    await Promise.all(promises);
    const repinTabs = await Promise.all(repin);
    windows.forEach((windowObj) => {
      if (windowObj === biggest) {
        return;
      }
      browser.tabs.move(windowMap.get(windowObj), {index: -1, windowId: biggest.id});
    });
    repinTabs.forEach((tab) => {
      browser.tabs.update(tab.id, {pinned: true});
    });
  }
};

windowManager.init();
