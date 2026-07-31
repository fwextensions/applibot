# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Applibot** (the Dahlia Application Generator) is a testing/development tool that generates
housing applications for DAHLIA, San Francisco's affordable housing portal. It submits real
applications to a DAHLIA backend, so treat every run as a write against shared test data.

Supports both **rental** and **sale (ownership)** listings.

## Tech Stack

- **React 19** with hooks, no state library
- **Tailwind CSS v4** (CSS-based config via `@import "tailwindcss"` in `src/index.css`; no config file)
- **Vite 8** for dev server and build
- **@faker-js/faker** for realistic applicant data
- **node:test** for unit tests

## Project Structure

```
applibot/
├── index.html                  # Entry HTML with #root
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Layout + tab switching; delegates all logic to the hook
│   ├── index.css               # Tailwind import
│   ├── hooks/
│   │   └── useApplicationGenerator.js   # All generation/export/preview flows and state
│   ├── services/
│   │   ├── applications.js              # Payload construction, preferences, submission
│   │   ├── applications.test.js         # Unit tests for payload + preference logic
│   │   └── listings.js                  # Listing fetch, tenure helpers, grouping
│   └── components/             # Presentational components (forms, picker, tables, banners)
├── bin/cli.js                  # `applibot` CLI: starts dev server and opens a browser
├── scripts/                    # One-off analysis scripts (preference combos, response times)
├── middleware.js               # Vercel Edge Middleware password gate
├── vercel.json                 # Production API rewrites + SPA fallback
└── vite.config.js              # React/Tailwind plugins + dev API proxy
```

## Commands

- `npm run dev` — Vite dev server with HMR and the API proxy
- `npm start` — same, but also opens a browser (via `bin/cli.js`)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `node src/services/applications.test.js` — run unit tests (there is no `test` script)

Never run `npm run dev` as a blocking foreground command in an agent session; it does not exit.

## Server Targeting

Two backends are selectable in the UI, keyed as `full` and `prod` in `SERVERS`
(`src/services/applications.js`). Requests use a `/api-full` or `/api-prod` prefix that is
rewritten to the target's `/api` path:

| Key    | Target                              | Prefix      |
| ------ | ----------------------------------- | ----------- |
| `full` | `https://dahlia-full.herokuapp.com` | `/api-full` |
| `prod` | `https://housing.sfgov.org`         | `/api-prod` |

`full` is the default. In dev the rewrite is Vite's proxy (`vite.config.js`); in production it is
Vercel's rewrites (`vercel.json`). `SERVERS[key].baseUrl` is the public site URL, used only for
building human-facing listing links.

## Listings and Tenure

`fetchListings` requests `/v1/listings.json?subset=browse` with **no `type` filter**, so rental and
sale listings both come back. Listing type is derived from the Salesforce `Tenure` field, mirroring
sf-dahlia-web's `ListingIdentityService`:

- **Sale**: `New sale`, `Resale`
- **Rental**: `New rental`, `Re-rental`

`src/services/listings.js` exposes `isSaleListing`, `isRentalListing`, and `groupListingsByTenure`
(which drives the picker's Rental/Sale `<optgroup>`s, plus an "Other" catch-all so a listing with an
unexpected `Tenure` never silently disappears).

`isSaleListingId(listingId, server)` resolves type for IDs that never passed through the picker
(manual entry, CSV uploads) by fetching the single listing. It caches per server+ID and treats any
failure as rental, so an unreachable listing degrades to the previous behavior instead of throwing.

`filterPreLotteryListings` keeps only listings with `Lottery_Status` unset or `"Not Yet Run"`, and
sorts by name.

## Application Payload

Built by `buildApplicationPayload(listingId, preferences, overrides)` in
`src/services/applications.js`. It is synchronous and pure, which is what makes the dry-run and
export paths possible; anything requiring a network call must be fetched by the caller and passed in
via `overrides`.

Key fields:

- `externalSessionId` — two UUIDs joined with `-`, also used as `uploaded_file.session_uid`
- `primaryApplicant` — contact info, address, and GIS data (`xCoordinate`, `yCoordinate`,
  `candidateScore`) needed for address validation
- `shortFormPreferences` — see Preference Handling below
- `formMetadata` — JSON **string** of completed sections, session uid, and last page

