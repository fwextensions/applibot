import { SERVERS, DEFAULT_SERVER } from './applications.js';

/**
 * Fetches listings from the DAHLIA API
 * @param {string} server - Server key ('full' or 'prod')
 * @returns {Promise<Array>} Array of listing objects
 */
export async function fetchListings(server = DEFAULT_SERVER) {
  const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
  const response = await fetch(`${apiPath}/v1/listings.json?type=rental&subset=browse`);

  if (!response.ok) {
    throw new Error(`Failed to fetch listings: ${response.status}`);
  }

  const data = await response.json();
  return data.listings || [];
}

/**
 * Filters listings to only include pre-lottery listings
 * @param {Array} listings - Array of listing objects
 * @returns {Array} Filtered array containing only listings where Lottery_Status === "Not Yet Run"
 */
export function filterPreLotteryListings(listings) {
  return listings
    .filter(listing => !listing.Lottery_Status || listing.Lottery_Status === "Not Yet Run")
    .sort((a, b) => a.Name.localeCompare(b.Name));
}
