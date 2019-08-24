'use strict'

let focusOrder = []
browser.windows.onRemoved.addListener(removedId => focusOrder.filter(id => removedId !== id))
browser.windows.onFocusChanged.addListener(focusedId => {
  if (focusedId === browser.windows.WINDOW_ID_NONE) return
  focusOrder = [...new Set([focusedId].concat(focusOrder))]
  Promise.all([
    browser.windows.getAll({ windowTypes: ['normal'] }),
    browser.contextMenus.removeAll()
  ]).then(([windows]) => {
    if (windows.length < 2) return
    const parentId = browser.contextMenus.create({
      title: 'Merge Windows'
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
      .sort((a, b) => [focusOrder.indexOf(a.id), focusOrder.indexOf(b.id)]
        .map(i => i < 0 ? Infinity : i)
        .reduce((a, b) => a === b ? 0 : a - b)
      )
      .filter((window, index, sorted) => window.incognito === sorted[0].incognito)
      .splice(1)
      .forEach(window => {
        browser.contextMenus.create({
          title: 'Merge with ' + window.title,
          id: 'merge_' + window.id,
          parentId
        })
      })
  })
})
browser.contextMenus.onClicked.addListener((menuItem, currentTab) => {
  console.log('menuItem.menuItemId', menuItem.menuItemId)
  if (menuItem.menuItemId === 'merge_all') {
    Promise.all([
      browser.windows.getAll({ windowTypes: ['normal'], populate: true }),
      browser.windows.get(currentTab.windowId)
    ]).then(([all, current]) => merge(
      all.filter(window => window.id !== current.id && window.incognito === current.incognito),
      current.id
    ))
  } else if (menuItem.menuItemId.substr(0, 6) === 'merge_') {
    browser.windows.get(parseInt(menuItem.menuItemId.substr(6)), { populate: true })
      .then(subject => merge([subject], currentTab.windowId))
  }
})

/**
 * @param {windows.Window[]} subjects Array of populated windows.Window objects
 * @param {number} target Window ID to merge all subjects’ tabs into
 */
function merge (subjects, target) {
  console.log(subjects, target)
}
