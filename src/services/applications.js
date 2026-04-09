import { faker } from "@faker-js/faker";

export const SERVERS = {
	full: { name: "Full (Testing)", apiPath: "/api-full", baseUrl: "https://dahlia-full.herokuapp.com" },
	prod: { name: "Production", apiPath: "/api-prod", baseUrl: "https://housing.sfgov.org" },
};

export const DEFAULT_SERVER = "full";

// Valid Salesforce record type dev names. Anything not in this set must use "Custom".
const VALID_RECORD_TYPES = new Set([
	"COP", "V-COP", "DTHP", "V-DTHP", "NRHP", "V-NRHP", "L_W", "V-L_W",
]);

const PREFERENCE_NAME_MAP = {
	"Veteran with Certificate of Preference (V-COP)": "V-COP",
	"Certificate of Preference (COP)": "COP",
	"Veteran with Displaced Tenant Housing Preference (V-DTHP)": "V-DTHP",
	"Displaced Tenant Housing Preference (DTHP)": "DTHP",
	"Veteran with Neighborhood Resident Housing Preference (V-NRHP)": "V-NRHP",
	"Neighborhood Resident Housing Preference (NRHP)": "NRHP",
	"Veteran with Live or Work in San Francisco Preference (V-L_W)": "V-L_W",
	"Live or Work in San Francisco Preference": "L_W",
};

function getDevNameFromPreferenceName(preferenceName) {
	return PREFERENCE_NAME_MAP[preferenceName] || "Custom";
}

function generateSessionId() {
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random = Math.random() * 16 | 0;
		const value = char === "x" ? random : (random & 0x3 | 0x8);
		return value.toString(16);
	});
}

function generateEmail() {
	return "dahlia.internal@gmail.com";
}

export async function getLotteryBuckets(listingId, server = DEFAULT_SERVER) {
	const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
	const response = await fetch(`${apiPath}/v1/listings/${listingId}/lottery_buckets`);
	if (!response.ok) return {};
	const data = await response.json();
	// Build a map of preferenceName -> preferenceShortCode
	const map = {};
	for (const bucket of data.lotteryBuckets || []) {
		if (bucket.preferenceName && bucket.preferenceShortCode) {
			map[bucket.preferenceName] = bucket.preferenceShortCode;
		}
	}
	return map;
}

export async function getPreferences(listingId, server = DEFAULT_SERVER) {
	const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
	const prefsResponse = await fetch(`${apiPath}/v1/listings/${listingId}/preferences`);

	if (!prefsResponse.ok) {
		throw new Error(`Failed to fetch preferences: ${prefsResponse.status}`);
	}

	const data = await prefsResponse.json();

	if (!data.preferences || data.preferences.length === 0) {
		throw new Error(`Listing ${listingId} not found on this server`);
	}

	return data.preferences.map((preference) => ({
		listingPreferenceID: preference.listingPreferenceID,
		preferenceName: preference.preferenceName,
		devName: getDevNameFromPreferenceName(preference.preferenceName),
	}));
}

export async function submitApplication(listingId, preferences, overrides = {}, server = DEFAULT_SERVER) {
	// Get percentages from overrides or use defaults
	const altContactPercent = overrides.altContactPercent ?? 33;
	const noEmailPercent = overrides.noEmailPercent ?? 5;

	const { payload, applicantDetails } = buildApplicationPayload(listingId, preferences, { altContactPercent, noEmailPercent, ...overrides });

	const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
	const response = await fetch(`${apiPath}/v1/short-form/application`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`HTTP ${response.status}: ${errorText}`);
	}

	const result = await response.json();

	return {
		...result,
		applicantDetails: { ...applicantDetails, id: result.id, listingId },
	};
}

const LW_DEV_NAMES = new Set(["L_W", "V-L_W", "T1-L_W", "T1-V-L_W"]);

// When a preference is claimed, these additional devNames are also automatically claimed.
// Veteran prefs imply their non-veteran counterparts; neighborhood/displaced prefs imply L_W.
const PREFERENCE_IMPLICATIONS = {
	"V-COP":    ["COP"],
	"V-DTHP":   ["DTHP", "V-L_W", "L_W"],
	"DTHP":     ["L_W"],
	"V-NRHP":   ["NRHP", "V-L_W", "L_W"],
	"NRHP":     ["L_W"],
	"V-L_W":    ["L_W"],
	"T1-V-L_W": ["T1-L_W"],
	"T1-V-NRHP":["T1-NRHP", "T1-V-L_W", "T1-L_W"],
	"T1-NRHP":  ["T1-L_W"],
};

/**
 * Builds shortFormPreferences where one preference is claimed (opted in) and the rest are opted out.
 * Claiming a preference also opts in any implied preferences (e.g. NRHP implies L_W).
 * @param {Array} preferences - All preferences for the listing
 * @param {number} claimedIndex - Index of the preference to claim; -1 means no preference claimed
 * @param {object} options - Additional options
 * @param {boolean} options.forceLW - If true, force L_W preferences to be opted in (e.g. for SFUSD employees)
 * @param {string} options.tier - If set, only preferences in this tier are eligible for claiming. "tier1" or "non-tier1".
 */
