# Admin Operations Guide

## How to Grant Premium

### From the Admin Mini App page

1. Open `/admin`
2. Enter the target Telegram numeric user ID
3. Enter the number of months
4. Submit `Grant premium`

The Worker resolves the internal user automatically and writes:

- a new `subscriptions` row with `tier = premium`
- an `audit_logs` record for traceability

### Through the API

`POST /api/v1/admin/subscriptions/grant`

Example body:

```json
{
  "targetTelegramUserId": 123456789,
  "months": 3
}
```

## What to Check If Premium Does Not Appear

1. verify the user exists in `users`
2. verify a new `subscriptions` row is `active`
3. ask the user to reopen the Mini App or refresh session
4. inspect `audit_logs` for the grant action

## Recommended Admin Routine

- monitor `recentErrors` and `pendingReminders` in `/admin`
- review failed reminder rows before they pile up
- keep at least one `owner` account and one fallback `admin` account
