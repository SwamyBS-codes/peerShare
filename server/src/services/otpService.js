const { OTPService, GmailProvider } = require('@bharathms18/otp-verify');

const email = process.env.GMAIL_EMAIL;
const appPassword = process.env.GMAIL_APP_PASSWORD;

let provider = null;

if (email && appPassword) {
  provider = new GmailProvider({
    email,
    appPassword,
  });
  console.log("OTP Service initialized with Gmail Provider.");
} else {
  console.warn("WARNING: GMAIL_EMAIL or GMAIL_APP_PASSWORD is not configured in .env.");
  console.warn("OTP Service running in DEBUG mode. Verification codes will be printed to the terminal console.");
}

const otpService = new OTPService({
  provider,
  emailSubject: 'PeerShare Verification Code',
  otp: {
    length: 6,
    expiry: 300, // 5 minutes
    maxAttempts: 3,
    resendCooldown: 60
  }
});

module.exports = otpService;
