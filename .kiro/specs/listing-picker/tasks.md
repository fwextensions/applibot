# Implementation Plan

- [x] 1. Create listings service with fetch and filter functions





  - [x] 1.1 Create `src/services/listings.js` with fetchListings function


    - Implement API call to `/api/v1/listings.json?type=rental&subset=browse`
    - Use server parameter to determine base URL (proxy paths `/api-full` and `/api-prod`)
    - Return parsed JSON response
    - _Requirements: 1.1, 4.1_

  - [x] 1.2 Implement filterPreLotteryListings function

    - Filter listings array to only include items where `Lottery_Status === "Not Yet Run"`
    - Return filtered array
    - _Requirements: 1.2_
  - [ ]* 1.3 Write property test for filterPreLotteryListings
    - **Property 1: Pre-lottery filtering correctness**
    - **Validates: Requirements 1.2**



- [x] 2. Create ListingPicker component




  - [x] 2.1 Create `src/components/ListingPicker.jsx` with basic structure

    - Accept props: server, selectedListingId, onListingChange, disabled
    - Set up internal state for listings, isLoading, error, mode
    - _Requirements: 1.3, 1.4, 1.5_

  - [x] 2.2 Implement listing fetch on mount and server change

    - Use useEffect to fetch listings when server changes
    - Clear selection when server changes
    - Set loading state during fetch
    - _Requirements: 1.1, 4.1, 4.2, 4.3_
  - [ ]* 2.3 Write property test for server change clearing selection
    - **Property 4: Server change clears selection**
    - **Validates: Requirements 4.2**


  - [x] 2.4 Implement dropdown UI with listing names
    - Render select element with listing options
    - Display listing Name in each option
    - Use listing Id as option value
    - _Requirements: 1.3, 1.4_
  - [ ]* 2.5 Write property test for selection setting correct ID
    - **Property 3: Selection sets correct ID**

    - **Validates: Requirements 1.4**
  - [x] 2.6 Implement loading and error states

    - Show loading indicator when isLoading is true
    - Show error message with retry button when error exists
    - Show "No listings available" when listings array is empty after fetch
    - _Requirements: 1.5, 2.1, 2.2, 2.3_

  - [x] 2.7 Implement manual entry mode toggle

    - Add toggle to switch between picker and manual entry modes
    - Show text input in manual mode
    - Preserve values when switching modes
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 2.8 Write property test for mode switch value preservation
    - **Property 5: Mode switch preserves value**
    - **Validates: Requirements 3.3**


- [x] 3. Integrate ListingPicker into App




  - [x] 3.1 Update App.jsx to use ListingPicker


    - Import and render ListingPicker component
    - Pass server, listingId, and setListingId props
    - Position above or replacing the manual listing ID input in ListingForm
    - _Requirements: 1.3, 1.4_

  - [x] 3.2 Update ListingForm to receive listingId from picker

    - Remove or hide the manual listing ID input (now handled by ListingPicker)
    - Ensure listingId flows correctly to generate function
    - _Requirements: 1.4_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
