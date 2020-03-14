browser.storage.local.get({
  context_menu_location: 0
}).then(preferences => {
  for (const preference in preferences) {
    document.querySelector('[name="' + preference + '"][value="' + preferences[preference] + '"]').checked = true
  }
})

document.body.addEventListener('change', ({ target }) => {
  const save = {}
  save[target.name] = Number.parseInt(target.value)
  browser.storage.local.set(save)
})

browser.storage.onChanged.addListener(changes => {
  for (const change in changes) {
    document.querySelector('[name="' + change + '"][value="' + changes[change].newValue + '"]').checked = true
  }
})
