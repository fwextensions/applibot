import { useCallback, useState } from "react";
import { getPreferences, submitApplication, DEFAULT_SERVER } from "../services/applications";

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

	const showStatus = useCallback((message, type) => {
		setStatus({ message, type });
	}, []);

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

		try {
			showStatus("Fetching preferences...", "info");
			const preferences = await getPreferences(listingId, server);

			if (preferences.length === 0) {
				showStatus("No preferences found for this listing", "error");
				return;
			}

			showStatus(`Found ${preferences.length} preferences. Generating ${numApplications} application(s)...`, "info");

			let successCount = 0;
			let failCount = 0;

			for (let index = 0; index < numApplications; index += 1) {
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

			if (failCount === 0) {
				showStatus(`✓ Successfully generated ${successCount} application(s)!`, "success");
			} else {
				showStatus(`Completed: ${successCount} successful, ${failCount} failed`, successCount > 0 ? "info" : "error");
			}
		} catch (error) {
			showStatus(`Error: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
		}
	}, [isGenerating, listingId, numApplications, currentListingId, showStatus, server, altContactPercent, noEmailPercent]);

	const processCsvData = useCallback(async (csvData, existingApps = []) => {
		console.log("Processing CSV Data:", csvData);
		if (isGenerating) return;

		setIsGenerating(true);
		showStatus("Starting batch generation...", "info");
		setCreatedApps(existingApps);

		let successCount = 0;
		let failCount = 0;
		let currentAppIndex = 0;

		try {
			// Group by listing ID to minimize preference fetches
			const appsByListing = {};
			csvData.forEach(row => {
				if (!appsByListing[row.ListingID]) {
					appsByListing[row.ListingID] = [];
				}
				appsByListing[row.ListingID].push({
					lastName: row.LastName,
					email: row.Email,
					numApplications: parseInt(row.NumApplications, 10) || 1
				});
			});

			const totalApps = Object.values(appsByListing).reduce((acc, rows) => acc + rows.reduce((rAcc, r) => rAcc + r.numApplications, 0), 0);

			for (const [listingId, rows] of Object.entries(appsByListing)) {
				showStatus(`Fetching preferences for listing ${listingId}...`, "info");
				let preferences;
				try {
					preferences = await getPreferences(listingId, server);
				} catch (error) {
					console.error(`Failed to fetch preferences for ${listingId}:`, error);
					// Fail all apps for this listing
					const listingAppsCount = rows.reduce((acc, r) => acc + r.numApplications, 0);
					failCount += listingAppsCount;
					currentAppIndex += listingAppsCount;
					showStatus(`Failed to fetch preferences for listing ${listingId}. Skipping ${listingAppsCount} apps.`, "error");
					continue;
				}

				for (const row of rows) {
					for (let i = 0; i < row.numApplications; i++) {
						currentAppIndex++;
						try {
							const startTime = performance.now();
							const result = await submitApplication(listingId, preferences, {
								lastName: row.lastName,
								email: row.email,
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

			if (failCount === 0) {
				showStatus(`✓ Successfully generated ${successCount} application(s)!`, "success");
			} else {
				showStatus(`Completed: ${successCount} successful, ${failCount} failed`, successCount > 0 ? "info" : "error");
			}

		} catch (error) {
			showStatus(`Error processing CSV: ${error.message}`, "error");
			console.error(error);
		} finally {
			setIsGenerating(false);
		}
	}, [isGenerating, showStatus, server, altContactPercent, noEmailPercent]);

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
		server,
		setServer,
		altContactPercent,
		setAltContactPercent,
		noEmailPercent,
		setNoEmailPercent
	};
}
