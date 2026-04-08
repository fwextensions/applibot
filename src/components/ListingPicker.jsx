import { useState, useEffect, useRef } from 'react';
import { fetchListings, filterPreLotteryListings } from '../services/listings';
import { SERVERS } from '../services/applications';

/**
 * ListingPicker component - allows users to select from available pre-lottery listings
 * or manually enter a listing ID.
 * 
 * @param {Object} props
 * @param {string} props.server - Current server selection ('full' | 'prod')
 * @param {string} props.selectedListingId - Currently selected listing ID
 * @param {function} props.onListingChange - Callback when listing changes
 * @param {boolean} props.disabled - Disable during generation
 */
export default function ListingPicker({ 
  server, 
  selectedListingId, 
  onListingChange, 
  disabled = false 
}) {
  // Internal state
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('picker'); // 'picker' | 'manual'
  
  // Store values for each mode to preserve when switching
  const [pickerValue, setPickerValue] = useState('');
  const [manualValue, setManualValue] = useState('');
  
  // Track if this is the initial mount to avoid clearing selection
  const isInitialMount = useRef(true);
  const previousServer = useRef(server);

  // Fetch listings when server changes
  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const allListings = await fetchListings(server);
        const preLotteryListings = filterPreLotteryListings(allListings);
        setListings(preLotteryListings);
      } catch (err) {
        setError(err.message || 'Failed to fetch listings');
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadListings();
    
    // Clear selection when server changes (but not on initial mount)
    if (!isInitialMount.current && previousServer.current !== server) {
      onListingChange('');
      setPickerValue('');
      setManualValue('');
    }
    
    isInitialMount.current = false;
    previousServer.current = server;
  }, [server, onListingChange]);


  // Handle retry button click
  const handleRetry = () => {
    const loadListings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const allListings = await fetchListings(server);
        const preLotteryListings = filterPreLotteryListings(allListings);
        setListings(preLotteryListings);
      } catch (err) {
        setError(err.message || 'Failed to fetch listings');
        setListings([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadListings();
  };

  // Handle dropdown selection change
  const handlePickerChange = (e) => {
    const value = e.target.value;
    setPickerValue(value);
    onListingChange(value);
  };

  // Handle manual input change
  const handleManualChange = (e) => {
    const value = e.target.value;
    setManualValue(value);
    onListingChange(value);
  };

  // Handle mode toggle - preserve values when switching
  const handleModeToggle = () => {
    if (mode === 'picker') {
      // Switching to manual mode - preserve picker value in manual if it exists
      if (pickerValue && !manualValue) {
        setManualValue(pickerValue);
      }
      setMode('manual');
      // Use manual value (or preserved picker value)
      onListingChange(manualValue || pickerValue);
    } else {
      // Switching to picker mode - preserve manual value in picker if it matches a listing
      const matchingListing = listings.find(l => l.Id === manualValue);
      if (matchingListing && !pickerValue) {
        setPickerValue(manualValue);
      }
      setMode('picker');
      // Use picker value (or preserved manual value if it matches)
      onListingChange(pickerValue || (matchingListing ? manualValue : ''));
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Listing
        </label>
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading listings...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Listing
        </label>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm mb-2">{error}</p>
          <button
            onClick={handleRetry}
            disabled={disabled}
            className="text-sm text-red-600 hover:text-red-800 underline disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const listingURL = `${SERVERS[server]?.baseUrl}/listings/${selectedListingId}`;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-semibold text-gray-700">
          Listing
        </label>
        <button
          type="button"
          onClick={handleModeToggle}
          disabled={disabled}
          className="px-4 py-2 rounded-md text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {mode === 'picker' ? 'Enter ID manually' : 'Select from list'}
        </button>
      </div>

      {mode === 'picker' ? (
        <>
          {listings.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-700 text-sm">No pre-lottery listings available</p>
            </div>
          ) : (
            <select
              value={pickerValue}
              onChange={handlePickerChange}
              disabled={disabled}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
            >
              <option value="">Select a listing...</option>
              {listings.map((listing) => (
                <option key={listing.Id} value={listing.Id}>
                  {listing.Name}
                </option>
              ))}
            </select>
          )}
        </>
      ) : (
        <input
          type="text"
          value={manualValue}
          onChange={handleManualChange}
          disabled={disabled}
          placeholder="e.g., a0Wbb000001JZxZEAW"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
        />
      )}
      {selectedListingId && (
        <a
          href={listingURL}
          target="_blank"
          rel="noopener noreferrer"
          title={listingURL}
          className="block px-4 py-2 text-sm text-gray-400 hover:text-blue-600 transition-colors"
        >
          {selectedListingId}
        </a>
      )}
    </div>
  );
}
