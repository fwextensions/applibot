import { useCallback, useRef, useState } from "react";
import { getPreferences, submitApplication, buildApplicationPayload, DEFAULT_SERVER } from "../services/applications";

function downloadCsv(headers, rows, filenamePrefix) {
	const csvContent = [
		headers.join(","),
		...rows.map(row =>
			headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(",")
		),
	].join("\n");

	const blob = new Blob([csvContent], { type: "text/csv" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `${filenamePrefix}-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

export default function useApplicationGenerator(defaultListingId = "") {
	const [listingId, setListingId] = useState(defaultListingId);
	const [currentListingId, setCurrentListingId] = useState(defaultListingId);
	const [numApplications, setNumApplications] = useState(1);
	const [status, setStatus] = useState({ message: "", type: "" });
	const [isGenerating, setIsGenerating] = useState(false);
	const [createdApps, setCreatedApps] = useState([]);
	const [server, setServer] = useState(DEFAULT_SERVER);
	const [altContactPercent, setAltContactPercent] = useState(33);
	const [noEmailPercent, setNoEmailPercent] = useState(5);
	const [dryRunRows, setDryRunRows] = useState([]);
	const cancelRef = useRef(false);

	const showStatus = useCallback((message, type) => {
		setStatus({ message, type });
	}, []);

	const cancelGeneration = useCallback(() => {
		cancelRef.current = true;
		showStatus("Cancelling...", "warning");
	}, [showStatus]);

	const handleGenerateApplications = useCallback(async () => {
		if (isGenerating) {
			return;
		}

		if (!listingId.trim()) {
			showStatus("Please enter a listing ID", "error");
			return;
		}

		if (!numApplications || numApplications < 1) {
			showStatus("Please enter a valid number of applications", "error");
			return;
		}

		if (listingId !== currentListingId) {
			setCreatedApps([]);
			setCurrentListingId(listingId);
		}

		setIsGenerating(true);
		cancelRef.current = false;

		try {
			showStatus("Fetching preferences...", "info");
			const preferences = await getPreferences(listingId, server);

			showStatus(`Found ${preferences.length} preferences. Generating ${numApplications} application(s)...`, "info");

			let successCount = 0;
			let failCount = 0;
			let cancelled = false;

			for (let index = 0; index < numApplications; index += 1) {
				if (cancelRef.current) {
					cancelled = true;
					break;
				}

				try {
					const startTime = performance.now();
					const result = await submitApplication(listingId, preferences, { altContactPercent, noEmailPercent }, server);
					const endTime = performance.now();
					successCount += 1;

					setCreatedApps((previous) => [...previous, { ...result.applicantDetails, responseTime: endTime - startTime }]);

					showStatus(`Progress: ${index + 1}/${numApplications} - Success: ${successCount}, Failed: ${failCount}`, "info");

					await new Promise((resolve) => setTimeout(resolve, 500));
				} catch (error) {
					failCount += 1;
					console.error(`Application ${index + 1} failed:`, error);
					showStatus(`Progress: ${index + 1}/${numApplications} - Success: ${successCount}, Failed: ${failCount}`, "info");
				}
			}

			if (cancelled) {
				showStatus(`Cancelled: ${successCount} successful, ${failCount} failed`, "warning");
			} else if (failCount === 0) {
				showStatus(`✓ Successfully generated ${successCount} application(s)!`, "success");
			} else {
				showStatus(`Completed: ${successCount} successful, ${failCount} failed`, successCount > 0 ? "info" : "error");
			}
		} catch (error) {
			showStatus(`Error: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
			cancelRef.current = false;
		}
	}, [isGenerating, listingId, numApplications, currentListingId, showStatus, server, altContactPercent, noEmailPercent]);

	const processCsvData = useCallback(async (csvData, existingApps = []) => {
		console.log("Processing CSV Data:", csvData);
		if (isGenerating) return;

		setIsGenerating(true);
		cancelRef.current = false;
		showStatus("Starting batch generation...", "info");
		setCreatedApps(existingApps);

		let successCount = 0;
		let failCount = 0;
		let skippedCount = 0;
		let currentAppIndex = 0;
		let cancelled = false;

		try {
			// Group by listing ID to minimize preference fetches
			const appsByListing = {};
			csvData.forEach(row => {
				if (!appsByListing[row.ListingID]) {
					appsByListing[row.ListingID] = [];
				}
				appsByListing[row.ListingID].push({
					firstName: row.FirstName,
					middleName: row.MiddleName,
					lastName: row.LastName,
					email: row.Email,
					numApplications: parseInt(row.NumApplications, 10) || 1,
					preference: row.Preference
				});
			});

			const totalApps = Object.values(appsByListing).reduce((acc, rows) => acc + rows.reduce((rAcc, r) => rAcc + r.numApplications, 0), 0);

			listingLoop:
			for (const [listingId, rows] of Object.entries(appsByListing)) {
				showStatus(`Fetching preferences for listing ${listingId}...`, "info");
				let preferences;
				try {
					preferences = await getPreferences(listingId, server);
				} catch (error) {
					console.error(`Failed to fetch preferences for ${listingId}:`, error);
					const listingAppsCount = rows.reduce((acc, r) => acc + r.numApplications, 0);
					currentAppIndex += listingAppsCount;

					// check if it's a "listing not found" error vs other errors
					if (error.message.includes("not found")) {
						skippedCount += listingAppsCount;
						showStatus(`Listing ${listingId} not found on this server. Skipped ${listingAppsCount} apps.`, "warning");
					} else {
						failCount += listingAppsCount;
						showStatus(`Failed to fetch preferences for listing ${listingId}. Skipping ${listingAppsCount} apps.`,
							"error");
					}
					continue;
				}

				for (const row of rows) {
					for (let i = 0; i < row.numApplications; i++) {
						if (cancelRef.current) {
							cancelled = true;
							break listingLoop;
						}

						currentAppIndex++;
						try {
							const startTime = performance.now();
							const result = await submitApplication(listingId, preferences, {
								firstName: row.firstName,
								middleName: row.middleName,
								lastName: row.lastName,
								email: row.email,
								preference: row.preference,
								altContactPercent,
								noEmailPercent
							}, server);
							const endTime = performance.now();
							successCount++;
							const durationInSeconds = (endTime - startTime) / 1000;
							setCreatedApps(prev => [
								...prev,
								{
									...result.applicantDetails,
									responseTime: durationInSeconds,
									targetCount: row.numApplications
								}
							]);
						} catch (error) {
							failCount++;
							console.error(`Application failed for ${row.email}:`, error);
						}

						showStatus(`Progress: ${currentAppIndex}/${totalApps} - Success: ${successCount}, Failed: ${failCount}`, "info");
						// Small delay to avoid overwhelming the server
						await new Promise((resolve) => setTimeout(resolve, 500));
					}
				}
			}

			if (cancelled) {
				showStatus(`Cancelled: ${successCount} successful, ${failCount} failed`, "warning");
			} else if (successCount === 0 && failCount === 0) {
				showStatus("No applications were generated. Check that listing IDs exist on this server.", "warning");
			} else if (failCount === 0) {
				showStatus(`✓ Successfully generated ${successCount} application(s)!`, "success");
			} else {
				showStatus(`Completed: ${successCount} successful, ${failCount} failed`, successCount > 0 ? "info" : "error");
			}

		} catch (error) {
			showStatus(`Error processing CSV: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
			cancelRef.current = false;
		}
	}, [isGenerating, showStatus, server, altContactPercent, noEmailPercent]);

	const handleExportCsv = useCallback(async () => {
		if (isGenerating) return;

		if (!listingId.trim()) {
			showStatus("Please enter a listing ID", "error");
			return;
		}

		if (!numApplications || numApplications < 1) {
			showStatus("Please enter a valid number of applications", "error");
			return;
		}

		setIsGenerating(true);
		cancelRef.current = false;
		try {
			showStatus("Fetching preferences...", "info");
			const preferences = await getPreferences(listingId, server);

			showStatus(`Building ${numApplications} application(s)...`, "info");

			const prefNameById = new Map(preferences.map(p => [p.listingPreferenceID, p.devName]));

			const rows = [];
			let cancelled = false;
			for (let i = 0; i < numApplications; i++) {
				if (cancelRef.current) {
					cancelled = true;
					break;
				}

				const { payload, applicantDetails } = buildApplicationPayload(listingId, preferences, { altContactPercent, noEmailPercent });
				const claimedPrefs = payload.application.shortFormPreferences
					.filter(p => !p.optOut)
					.map(p => p.recordTypeDevName === "Custom"
						? (prefNameById.get(p.listingPreferenceID) ?? "Custom")
						: p.recordTypeDevName)
					.join("; ");
				console.log(`[${i + 1}] claimedPrefs: ${claimedPrefs || "none"}`);
				rows.push({
					firstName: applicantDetails.firstName,
					lastName: applicantDetails.lastName,
					email: applicantDetails.email,
					dob: payload.application.primaryApplicant.dob,
					listingId,
					claimedPreferences: claimedPrefs || "none",
					payload: JSON.stringify(payload),
				});
			}

			if (rows.length > 0) {
				downloadCsv(["firstName", "lastName", "email", "dob", "listingId", "claimedPreferences", "payload"], rows, "applications-dry-run");
			}

			if (cancelled) {
				showStatus(`Cancelled: exported ${rows.length} application(s)`, "warning");
			} else {
				showStatus(`✓ Exported ${rows.length} application(s) to CSV`, "success");
			}
		} catch (error) {
			showStatus(`Error: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
			cancelRef.current = false;
		}
	}, [isGenerating, listingId, numApplications, server, altContactPercent, noEmailPercent, showStatus]);

	const exportCsvDryRun = useCallback(async (csvData) => {
		if (isGenerating) return;

		if (!csvData || csvData.length === 0) {
			showStatus("No rows to export", "error");
			return;
		}

		setIsGenerating(true);
		cancelRef.current = false;
		showStatus("Building dry run application(s)...", "info");

		try {
			const appsByListing = {};
			csvData.forEach(row => {
				if (!appsByListing[row.ListingID]) {
					appsByListing[row.ListingID] = [];
				}
				appsByListing[row.ListingID].push({
					firstName: row.FirstName,
					middleName: row.MiddleName,
					lastName: row.LastName,
					email: row.Email,
					numApplications: parseInt(row.NumApplications, 10) || 1,
					preference: row.Preference
				});
			});

			const rows = [];
			let cancelled = false;

			listingLoop:
			for (const [listingId, listingRows] of Object.entries(appsByListing)) {
				showStatus(`Fetching preferences for listing ${listingId}...`, "info");
				let preferences;
				try {
					preferences = await getPreferences(listingId, server);
				} catch (error) {
					console.error(`Failed to fetch preferences for ${listingId}:`, error);
					showStatus(`Failed to fetch preferences for listing ${listingId}. Skipping.`, "error");
					continue;
				}

				const prefNameById = new Map(preferences.map(p => [p.listingPreferenceID, p.devName]));

				for (const row of listingRows) {
					for (let i = 0; i < row.numApplications; i++) {
						if (cancelRef.current) {
							cancelled = true;
							break listingLoop;
						}

						const { payload, applicantDetails } = buildApplicationPayload(listingId, preferences, {
							firstName: row.firstName,
							middleName: row.middleName,
							lastName: row.lastName,
							email: row.email,
							preference: row.preference,
							altContactPercent,
							noEmailPercent
						});
						const claimedPrefs = payload.application.shortFormPreferences
							.filter(p => !p.optOut)
							.map(p => p.recordTypeDevName === "Custom"
								? (prefNameById.get(p.listingPreferenceID) ?? "Custom")
								: p.recordTypeDevName)
							.join("; ");
						rows.push({
							firstName: applicantDetails.firstName,
							lastName: applicantDetails.lastName,
							email: applicantDetails.email,
							dob: payload.application.primaryApplicant.dob,
							listingId,
							claimedPreferences: claimedPrefs || "none",
							payload: JSON.stringify(payload),
						});
					}
				}
			}

			if (rows.length > 0) {
				downloadCsv(["firstName", "lastName", "email", "dob", "listingId", "claimedPreferences", "payload"], rows, "applications-dry-run");
			}

			if (cancelled) {
				showStatus(`Cancelled: exported ${rows.length} application(s)`, "warning");
			} else if (rows.length === 0) {
				showStatus("No applications were built. Check that listing IDs are valid.", "warning");
			} else {
				showStatus(`✓ Exported ${rows.length} application(s) to CSV`, "success");
			}
		} catch (error) {
			showStatus(`Error: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
			cancelRef.current = false;
		}
	}, [isGenerating, server, altContactPercent, noEmailPercent, showStatus]);

	const previewDryRun = useCallback(async () => {
		if (isGenerating) return;

		if (!listingId.trim()) {
			showStatus("Please enter a listing ID", "error");
			return;
		}

		if (!numApplications || numApplications < 1) {
			showStatus("Please enter a valid number of applications", "error");
			return;
		}

		setIsGenerating(true);
		cancelRef.current = false;
		setDryRunRows([]);
		try {
			showStatus("Fetching preferences...", "info");
			const preferences = await getPreferences(listingId, server);

			showStatus(`Building ${numApplications} application(s)...`, "info");

			const prefNameById = new Map(preferences.map(p => [p.listingPreferenceID, p.devName]));

			const rows = [];
			let cancelled = false;
			for (let i = 0; i < numApplications; i++) {
				if (cancelRef.current) {
					cancelled = true;
					break;
				}

				const { payload, applicantDetails } = buildApplicationPayload(listingId, preferences, { altContactPercent, noEmailPercent });
				const claimedPrefs = payload.application.shortFormPreferences
					.filter(p => !p.optOut)
					.map(p => p.recordTypeDevName === "Custom"
						? (prefNameById.get(p.listingPreferenceID) ?? "Custom")
						: p.recordTypeDevName)
					.join("; ");
				rows.push({
					firstName: applicantDetails.firstName,
					lastName: applicantDetails.lastName,
					email: applicantDetails.email,
					dob: payload.application.primaryApplicant.dob,
					listingId,
					claimedPreferences: claimedPrefs || "none",
					payload: JSON.stringify(payload),
				});
			}

			setDryRunRows(rows);

			if (cancelled) {
				showStatus(`Cancelled: previewed ${rows.length} application(s)`, "warning");
			} else {
				showStatus(`✓ Previewed ${rows.length} application(s)`, "success");
			}
		} catch (error) {
			showStatus(`Error: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
			cancelRef.current = false;
		}
	}, [isGenerating, listingId, numApplications, server, altContactPercent, noEmailPercent, showStatus]);

	const previewCsvDryRun = useCallback(async (csvData) => {
		if (isGenerating) return;

		if (!csvData || csvData.length === 0) {
			showStatus("No rows to preview", "error");
			return;
		}

		setIsGenerating(true);
		cancelRef.current = false;
		setDryRunRows([]);
		showStatus("Building dry run application(s)...", "info");

		try {
			const appsByListing = {};
			csvData.forEach(row => {
				if (!appsByListing[row.ListingID]) {
					appsByListing[row.ListingID] = [];
				}
				appsByListing[row.ListingID].push({
					firstName: row.FirstName,
					middleName: row.MiddleName,
					lastName: row.LastName,
					email: row.Email,
					numApplications: parseInt(row.NumApplications, 10) || 1,
					preference: row.Preference
				});
			});

			const rows = [];
			let cancelled = false;

			listingLoop:
			for (const [listingId, listingRows] of Object.entries(appsByListing)) {
				showStatus(`Fetching preferences for listing ${listingId}...`, "info");
				let preferences;
				try {
					preferences = await getPreferences(listingId, server);
				} catch (error) {
					console.error(`Failed to fetch preferences for ${listingId}:`, error);
					showStatus(`Failed to fetch preferences for listing ${listingId}. Skipping.`, "error");
					continue;
				}

				const prefNameById = new Map(preferences.map(p => [p.listingPreferenceID, p.devName]));

				for (const row of listingRows) {
					for (let i = 0; i < row.numApplications; i++) {
						if (cancelRef.current) {
							cancelled = true;
							break listingLoop;
						}

						const { payload, applicantDetails } = buildApplicationPayload(listingId, preferences, {
							firstName: row.firstName,
							middleName: row.middleName,
							lastName: row.lastName,
							email: row.email,
							preference: row.preference,
							altContactPercent,
							noEmailPercent
						});
						const claimedPrefs = payload.application.shortFormPreferences
							.filter(p => !p.optOut)
							.map(p => p.recordTypeDevName === "Custom"
								? (prefNameById.get(p.listingPreferenceID) ?? "Custom")
								: p.recordTypeDevName)
							.join("; ");
						rows.push({
							firstName: applicantDetails.firstName,
							lastName: applicantDetails.lastName,
							email: applicantDetails.email,
							dob: payload.application.primaryApplicant.dob,
							listingId,
							claimedPreferences: claimedPrefs || "none",
							payload: JSON.stringify(payload),
						});
					}
				}
			}

			setDryRunRows(rows);

			if (cancelled) {
				showStatus(`Cancelled: previewed ${rows.length} application(s)`, "warning");
			} else if (rows.length === 0) {
				showStatus("No applications were built. Check that listing IDs are valid.", "warning");
			} else {
				showStatus(`✓ Previewed ${rows.length} application(s)`, "success");
			}
		} catch (error) {
			showStatus(`Error: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
			cancelRef.current = false;
		}
	}, [isGenerating, server, altContactPercent, noEmailPercent, showStatus]);

	return {
		listingId,
		setListingId,
		numApplications,
		setNumApplications,
		status,
		isGenerating,
		createdApps,
		handleGenerateApplications,
		processCsvData,
		handleExportCsv,
		exportCsvDryRun,
		previewDryRun,
		previewCsvDryRun,
		dryRunRows,
		cancelGeneration,
		server,
		setServer,
		altContactPercent,
		setAltContactPercent,
		noEmailPercent,
		setNoEmailPercent
	};
}
