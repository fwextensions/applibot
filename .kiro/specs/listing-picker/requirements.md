# Requirements Document

## Introduction

This feature adds a listing picker dropdown to the application generator UI that allows users to select from available pre-lottery listings instead of manually entering a listing ID. The picker fetches listings from the DAHLIA API and filters to show only listings that haven't had their lottery run yet (since post-lottery listings don't accept new applications). The selected listing's ID is then used when generating applications.

## Glossary

- **Listing**: A housing unit or set of units available for rent through the DAHLIA housing portal
- **Lottery_Status**: A field on listings indicating whether the lottery has been run; "Not Yet Run" means applications are still accepted
- **Pre-lottery Listing**: A listing where `Lottery_Status` is "Not Yet Run" and can accept new applications
- **DAHLIA API**: The backend API serving housing listings at `/api/v1/listings.json`
- **Server**: The environment (Full/Production) that determines the base URL for API calls

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a dropdown of available listings, so that I can select one without manually entering the listing ID.

#### Acceptance Criteria

1. WHEN the user selects a server THEN the Listing_Picker SHALL fetch listings from that server's API endpoint
2. WHEN listings are fetched THEN the Listing_Picker SHALL display only listings where Lottery_Status equals "Not Yet Run"
3. WHEN displaying listings THEN the Listing_Picker SHALL show the listing Name in the dropdown options
4. WHEN the user selects a listing from the dropdown THEN the Listing_Picker SHALL use that listing's Id for application generation
5. WHEN listings are loading THEN the Listing_Picker SHALL display a loading indicator

### Requirement 2

**User Story:** As a user, I want the listing picker to handle errors gracefully, so that I understand when something goes wrong.

#### Acceptance Criteria

1. IF the API request fails THEN the Listing_Picker SHALL display an error message to the user
2. IF no pre-lottery listings are available THEN the Listing_Picker SHALL display a message indicating no listings are available
3. WHEN an error occurs THEN the Listing_Picker SHALL allow the user to retry fetching listings

### Requirement 3

**User Story:** As a user, I want to still be able to manually enter a listing ID, so that I can use listings not shown in the picker.

#### Acceptance Criteria

1. WHEN the listing picker is displayed THEN the Listing_Picker SHALL include an option to enter a custom listing ID
2. WHEN the user chooses to enter a custom ID THEN the Listing_Picker SHALL display a text input field for manual entry
3. WHEN switching between picker and manual entry THEN the Listing_Picker SHALL preserve the previously selected or entered value where applicable

### Requirement 4

**User Story:** As a user, I want the listing picker to refresh when I change servers, so that I see the correct listings for each environment.

#### Acceptance Criteria

1. WHEN the user changes the selected server THEN the Listing_Picker SHALL fetch listings from the new server's API
2. WHEN the server changes THEN the Listing_Picker SHALL clear the current selection
3. WHEN fetching from a new server THEN the Listing_Picker SHALL display the loading state during the fetch
