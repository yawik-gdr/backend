module.exports = ({ env }) => ({
  email: {
    config: {
      provider: 'nodemailer',
      providerOptions: {
        host: env('EMAIL_SMTP_HOST', 'mc.cross-solution.de'), //SMTP Host
        port: env('EMAIL_SMTP_PORT', 587), //SMTP Port
        secure: env('EMAIL_SMTP_SECURE', true),
        auth: {
          user: env('EMAIL_SMTP_USERNAME', ''),
          pass: env('EMAIL_SMTP_PASSWORD', ''),
        },
        rejectUnauthorized: true,
        requireTLS: false,
      },
      settings: {
        defaultFrom: env('EMAIL_SETTINGS_FROM', ''),
        defaultReplyTo: env('EMAIL_SETTINGS_REPLYTO', ''),
      },

    },
  },
  upload: {
    config: {
      breakpoints: {
        xlarge: 1920,
        large: 1000,
        medium: 750,
        small: 500,
        xsmall: 64
      },
    },
  },
  "custom-api": {
    enabled: true,
  },
});
