'use strict'

let focusOrder = []
browser.windows.onRemoved.addListener(removedId => {
  focusOrder.filter(id => removedId !== id)
  browser.contextMenus.remove('merge_' + removedId)
  getWindowsSorted().then(windows => windows.length < 2 && browser.contextMenus.removeAll())
})
browser.windows.onFocusChanged.addListener(drawMenus)
browser.contextMenus.onClicked.addListener((menuItem, currentTab) => {
  if (menuItem.menuItemId === 'merge_all') {
    getWindowsSorted(true)
      .then(windows => merge(windows.splice(1), currentTab.windowId, currentTab.id))
  } else if (menuItem.menuItemId.substr(0, 6) === 'merge_') {
    browser.windows.get(parseInt(menuItem.menuItemId.substr(6)), { populate: true })
      .then(subject => merge([subject], currentTab.windowId, currentTab.id))
  }
})
browser.commands.onCommand.addListener(command => {
  Promise.all([
    browser.tabs.query({ active: true, currentWindow: true }),
    getWindowsSorted(true)
  ]).then(command === 'merge-all-windows'
    ? ([[tab], windows]) => merge(windows.splice(1), tab.windowId, tab.id)
    : ([[tab], windows]) => merge(windows.splice(1, 1), tab.windowId, tab.id)
  )
})

/**
 * @param {number} focusedId The windows.Window object ID that last gained focus
 */
function drawMenus (focusedId) {
  if (focusedId === browser.windows.WINDOW_ID_NONE) return
  focusOrder = [...new Set([focusedId].filter(Number).concat(focusOrder))]
  Promise.all([
    getWindowsSorted(),
    getContextMenuLocations(),
    browser.contextMenus.removeAll()
  ]).then(([windows, contextMenuLocations]) => {
    if (windows.length < 2) return
    const parentId = browser.contextMenus.create({
      title: 'Merge Windows',
      contexts: contextMenuLocations
    })
    browser.contextMenus.create({
      title: 'Merge all windows into this one',
      id: 'merge_all',
      parentId
    })
    browser.contextMenus.create({
      type: 'separator',
      parentId
    })
    windows
      .splice(1)
      .forEach(window => {
        browser.contextMenus.create({
          title: 'Merge tabs from ' + window.title,
          id: 'merge_' + window.id,
          parentId
        })
      })
  })
}

/**
 * @param {bool} [populate=false] Whether to populate windows.Window objects with tab information
 */
function getWindowsSorted (populate = false) {
  return new Promise(function (resolve, reject) {
    browser.windows.getAll({ windowTypes: ['normal'], populate })
      .then(windows => resolve(
        windows
          .sort((a, b) => [focusOrder.indexOf(a.id), focusOrder.indexOf(b.id)]
            .map(i => i < 0 ? Infinity : i)
            .reduce((a, b) => a === b ? 0 : a - b)
          )
          .filter((window, index, sorted) => window.incognito === sorted[0].incognito)
      ), reject)
  })
}

/**
 * @param {windows.Window[]} subjects Array of populated windows.Window objects
 * @param {number} target Window ID to merge all subjects’ tabs into
 * @param {number} active Tab ID of the active tab after merge
 */
function merge (subjects, target, active) {
  const tabs = subjects.reduce((flat, window) => flat.concat(window.tabs), [])
  Promise
    .all(tabs.filter(tab => tab.pinned).map(tab => browser.tabs.update(tab.id, { pinned: false })))
    .then(unpinned => {
      browser.tabs.move(tabs.map(tab => tab.id), { windowId: target, index: -1 })
        .then(() => {
          browser.tabs.update(active, { active: true })
          unpinned.forEach(tab => browser.tabs.update(tab.id, { pinned: true }))
        })
    })
}

function getContextMenuLocations () {
  return new Promise(function (resolve, reject) {
    browser.storage.local.get({
      context_menu_location: 0
    }).then(({ context_menu_location }) => {
      const list = ['all', 'tab']
      if (context_menu_location === 0) {
        list.pop()
      } else if (context_menu_location === 1) {
        list.shift()
      }
      resolve(list)
    }, reject)
  })
}

browser.storage.onChanged.addListener(changes => {
  if ('context_menu_location' in changes) drawMenus()
})
