const { expect } = require('@playwright/test')
const { getE2EPassword } = require('../fixtures/users')

async function signIn(page, user) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(getE2EPassword())
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/$/)
}

async function createPeerChats(browser, userA, userB, instrumentWebRTC = false) {
  const contextA = await browser.newContext({ acceptDownloads: true })
  const contextB = await browser.newContext({ acceptDownloads: true })
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  if (instrumentWebRTC) {
    for (const page of [pageA, pageB]) {
      await page.addInitScript(() => {
        const NativePeerConnection = window.RTCPeerConnection
        window.__peerSharePeerConnections = []
        window.RTCPeerConnection = class extends NativePeerConnection {
          constructor(...args) {
            super(...args)
            const record = { connection: this, states: [this.connectionState], remoteTrackKinds: [] }
            this.addEventListener('connectionstatechange', () => record.states.push(this.connectionState))
            this.addEventListener('track', (event) => record.remoteTrackKinds.push(event.track.kind))
            window.__peerSharePeerConnections.push(record)
          }
        }
      })
    }
  }

  await signIn(pageA, userA)
  await signIn(pageB, userB)
  await openChat(pageA, userB.userId)
  await openChat(pageB, userA.userId)

  return { contextA, contextB, pageA, pageB }
}

async function openChat(page, peerUserId) {
  const peerRow = page.locator('aside').getByRole('button').filter({ hasText: peerUserId }).first()
  await expect(peerRow).toBeVisible()
  await peerRow.click()
  await expect(page.getByRole('heading', { name: peerUserId })).toBeVisible()
}

module.exports = { createPeerChats }
