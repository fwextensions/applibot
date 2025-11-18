import { useCallback, useState } from "react";
import { getPreferences, submitApplication } from "../services/applications";

export default function useApplicationGenerator(defaultListingId = "a0Wbb000001JZxZEAW") {
	const [listingId, setListingId] = useState(defaultListingId);
	const [currentListingId, setCurrentListingId] = useState(defaultListingId);
	const [numApplications, setNumApplications] = useState(1);
	const [status, setStatus] = useState({ message: "", type: "" });
	const [isGenerating, setIsGenerating] = useState(false);
	const [createdApps, setCreatedApps] = useState([]);

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
			const preferences = await getPreferences(listingId);

			if (preferences.length === 0) {
				showStatus("No preferences found for this listing", "error");
				return;
			}

			showStatus(`Found ${preferences.length} preferences. Generating ${numApplications} application(s)...`, "info");

			let successCount = 0;
			let failCount = 0;

			for (let index = 0; index < numApplications; index += 1) {
				try {
					const result = await submitApplication(listingId, preferences);
					successCount += 1;

					setCreatedApps((previous) => [...previous, result.applicantDetails]);

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
	}, [isGenerating, listingId, numApplications, currentListingId, showStatus]);

	return {
		listingId,
		setListingId,
		numApplications,
		setNumApplications,
		status,
		isGenerating,
		createdApps,
		handleGenerateApplications,
	};
}