export function buildShortFormPreferences(preferences, claimedIndex = undefined, { forceLW = false, tier = null } = {}) {
	// Determine which preferences are eligible for claiming based on tier
	const claimablePrefs = tier === "tier1"
		? preferences.filter(p => p.preferenceName.startsWith("Tier 1"))
		: tier === "non-tier1"
			? preferences.filter(p => !p.preferenceName.startsWith("Tier 1"))
			: preferences;

	// If not specified, randomly pick one claimable preference (or -1 = no preference)
	const resolvedIndex = claimedIndex !== undefined
		? claimedIndex
		: Math.floor(Math.random() * (claimablePrefs.length + 1)) - 1;

	const claimedDevName = resolvedIndex >= 0 ? claimablePrefs[resolvedIndex]?.devName : null;
	const claimedSet = new Set(
		claimedDevName
			? [claimedDevName, ...(PREFERENCE_IMPLICATIONS[claimedDevName] || [])]
			: []
	);

	return preferences.map((preference) => {
		const isLW = LW_DEV_NAMES.has(preference.devName);
		const isCustom = preference.devName === "Custom";
		const pref = {
			recordTypeDevName: preference.devName,
			listingPreferenceID: preference.listingPreferenceID,
		};
		if (isLW) {
			pref.individualPreference = "Live in SF";
		}
		// Custom preferences don't use optOut; standard preferences do
		if (!isCustom) {
			const isClaimedOrImplied = claimedSet.has(preference.devName);
			const isForcedLW = forceLW && isLW;
			pref.optOut = !(isClaimedOrImplied || isForcedLW);
		}
		return pref;
	});
}

export function buildApplicationPayload(listingId, preferences, overrides = {}) {
	const altContactPercent = overrides.altContactPercent ?? 33;
	const noEmailPercent = overrides.noEmailPercent ?? 5;

	const sessionId1 = generateSessionId();
	const sessionId2 = generateSessionId();
	const externalSessionId = `${sessionId1}-${sessionId2}`;

	const baseEmail = overrides.email || generateEmail();
	const firstName = faker.person.firstName();
	const lastName = overrides.lastName || faker.person.lastName();

	const emailParts = baseEmail.split("@");
	const email = emailParts.length === 2
		? `${emailParts[0]}+${firstName}@${emailParts[1]}`
		: baseEmail;

	const dob = faker.date.birthdate({ min: 21, max: 80, mode: "age" }).toISOString().split("T")[0];
	const isPhoneOnly = Math.random() < (noEmailPercent / 100);

	// For listing a0Wbb000002L0YXEA0, 50% of applicants are SFUSD employees
	const isSFUSD = listingId === "a0Wbb000002L0YXEA0" && Math.random() < 0.5;

	const primaryApplicant = {
		email: isPhoneOnly ? "" : email,
		firstName,
		middleName: new Date().toISOString(),
		lastName,
		noPhone: !isPhoneOnly,
		phone: isPhoneOnly ? faker.phone.number({ style: "national" }) : null,
		phoneType: isPhoneOnly ? "Cell" : null,
		preferenceAddressMatch: "",
		dob,
		workInSf: isSFUSD ? true : false,
		xCoordinate: -13627616.12366289,
		yCoordinate: 4547681.551093868,
		whichComponentOfLocatorWasUsed: "eas_gc",
		candidateScore: 100,
		city: "SAN FRANCISCO",
		state: "CA",
		zip: "94103-1267",
		address: "1 S VAN NESS AVE APT A",
		mailingCity: "SAN FRANCISCO",
		mailingState: "CA",
		mailingZip: "94103-1267",
		mailingAddress: "1 S VAN NESS AVE APT A",
		isSFUSDEmployee: isSFUSD ? "Yes" : null,
		jobClassification: isSFUSD ? String(faker.number.int({ min: 100000000, max: 999999999 })) : null,
	};

	const payload = {
		locale: "en",
		uploaded_file: { session_uid: externalSessionId },
		application: {
			id: null,
			applicationLanguage: "English",
			applicationSubmittedDate: new Date().toISOString().split("T")[0],
			applicationSubmissionType: "Electronic",
			status: "submitted",
			answeredCommunityScreening: null,
			externalSessionId,
			listingID: listingId,
			primaryApplicant,
			adaPrioritiesSelected: "None;",
			agreeToTerms: true,
			householdVouchersSubsidies: false,
			monthlyIncome: 6000,
			totalMonthlyRent: 0,
			alternateContact: Math.random() < (altContactPercent / 100) ? {
				appMemberId: null,
				alternateContactType: "Friend",
				alternateContactTypeOther: "",
				agency: "",
				email: `dahlia.internal+${firstName}-${lastName}@gmail.com`,
				firstName: faker.person.firstName(),
				lastName: faker.person.lastName(),
				phone: faker.phone.number(),
				address: "123 Main St",
				city: "San Francisco",
				state: "CA",
				zip: "94105",
				mailingAddress: "123 Main St",
				mailingCity: "San Francisco",
				mailingState: "CA",
				mailingZip: "94105"
			} : null,
			formMetadata: JSON.stringify({
				completedSections: {
					Intro: true,
					Qualify: false,
					You: true,
					Household: true,
					Income: true,
					Preferences: false,
					AlternateContact: true
				},
				session_uid: externalSessionId,
				lastPage: "review-terms",
				groupedHouseholdAddresses: [],
			}),
			shortFormPreferences: buildShortFormPreferences(
				preferences,
				overrides.claimedPreferenceIndex,
				{ forceLW: isSFUSD, tier: isSFUSD ? "tier1" : (listingId === "a0Wbb000002L0YXEA0" ? "non-tier1" : null) },
			),
		},
	};

	return { payload, applicantDetails: { firstName, lastName, email, listingId } };
}

export { getDevNameFromPreferenceName, generateEmail, generateSessionId };
