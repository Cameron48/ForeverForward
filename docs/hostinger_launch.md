# Hostinger Launch Setup

## Production Values

Use [config.js](/f:/Vibe Apps/ForeverForward/config.js) as the single file for launch URLs.

Current production template:

```js
window.FOREVER_FORWARD_CONFIG = {
  siteUrl: "https://foreverforwardcoaching.com",
  calendlyUrl: "PASTE_CALENDLY_URL_HERE",
  trainingCheckout: {
    singleSession: "PASTE_STRIPE_SINGLE_SESSION_URL_HERE",
    fourPack: "PASTE_STRIPE_4_SESSION_URL_HERE",
    eightPack: "PASTE_STRIPE_8_SESSION_URL_HERE"
  },
  militaryPrepCheckout: "PASTE_STRIPE_MILITARY_PREP_URL_HERE",
  speakingFormEndpoint: "PASTE_FORM_ENDPOINT_HERE",
  contactEmail: "info@foreverforwardcoaching.com"
};
```

## What To Paste

- `calendlyUrl`
  Your public Calendly booking page for the free consultation.
- `trainingCheckout.singleSession`
  Stripe payment link for one training session.
- `trainingCheckout.fourPack`
  Stripe payment link for the 4-session package.
- `trainingCheckout.eightPack`
  Stripe payment link for the 8-session package.
- `militaryPrepCheckout`
  Stripe payment link for the military prep program.
- `speakingFormEndpoint`
  A live form handler URL. Good options are Formspree, Basin, Getform, or your own serverless endpoint.

## Fastest Launch Path

1. Replace every `PASTE_..._HERE` value in [config.js](/f:/Vibe Apps/ForeverForward/config.js).
2. Rebuild the upload bundle or upload the updated files directly to Hostinger `public_html`.
3. Visit `https://foreverforwardcoaching.com`.
4. Test:
   - Home page loads
   - Consultation page opens or embeds Calendly
   - Training buttons open the correct Stripe checkout pages
   - Military Prep button opens the correct Stripe checkout page
   - Speaking form submits successfully
   - Mobile layout looks clean

## If You Do Not Have Everything Yet

- Leave missing Stripe URLs blank only if you want those buttons to fall back locally.
- If you do not have a speaking form backend yet, the form will stay in a non-live placeholder state.
- Calendly is the highest-priority live value because it powers the main CTA.
