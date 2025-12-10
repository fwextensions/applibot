import { faker } from "@faker-js/faker";

export const SERVERS = {
	full: { name: "Full (Testing)", apiPath: "/api-full" },
	prod: { name: "Production", apiPath: "/api-prod" },
};

export const DEFAULT_SERVER = "full";

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
	return PREFERENCE_NAME_MAP[preferenceName] || "L_W";
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

export async function getPreferences(listingId, server = DEFAULT_SERVER) {
	const apiPath = SERVERS[server]?.apiPath || SERVERS[DEFAULT_SERVER].apiPath;
	const response = await fetch(`${apiPath}/v1/listings/${listingId}/preferences`);

	if (!response.ok) {
		throw new Error(`Failed to fetch preferences: ${response.status}`);
	}

	const data = await response.json();

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

	const sessionId1 = generateSessionId();
	const sessionId2 = generateSessionId();
	const externalSessionId = `${sessionId1}-${sessionId2}`;

	const baseEmail = overrides.email || generateEmail();
	const firstName = faker.person.firstName();
	const lastName = overrides.lastName || faker.person.lastName();

	// Add first name as alias to email
	const emailParts = baseEmail.split("@");
	const email = emailParts.length === 2
		? `${emailParts[0]}+${firstName}@${emailParts[1]}`
		: baseEmail;

	// Generate random DOB for applicant 21+ years old
	const dob = faker.date.birthdate({ min: 21, max: 80, mode: "age" }).toISOString().split("T")[0];

	// Phone-only applicant logic (configurable percentage)
	const isPhoneOnly = Math.random() < (noEmailPercent / 100);

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
		workInSf: false,
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
		isSFUSDEmployee: null,
		jobClassification: null,
	};

	const payload = {
		locale: "en",
		uploaded_file: {
			session_uid: externalSessionId,
		},
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
			monthlyIncome: 4000,
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
			shortFormPreferences: preferences.map((preference) => {
				const normalizedPreference = {
					recordTypeDevName: preference.devName,
					listingPreferenceID: preference.listingPreferenceID,
				};

				if (preference.devName === "L_W" || preference.devName === "V-L_W") {
					normalizedPreference.individualPreference = "Live in SF";
					normalizedPreference.optOut = true;
				}

				return normalizedPreference;
			}),
		},
	};

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
		applicantDetails: { firstName, lastName, email, id: result.id, listingId },
	};
}

export { getDevNameFromPreferenceName, generateEmail, generateSessionId };
