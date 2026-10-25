# SYSCO Ethiopia dashboard — public synthetic demo

An independent, sanitized code copy of the executive dashboard. All bundled names, amounts, identifiers and transactions are invented from scratch. The on-screen demo banner identifies them as synthetic.

## Run locally

Install Node.js 22 or newer, then:

```sh
npm ci
npm run dev
```

Open the localhost URL printed by Vite. The demo opens automatically; no login, environment values or credentials are required. Explore the dashboard, bank/customer ledgers, inventory, period filters, reports and exports. The sample period is June 2026.

```sh
npm test
npm run build
npm run preview
```

The static build is in `dist/client`. Serve it with a static web server. This repository does not configure or update any production deployment.

## Scope and limitations

- There are no real accounting records, receipt images, customer/supplier details, bank account identifiers, internal document links, private snapshots, logs, backups, credentials or prior Git history.
- The browser uses `src/demo.ts` only. Sync reloads the synthetic fixture. Source links are local placeholders. Settings, live Google Sheets connectors, receipt evidence and AI services are disabled or safe stubs.
- This demo is not an authentication system or a production accounting service. Some review screens have empty states because private supporting data is intentionally absent. Production server code and connector scripts are excluded.
- No upstream unpublished inventory changes are included. No new license is granted by this repository; no license file has been added.
- Third-party dependencies retain their own licenses. Review them before redistribution or commercial use.

Do not add real business data or secrets to this public repository. Keep any separately developed integrations and their configuration outside the public payload.
