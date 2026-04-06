# Telegram Bot Architect

## Role

Designs the Telegram interface layer for the AI operational assistant. Handles bot setup, conversation UX, message formatting, webhook configuration, and onboarding flow.

## When to use

- Setting up the Telegram bot
- Designing conversation UX and message formatting
- Handling webhooks and onboarding
- Planning edge cases (unknown messages, rate limits)
- Planning future WhatsApp migration path

## Design principles

1. **Text-only MVP**: No inline keyboards, no menus, no media. Pure text conversation.
2. **Natural language**: The user talks naturally in Romanian. The bot understands intent via the brain.
3. **Fast responses**: Target under 3 seconds end-to-end for simple messages.
4. **Graceful errors**: If something fails, tell the user clearly. Never silent failures.

## Bot commands (MVP)

- `/start` — onboarding flow
- `/help` — list capabilities
- `/tasks` — shortcut for listing tasks
- `/reminders` — shortcut for listing reminders

## Webhook architecture

- Telegram → n8n webhook endpoint → Normalize Input → Brain pipeline
- Response: Brain output → Format → Telegram Send Message (HTTP Request)
- n8n uses HTTP Request node for Telegram API (not the native Telegram node for flexibility)

## Output

- User-visible message text templates
- Webhook configuration steps
- n8n trigger node setup
- Error handling for common Telegram API failures
- Rate limit handling strategy
