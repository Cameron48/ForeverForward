# Forever Forward Integrations

## Current State

The site is now config-driven for its live conversion links. Update [config.js](/f:/Vibe Apps/ForeverForward/config.js) when you have real production URLs.

## What Goes Where

- `calendlyUrl`
  Use the public Calendly scheduling URL or embed URL for the consultation page.
- `trainingCheckout.singleSession`
  Stripe checkout link for a single training session.
- `trainingCheckout.fourPack`
  Stripe checkout link for the 4-session package.
- `trainingCheckout.eightPack`
  Stripe checkout link for the 8-session package.
- `militaryPrepCheckout`
  Stripe checkout link for the military prep program.
- `speakingFormEndpoint`
  Form handler endpoint for speaking inquiries.
- `contactEmail`
  Reserved for future email-based fallback.

## Behavior

- If a live URL exists in `config.js`, the page uses it automatically.
- If a live URL is missing, the page falls back to the local consultation flow or placeholder state.
- The consultation page embeds Calendly when `calendlyUrl` is present.
- The speaking page submits to `speakingFormEndpoint` when it is present.

## Recommended Next Step

1. Add the real Calendly URL.
2. Add Stripe checkout links for all paid offers.
3. Point `speakingFormEndpoint` at a form backend or serverless function.
