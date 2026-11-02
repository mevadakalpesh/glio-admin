# Gilo Admin

Gilo's dedicated rides and trips admin frontend. React, TypeScript, Vite,
Tailwind and free shadcn/ui components. Packages are deferred.

## Run

Use Node 20.19+ or 22.12+. Run `npm ci` then `npm run dev` and open
http://127.0.0.1:5173. The local proxy targets port 3000 by default; configure
ADMIN_API_TARGET if needed. Backend staff access must be configured first.

See [staff setup](docs/ADMIN_ACCESS.md) and [implementation plan](docs/ADMIN_PLAN.md).
No default staff password, seeded owner, consumer-token login or browser-held
provider secret is provided. Until the backend is configured, login displays an
unavailable state and never opens a demo workspace.

## Checks

- `npm test` — staff login/MFA/recovery and journey-browser component tests.
- `npm run lint`
- `npm run build`
- Backend: `npm run test:admin` in `/home/kalpesh/boxwatch-admin`.

Team & access, Audit and owner-only read-only Overview, People and Trips & rides
and local verification evidence inspection have APIs. Money and other operational
pages remain planned. S3 evidence viewing requires private-storage remediation;
see the storage limitation in docs/ADMIN_ACCESS.md. No financial or customer intervention actions
are enabled in this delivery.

`src/shadcn.css` is the upstream MIT-licensed shadcn 4.22.0 stylesheet, kept locally
so the component-generation CLI is not a runtime dependency. License attribution
is in `docs/THIRD_PARTY_NOTICES.md`. Review the current CLI before generating future
components; it need not be installed in the application.

## Recorded tracking street map

Set `VITE_GOOGLE_MAPS_BROWSER_KEY` before building to enable the optional street
map in authorized location inspection. This is a public browser key, not a server
credential. Use a separate key restricted to the admin website origins and Maps
JavaScript API, with billing and API access configured in Google Cloud. Never copy
a backend provider secret into a Vite variable. Without a key, or if Google fails,
the coordinate preview remains available. Opening the map contacts Google Maps;
inspection coordinates are drawn locally as recorded samples, not requested driving
directions. Maps load only after staff explicitly open the street map.

Setup: https://developers.google.com/maps/documentation/javascript/get-api-key
# glio-admin
# glio-admin