Fixed/generated applicant data: faker first/last names, ISO timestamp as middle name (uniqueness
marker), `dahlia.internal+{firstName}@gmail.com` email, faker DOB aged 21–80, address
1 S VAN NESS AVE APT A, and `monthlyIncome: 6000`. When `generateExtras` is false the generated
email/DOB/alternate contact are skipped and CSV-supplied values are used as-is.

A percentage of applications get an alternate contact (`altContactPercent`) or are phone-only with
no email (`noEmailPercent`).

### Sale-Specific Fields

Sale listings gate the short form behind a **Prerequisites** page that rentals don't have. When
`overrides.isSale` is set, the payload gains these fields (source of truth:
`sf-dahlia-web/app/assets/javascripts/short-form/templates/b0a-prerequisites.html.slim` and the
`application` whitelist in `ShortFormDataService`):

| Field                            | Value                                                    |
| -------------------------------- | -------------------------------------------------------- |
| `isFirstTimeHomebuyer`           | `true`                                                   |
| `hasCompletedHomebuyerEducation` | `true`                                                   |
| `homebuyerEducationAgency`       | random from `HOMEBUYER_EDUCATION_AGENCIES` (5 real names) |
| `hasLoanPreapproval`             | `true`                                                   |
| `lendingAgent`                   | Salesforce contact Id of an active loan officer           |

`lendingAgent` IDs are **server-specific**, so `getLendingAgents(server)` fetches
`/v1/short-form/lending_institutions`, flattens across institutions, keeps only active agents, and
caches per server. If the fetch fails or returns nothing, `lendingAgent` is `null` rather than an
error. Rental payloads contain none of these keys.

These fields land in the Salesforce "Ownership Eligibility" section of the Application record.

**Known gaps for sales:** the real form also requires document uploads (homebuyer education
certificate, loan pre-approval letter) which this tool does not produce — the API accepts
applications without them, but they will look incomplete to a leasing agent. Habitat listings
(which swap homebuyer education for `hasMinimumCreditScore`) and DALP listings (which have their own
screening step) are not specially handled.

## Preference Handling

- `PREFERENCE_NAME_MAP` converts human-readable preference names to developer codes (COP, V-COP,
  DTHP, NRHP, L_W, RtR, RB, and `T1-` Tier 1 variants). Unknown names fall back to the listing's
  lottery bucket short code, then to the raw name.
- Only names in `VALID_RECORD_TYPES` may be used as `recordTypeDevName`; everything else must submit
  as `"Custom"` with the preference identified by `listingPreferenceID`.
- `buildShortFormPreferences` claims one preference and opts out of the rest.
  `PREFERENCE_IMPLICATIONS` auto-claims implied preferences (veteran variants imply their
  non-veteran counterparts; DTHP/NRHP imply L_W).
- Every claimed preference needs a `naturalKey` of `"firstName,lastName,YYYY-MM-DD"`. Without it
  Salesforce attaches no member and the preference does not process correctly.
- A CSV `Preference` column can force a specific devName, or `None`/empty to claim nothing. An
  unavailable preference throws rather than silently falling back.

## Generation Flows

`useApplicationGenerator` owns all state and exposes six flows across two tabs (Upload CSV, Manual
Entry): submit, export-to-CSV, and on-screen preview, each in a single-listing and a CSV variant.
Submissions are spaced 500ms apart and can be cancelled mid-run via a ref-based flag.

`loadListingData(listingId, server)` is the shared entry point: it fetches preferences and listing
type in parallel and, only for sales, the lending agents. It returns `{ preferences, saleOverrides }`
where `saleOverrides` is `{}` for rentals, so rental behavior is unchanged. **Any new generation
flow should call it rather than `getPreferences` directly**, otherwise sale applications will be
built with rental-only fields.

The CSV flows group rows by listing ID to minimize preference fetches, and distinguish a
"listing not found" error (skip) from other failures (count as failed).

## Listing-Specific Special Cases

Listing `a0Wbb000002L0YXEA0` is treated as an SFUSD educator listing: 50% of applicants are marked
`isSFUSDEmployee` with a random job classification, `workInSf: true`, and forced L_W plus Tier 1
preference claiming.

## Deployment

Deployed on Vercel. `middleware.js` is an Edge Middleware password gate driven by the
`APPLIBOT_PASSWORD` environment variable; if that variable is unset, access is open (local dev).
The matcher deliberately excludes the `api-full` and `api-prod` prefixes so API rewrites bypass the
gate.
