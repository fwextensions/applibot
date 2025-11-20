import { faker } from "@faker-js/faker";

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
	return `dahlia.internal+${Date.now()}@gmail.com`;
}

export async function getPreferences(listingId) {
	const response = await fetch(`/api/v1/listings/${listingId}/preferences`);

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

export async function submitApplication(listingId, preferences, overrides = {}) {
	const sessionId1 = generateSessionId();
	const sessionId2 = generateSessionId();
	const externalSessionId = `${sessionId1}-${sessionId2}`;
	const email = overrides.email || generateEmail();
	const firstName = faker.person.firstName();
	const lastName = overrides.lastName || faker.person.lastName();

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
			primaryApplicant: {
				email,
				firstName,
				middleName: new Date().toISOString(),
				lastName,
				noPhone: true,
				phone: null,
				phoneType: null,
				preferenceAddressMatch: "",
				dob: "1990-01-01",
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
			},
			adaPrioritiesSelected: "None;",
			agreeToTerms: true,
			householdVouchersSubsidies: false,
			monthlyIncome: 4000,
			totalMonthlyRent: 0,
			alternateContact: Math.random() < 0.33 ? {
				appMemberId: null,
				alternateContactType: "Friend",
				alternateContactTypeOther: "",
				agency: "",
				email: "dahlia.internal@gmail.com",
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

	const response = await fetch("/api/v1/short-form/application", {
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
