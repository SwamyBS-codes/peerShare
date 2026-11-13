const { test, expect } = require('@playwright/test')
const { userA, userB } = require('../fixtures/users')
const { createPeerChats } = require('./support')

test('video calls establish peer connections and exchange media tracks', async ({ browser }) => {
  const { contextA, contextB, pageA, pageB } = await createPeerChats(browser, userA, userB, true)
  try {
    await pageA.getByRole('button', { name: 'Video call' }).click()
    const answerButton = pageB.getByRole('button', { name: 'Answer' })
    await expect(answerButton).toBeVisible()
    await answerButton.click()

    const connectedWithMedia = () => pageA.waitForFunction(() => (
      window.__peerSharePeerConnections.some(({ states, remoteTrackKinds }) =>
        states.includes('connected') &&
        remoteTrackKinds.includes('audio') &&
        remoteTrackKinds.includes('video')
      )
    ), null, { timeout: 30000 })
    await Promise.all([
      connectedWithMedia(),
      pageB.waitForFunction(() => (
        window.__peerSharePeerConnections.some(({ states, remoteTrackKinds }) =>
          states.includes('connected') &&
          remoteTrackKinds.includes('audio') &&
          remoteTrackKinds.includes('video')
        )
      ), null, { timeout: 30000 }),
    ])

    await pageA.getByRole('button', { name: 'End call' }).click()
    await Promise.all([pageA, pageB].map((page) => page.waitForFunction(() => (
      window.__peerSharePeerConnections.length > 0 &&
      window.__peerSharePeerConnections.every(({ connection }) => connection.connectionState === 'closed')
    ), null, { timeout: 15000 })))
    await expect(pageA.getByRole('button', { name: 'End call' })).toHaveCount(0)
    await expect(pageB.getByRole('button', { name: 'End call' })).toHaveCount(0)
  } finally {
    await Promise.all([contextA.close(), contextB.close()])
  }
})
