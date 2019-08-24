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
          parentId
        })
      })
  })
})
