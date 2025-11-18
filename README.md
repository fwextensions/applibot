# applibot

applibot is a small React application that generates synthetic applications for DAHLIA housing listings. It automates the multi-step process of fetching listing preferences, creating realistic applicant data, and submitting short-form applications through the existing DAHLIA API.

## Features

- **Automated application runs** – Generate one or many submissions against a listing with a single click.
- **Preference-aware requests** – Pulls the active preference set for a listing and fills the short-form payload accordingly.
- **Reusable architecture** – Business logic lives in a dedicated `useApplicationGenerator` hook and `services/applications` module, while the UI is decomposed into small React components.
- **Tailwind CSS v4** – Uses the new CSS-first configuration approach for styling.
- **One-command startup** – Run the dev server via `npm start`, `npm run dev`, or `npx applibot`.

## Project structure

```
├── bin/cli.js                    # CLI entry that boots Vite and opens the served URL
├── package.json
├── src/
│   ├── App.jsx                   # App shell wired to the custom hook and UI components
│   ├── components/
│   │   ├── CreatedApplicationsList.jsx
│   │   ├── ListingForm.jsx
│   │   └── StatusBanner.jsx
│   ├── hooks/
│   │   └── useApplicationGenerator.js
│   └── services/
│       └── applications.js
└── vite.config.js
```

## Prerequisites

- Node.js 20 or newer (Tailwind v4 tooling requires modern Node versions).
- npm (ships with Node). The CLI relies on `npm_execpath` when available.

## Getting started

```bash
# install dependencies
npm install

# start the development server
npm start
```

`npm start` runs the custom CLI, which launches Vite and automatically opens the detected localhost URL in your default browser. If ports `5173`, `5174`, etc. are already taken, Vite will prompt for another port and the CLI will follow it.

### CLI environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `APPLIBOT_URL` | Override the URL opened in the browser (useful when running `--host` or a tunnel). | `http://localhost:5173` |
| `APPLIBOT_OPEN_DELAY` | Delay (ms) before the fallback URL opens if Vite hasn't printed a link. | `2000` |
| `APPLIBOT_NO_OPEN` | Set to any truthy value to skip auto-opening the browser. | _unset_ |

You can also bypass the CLI and run Vite directly:

```bash
npm run dev        # start Vite without auto-opening a browser
npm run preview    # preview the production build locally
npm run build      # produce an optimized build in dist/
```

To try the app without cloning, publish the package or point `npx` at the repository:

```bash
npx applibot                # runs the CLI if the package is published
# or	npx github:YOUR_ORG/applibot  # runs straight from the repo
```

## Application flow

1. Enter a DAHLIA listing ID and the number of applications to generate.
2. The app fetches preferences for that listing (`services/applications.js#getPreferences`).
3. For each request, `submitApplication` creates fake applicant data using `@faker-js/faker` and posts the payload.
4. Progress is reported in the status banner, and successful applicants appear in the list with Salesforce links.

## Development notes

- The default listing ID is intentionally empty; set one in `useApplicationGenerator` if you prefer a preset.
- API calls are proxied through Vite to `https://dahlia-full.herokuapp.com`. Update `vite.config.js` if you need a different upstream.
- Styling lives in `src/index.css` and leverages Tailwind directives alongside a few custom base rules.
- There are currently no automated tests; manual verification is recommended after significant changes.

## Contributing

1. Fork or branch from `main`.
2. Run `npm install` and `npm start`.
3. Make your changes with tabs, double quotes, and semicolons to match project style.
4. Ensure the generator still creates applications successfully.
5. Open a PR summarizing the change and any manual testing performed.

## Troubleshooting

- **CLI opened the wrong URL** – Ensure no custom console output filters the Vite logs; the CLI reads stdout to detect the first `http://localhost` link. Set `APPLIBOT_URL` as a fallback override.
- **Port already in use** – Vite auto-increments to the next free port. The CLI will follow, but you can pin a specific port with `npm run dev -- --port 4000`.
- **API errors** – Check the browser console/network tab for the upstream response. Authentication or listing permissions may be required.
