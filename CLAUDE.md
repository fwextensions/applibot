# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Dahlia Application Generator** - a testing/development tool that generates housing applications for the Dahlia housing portal (San Francisco's affordable housing application system). The tool consists of a simple web interface that communicates with a local proxy server, which in turn communicates with the Dahlia API at `https://dahlia-full.herokuapp.com`.

## Architecture

The application has three main components:

### 1. Frontend (`index.html` + `app.js` + `styles.css`)
- Simple HTML form interface for entering listing ID and number of applications
- Client-side JavaScript handles form logic and API communication
- Makes requests to local proxy server at `http://localhost:3000`

### 2. Proxy Server (`server.js`)
- Node.js HTTP server running on port 3000
- Proxies API requests from frontend to Dahlia API
- Handles CORS headers to allow local development
- Only proxies `/api/*` endpoints to `https://dahlia-full.herokuapp.com`

### 3. Application Logic (`app.js`)
The application generator:
- Fetches preferences for a listing using `/api/v1/listings/{listingId}/preferences`
- Generates unique test applications with:
  - Unique session IDs (UUID format)
  - Timestamped email addresses (`dahlia.internal+{timestamp}@gmail.com`)
  - Fixed test applicant data (name, DOB, address at 1 S VAN NESS AVE)
- Maps San Francisco housing preferences to their developer names:
  - Certificate of Preference (COP, V-COP)
  - Displaced Tenant Housing Preference (DTHP, V-DTHP)
  - Neighborhood Resident Housing Preference (NRHP, V-NRHP)
  - Live or Work in San Francisco (L_W, V-L_W)
- Submits applications via POST to `/api/v1/short-form/application`
- Batches submissions with 500ms delay between each to avoid overwhelming the server

## Running the Application

1. Start the proxy server:
   ```bash
   node server.js
   ```
   This will start the server on port 3000

2. Open `index.html` in a web browser

3. Enter a Dahlia listing ID (e.g., `a0Wbb000001JZxZEAW`) and number of applications to generate

## Development Commands

- **Start server**: `node server.js` or `npm start`
- **Test manually**: Open `index.html` in browser after starting server

## Key Technical Details

### Application Payload Structure
Applications submitted to Dahlia require:
- `externalSessionId`: Combination of two UUIDs (format: `{uuid1}-{uuid2}`)
- `applicationSubmittedDate`: Current date in YYYY-MM-DD format
- `primaryApplicant`: Object with contact info, address, and preference matching data
- `shortFormPreferences`: Array of preference objects with `listingPreferenceID` and `recordTypeDevName`
- `formMetadata`: JSON string containing completed sections and session info
- GIS coordinates for address validation (`xCoordinate`, `yCoordinate`, `candidateScore`)

### Preference Handling
- Live/Work preferences require additional fields: `individualPreference: "Live in SF"` and `optOut: true`
- Each preference has a `listingPreferenceID` (unique per listing) and `recordTypeDevName` (preference type code)
- The mapping in `PREFERENCE_NAME_MAP` converts human-readable preference names to developer codes

### Fixed Test Data
All applications use:
- Name: Test [ISO timestamp] User
- DOB: 1990-01-01
- Address: 1 S VAN NESS AVE APT A, San Francisco, CA 94103-1267
- Income: $4,000 monthly
- No phone number (noPhone: true)

## Auxiliary Files

- `test.js`: Contains raw fetch requests copied from browser DevTools (network traffic capture)
- `test.json`: HAR (HTTP Archive) file with recorded network traffic for debugging/reference
