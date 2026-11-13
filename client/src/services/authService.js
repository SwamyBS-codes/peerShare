/** Centralizes client authentication requests, token persistence, and authorized fetches. */
// eslint-disable-next-line no-undef
export const API_URL = typeof __BACKEND_URL__ !== 'undefined' ? __BACKEND_URL__ : (import.meta.env.VITE_API_URL || '');

/**
 * Utility to decode JWT token without external dependencies
 */
export function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

/** Parses API responses and reports a useful error when the body is not JSON. */
async function parseJsonResponse(response) {
  const raw = await response.text()
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch {
    const message = raw.includes('Cannot GET /api/auth')
      ? 'The backend reset endpoint is not available. Please redeploy the server with the latest auth routes.'
      : 'The server responded with an unexpected non-JSON response.'
    throw new Error(message)
  }
}

const TOKEN_KEY = 'peershare_token'

/** Stores a token in the browser storage selected by the user's session preference. */
function persistToken(token) {
  const sessionOnly = sessionStorage.getItem('peershare_session_only') === '1'
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
  if (sessionOnly) {
    sessionStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.setItem(TOKEN_KEY, token)
  }
}


/** Authentication API and session helpers used throughout the client. */
export const authService = {
  /**
   * Request OTP code for a new account signup
   */
  async requestRegisterOtp(email, userId, password) {
    const res = await fetch(`${API_URL}/api/auth/register-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId, password })
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Signup request failed.')
    return data // contains ok, message, otp (only in debug mode)
  },

  /**
   * Verify OTP and complete signup registration
   */
  async verifyOtpAndRegister(email, userId, password, otp) {
    const res = await fetch(`${API_URL}/api/auth/register-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId, password, otp })
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'OTP verification failed.')
    
    if (data.token) {
      persistToken(data.token)
    }
    return data
  },

  /**
   * Log in an existing user
   */
  async login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Login failed.')

    if (data.token) {
      persistToken(data.token)
    }
    return data
  },

  /** Requests a password-reset code for the supplied email address. */
  async requestPasswordReset(email) {
    const res = await fetch(`${API_URL}/api/auth/forgot-password-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Password reset request failed.')
    return data
  },

  /** Verifies the reset code and updates the account password. */
  async resetPassword(email, otp, password) {
    const res = await fetch(`${API_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, password })
    })
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Password reset failed.')
    return data
  },

  /**
   * Remove authentication session
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  },

  /** Persists a refreshed token using the current storage preference. */
  persistTokenFromSettings(token) {
    if (token) persistToken(token)
  },

  /** Loads the current user's profile using the authenticated API helper. */
  async fetchMyProfile() {
    const res = await this.fetchAuth('/api/users/me')
    const data = await parseJsonResponse(res)
    if (!res.ok) throw new Error(data.message || 'Failed to load profile.')
    return data.user
  },

  /**
   * Retrieve active token
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)
  },

  /**
   * Get parsed current user payload
   */
  getCurrentUser() {
    const token = this.getToken()
    if (!token) return null
    
    const payload = parseJwt(token)
    if (!payload) return null

    // Check expiration
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      this.logout()
      return null
    }
    return payload // contains { id, userId }
  },

  /**
   * Make a fetch request with JWT authorization header automatically attached
   */
  async fetchAuth(url, options = {}) {
    const token = this.getToken()
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    const fullUrl = url.startsWith('/') ? `${API_URL}${url}` : url
    const response = await fetch(fullUrl, { ...options, headers })
    
    // Handle unauthorized tokens automatically
    if (response.status === 401 || response.status === 403) {
      this.logout()
      window.dispatchEvent(new Event('auth-expired'))
    }
    return response
  }
}
