import assert from "node:assert/strict";
import test from "node:test";

import {
	buildApplicationPayload,
	buildShortFormPreferences,
	getDevNameFromPreferenceName,
	resolvePreferenceDevName,
} from "./applications.js";

const preferences = [
	{
		listingPreferenceID: "rtr-id",
		preferenceName: "Right to Return Preference (RtR)",
		devName: "RtR",
	},
	{
		listingPreferenceID: "rb-id",
		preferenceName: "Rent Burden Preference (RB)",
		devName: "RB",
	},
	{
		listingPreferenceID: "cop-id",
		preferenceName: "Certificate of Preference (COP)",
		devName: "COP",
	},
	{
		listingPreferenceID: "v-cop-id",
		preferenceName: "Veteran with Certificate of Preference (V-COP)",
		devName: "V-COP",
	},
];

test("maps RtR and RB API names to CSV aliases", () => {
	assert.equal(getDevNameFromPreferenceName("Right to Return Preference (RtR)"), "RtR");
	assert.equal(getDevNameFromPreferenceName("Rent Burden Preference (RB)"), "RB");
});

test("preserves unknown custom preference names", () => {
	assert.equal(getDevNameFromPreferenceName("Live Near Work Preference"), "Live Near Work Preference");
});

test("resolves listing-specific RtR and RB aliases", () => {
	const listingPreferences = [
		{ preferenceName: "Right to Return - Hunters View", devName: "RTR-H" },
		{ preferenceName: "Rent Burdened / Assisted Housing Preference", devName: "RB_AHP" },
	];
	assert.equal(resolvePreferenceDevName("RtR", listingPreferences), "RTR-H");
	assert.equal(resolvePreferenceDevName("RB", listingPreferences), "RB_AHP");
});

test("resolves veteran CSV aliases", () => {
	assert.equal(resolvePreferenceDevName("COP-V", preferences), "V-COP");
});

test("claims only the requested custom preference", () => {
	const result = buildShortFormPreferences(preferences, undefined, { claimedDevName: "RtR" });
	assert.deepEqual(result.filter((preference) => !preference.optOut), [{
		recordTypeDevName: "Custom",
		listingPreferenceID: "rtr-id",
		optOut: false,
	}]);
});

test("links a claimed preference to the applicant via naturalKey", () => {
	const result = buildShortFormPreferences(preferences, undefined, {
		claimedDevName: "RtR",
		naturalKey: "Jane,Doe,1980-01-01",
	});
	const claimed = result.filter((preference) => !preference.optOut);
	assert.equal(claimed.length, 1);
	assert.equal(claimed[0].naturalKey, "Jane,Doe,1980-01-01");
	// opted-out preferences carry no member link
	assert.ok(result.filter((preference) => preference.optOut).every((preference) => !("naturalKey" in preference)));
});

test("buildApplicationPayload sets naturalKey on the claimed preference", () => {
	const { payload } = buildApplicationPayload("listing-id", preferences, {
		preference: "RtR",
		firstName: "Jane",
		lastName: "Doe",
		altContactPercent: 0,
		noEmailPercent: 0,
	});
	const claimed = payload.application.shortFormPreferences.filter((preference) => !preference.optOut);
	assert.equal(claimed.length, 1);
	const { firstName, lastName } = payload.application.primaryApplicant;
	const dob = payload.application.primaryApplicant.dob;
	assert.equal(claimed[0].naturalKey, `${firstName},${lastName},${dob}`);
});

test("uses a supplied middle name instead of a timestamp", () => {
	const { payload } = buildApplicationPayload("listing-id", preferences, {
		middleName: "Quincy",
		preference: "None",
		altContactPercent: 0,
		noEmailPercent: 0,
	});
	assert.equal(payload.application.primaryApplicant.middleName, "Quincy");
});

test("generates a timestamp when no middle name is supplied", () => {
	const { payload } = buildApplicationPayload("listing-id", preferences, {
		preference: "None",
		altContactPercent: 0,
		noEmailPercent: 0,
	});
	assert.equal(Number.isNaN(Date.parse(payload.application.primaryApplicant.middleName)), false);
});

test("builds an RtR payload from the CSV alias", () => {
	const { payload } = buildApplicationPayload("listing-id", preferences, {
		preference: "RtR",
		altContactPercent: 0,
		noEmailPercent: 0,
	});
	const claimedPreferences = payload.application.shortFormPreferences.filter((preference) => !preference.optOut);
	assert.equal(claimedPreferences.length, 1);
	assert.equal(claimedPreferences[0].listingPreferenceID, "rtr-id");
	assert.equal(claimedPreferences[0].recordTypeDevName, "Custom");
});
