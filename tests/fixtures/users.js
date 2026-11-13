const userA = {
  email: process.env.E2E_USER_A_EMAIL || 'alice@peershare.test',
  userId: process.env.E2E_USER_A_ID || 'alice_test',
}

const userB = {
  email: process.env.E2E_USER_B_EMAIL || 'bob@peershare.test',
  userId: process.env.E2E_USER_B_ID || 'bob_test',
}

function getE2EPassword() {
  const password = process.env.E2E_TEST_PASSWORD
  if (!password) {
    throw new Error('E2E_TEST_PASSWORD must be set to a test-only password.')
  }
  return password
}

module.exports = { userA, userB, getE2EPassword }
