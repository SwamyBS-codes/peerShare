// End-to-end coverage for peer-to-peer file transfers, including downloaded-content integrity.
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const { test, expect } = require('@playwright/test')
const { userA, userB } = require('../fixtures/users')
const { createPeerChats } = require('./support')

/**
 * Sends the fixture between two browser users and verifies the received file's
 * size, bytes, and SHA-256 hash before closing both browser contexts.
 */
test('transfers a fixture over WebRTC and preserves its bytes', async ({ browser }) => {
  const { contextA, contextB, pageA, pageB } = await createPeerChats(browser, userA, userB)
  const fixturePath = path.resolve(__dirname, '../fixtures/files/sample.txt')
  const original = await fs.readFile(fixturePath)
  try {
    await pageA.locator('input[type="file"]').setInputFiles(fixturePath)
    await pageA.getByRole('button', { name: 'Send' }).click()
    await expect(pageB.getByText('Incoming file', { exact: true })).toBeVisible()
    await pageB.getByRole('button', { name: 'Accept' }).click()

    const downloadLink = pageB.getByRole('link', { name: 'Download' })
    await expect(downloadLink).toBeVisible({ timeout: 30000 })
    const downloadPromise = pageB.waitForEvent('download')
    await downloadLink.click()
    const download = await downloadPromise
    const downloaded = await fs.readFile(await download.path())

    expect(downloaded.byteLength).toBe(original.byteLength)
    expect(createHash('sha256').update(downloaded).digest('hex'))
      .toBe(createHash('sha256').update(original).digest('hex'))
    expect(downloaded).toEqual(original)
  } finally {
    await Promise.all([contextA.close(), contextB.close()])
  }
})
