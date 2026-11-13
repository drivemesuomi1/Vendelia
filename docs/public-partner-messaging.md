# Public partner messaging

The public homepage business section and partner application page focus on
customer discovery, showcasing offers and managing vouchers. Public commission
percentages, fee promises and commission/payout breakdowns have been removed
from these sections in English, Finnish and Swedish. The CTA is “Become a
Vendelia partner” and links to `/{locale}/register/business`.

The existing email application flow is preserved: the visitor's email app opens
a prefilled application, and the visitor must send it. No automatic application
submission, account creation or marketing service is implied by the benefits.

Relevant files:

- `frontend/src/app/[locale]/(shop)/page.tsx`: homepage partner section.
- `frontend/src/features/auth/components/BusinessApplyForm.tsx`: application and benefits.
- `frontend/messages/{en,fi,sv}.json`: localized marketing copy and CTA.
- `frontend/src/styles/globals.css`: responsive partner section typography.

This is a public presentation change, with no database migration. Private admin
and business commission/payout displays and existing calculations remain in
place. Backend calculations still use the global configured rate; this change
does not implement negotiated rates per merchant or deal. That requires a
separate agreement/rate model and purchase-time snapshots before financial
calculations can reflect different partner agreements. Public API metadata has
not been redesigned as part of this copy update.
