# Test Plan

## Unit Tests

- intent classification for plan, income, expense, debt, repayment, limit, summary, help, fallback
- amount parser for `200 ming`, `3 million`, `50 dollar`, `100$`
- date parser for `ertaga`, `indin`, `dushanba`, `oy oxirida`, `bugun soat 17:00`
- debt parser for lender/borrower direction and counterparty extraction
- quota guard behavior for free and premium users

## Integration Tests

- session exchange and user bootstrap
- create plan and reminder generation
- create scheduled expense from natural language input
- create debt and partial repayment flow
- admin premium grant flow
- reminder claiming RPC contract

## Manual QA

- open Mini App in Telegram for UZ, EN, and RU
- switch theme from blue to gold on premium account
- verify gold theme is locked on free account
- click calendar day and create plan, expense, and debt due date
- force a parse failure and confirm the bot returns a helpful fallback
