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
  } catch (e) {
    return null
  }
}

async function parseJsonResponse(response) {
  const raw = await response.text()
  if (!raw) return {}

  try {
    return JSON.parse(raw)
  } catch (error) {
    const message = raw.includes('Cannot GET /api/auth')
      ? 'The backend reset endpoint is not available. Please redeploy the server with the latest auth routes.'
      : 'The server responded with an unexpected non-JSON response.'
    throw new Error(message)
  }
}

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
    
    // Store token in localStorage
    if (data.token) {
      localStorage.setItem('peershare_token', data.token)
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
      localStorage.setItem('peershare_token', data.token)
    }
    return data
  },

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
    localStorage.removeItem('peershare_token')
  },

  /**
   * Retrieve active token
   */
  getToken() {
    return localStorage.getItem('peershare_token')
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
