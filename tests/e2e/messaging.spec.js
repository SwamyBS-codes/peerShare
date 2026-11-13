const { test, expect } = require('@playwright/test')
const { randomUUID } = require('node:crypto')
const { userA, userB } = require('../fixtures/users')
const { createPeerChats } = require('./support')

test('messages arrive live and remain in persisted conversation history', async ({ browser }) => {
  const { contextA, contextB, pageA, pageB } = await createPeerChats(browser, userA, userB)
  try {
    const content = `message-${randomUUID()}`
    await pageA.getByPlaceholder('Type a message').fill(content)
    await pageA.getByRole('button', { name: 'Send' }).click()

    await expect(pageB.getByText(content, { exact: true })).toBeVisible()
    await expect(pageA.getByRole('img', { name: /Delivered|Read/ }).last()).toBeVisible()

    await pageB.reload()
    await expect(pageB.locator('aside').getByRole('button').filter({ hasText: userA.userId }).first()).toBeVisible()
    await pageB.locator('aside').getByRole('button').filter({ hasText: userA.userId }).first().click()
    await expect(pageB.getByText(content, { exact: true })).toBeVisible()
  } finally {
    await Promise.all([contextA.close(), contextB.close()])
  }
})
