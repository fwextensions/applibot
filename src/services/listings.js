import { SERVERS, DEFAULT_SERVER } from './applications.js';

// Salesforce `Tenure` values, mirroring sf-dahlia-web's ListingIdentityService.
export const SALE_TENURES = ['New sale', 'Resale'];
export const RENTAL_TENURES = ['New rental', 'Re-rental'];

/**
 * @param {object} listing
 * @returns {boolean} True when the listing is a sale (ownership) listing
 */
export function isSaleListing(listing) {
	return !!listing && SALE_TENURES.includes(listing.Tenure);
}

/**
 * @param {object} listing
 * @returns {boolean} True when the listing is a rental listing
 */
export function isRentalListing(listing) {
	return !!listing && RENTAL_TENURES.includes(listing.Tenure);
}

/**
 * Fetches listings from the DAHLIA API.
 * No `type` filter is sent, so both rental and sale listings come back.
 * @param {string} server - Server key ('full' or 'prod')
 * @returns {Promise<Array>} Array of listing objects
 */
export async function fetchListings(server = DEFAULT_SERVER) {
	const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
	const response = await fetch(`${apiPath}/v1/listings.json?subset=browse`);

	if (!response.ok) {
		throw new Error(`Failed to fetch listings: ${response.status}`);
	}

	const data = await response.json();
	return data.listings || [];
}

/**
 * Fetches a single listing by ID. Used to determine listing type for manually
 * entered or CSV-supplied listing IDs that never passed through the picker.
 * @param {string} listingId
 * @param {string} server - Server key ('full' or 'prod')
 * @returns {Promise<object|null>} The listing, or null if it could not be fetched
 */
export async function fetchListing(listingId, server = DEFAULT_SERVER) {
	const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
	const response = await fetch(`${apiPath}/v1/listings/${listingId}.json`);

	if (!response.ok) {
		return null;
	}

	const data = await response.json();
	return data.listing || null;
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

/**
 * Splits listings into optgroup-ready buckets: Rental, Sale, and anything with an
 * unrecognized Tenure so nothing silently disappears from the picker.
 * @param {Array} listings - Array of listing objects
 * @returns {Array<{label: string, listings: Array}>} Non-empty groups, in display order
 */
export function groupListingsByTenure(listings = []) {
	const groups = [
		{ label: 'Rental', listings: listings.filter(isRentalListing) },
		{ label: 'Sale', listings: listings.filter(isSaleListing) },
		{ label: 'Other', listings: listings.filter(l => !isRentalListing(l) && !isSaleListing(l)) },
	];

	return groups.filter(group => group.listings.length > 0);
}

// Cache of `${server}:${listingId}` -> boolean, so repeated generation runs against the
// same listing don't refetch it.
const saleListingCache = new Map();

/**
 * Resolves whether a listing ID refers to a sale listing. Works for IDs that never went
 * through the picker (manual entry, CSV uploads). Unknown/unfetchable listings are
 * treated as rentals so the existing behavior is preserved.
 * @param {string} listingId
 * @param {string} server - Server key ('full' or 'prod')
 * @returns {Promise<boolean>}
 */
export async function isSaleListingId(listingId, server = DEFAULT_SERVER) {
	const cacheKey = `${server}:${listingId}`;
	if (saleListingCache.has(cacheKey)) {
		return saleListingCache.get(cacheKey);
	}

	let result = false;
	try {
		result = isSaleListing(await fetchListing(listingId, server));
	} catch (error) {
		console.warn(`Could not determine listing type for ${listingId}; assuming rental.`, error);
	}

	saleListingCache.set(cacheKey, result);
	return result;
}
