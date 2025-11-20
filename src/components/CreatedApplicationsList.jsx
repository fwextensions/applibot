export default function CreatedApplicationsList({ createdApps }) {
	if (createdApps.length === 0) {
		return null;
	}

	const handleExportCsv = () => {
		const headers = ["First Name", "Last Name", "Email", "Application ID", "Listing ID", "Salesforce URL", "Response Time (s)", "Target Count"];
		const csvContent = [
			headers.join(","),
			...createdApps.map(app => [
				app.firstName,
				app.lastName,
				app.email,
				app.id,
				app.listingId,
				`https://sfhousing--full.sandbox.lightning.force.com/lightning/r/Application__c/${app.id}/view`,
				app.responseTime.toFixed(2),
				app.targetCount || 1
			].join(","))
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `generated_applications_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	return (
		<div className="mt-6 border-t pt-6">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold text-gray-900">
					Created Applications ({createdApps.length})
				</h2>
				<button
					onClick={handleExportCsv}
					className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors"
				>
					Export CSV
				</button>
			</div>
			<div className="space-y-2 max-h-96 overflow-y-auto">
				{createdApps.map((app, index) => (
					<div key={`${app.id}-${index}`} className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
						<span className="font-medium text-gray-700">#{index + 1}:</span>{" "}
						<a
							href={`https://sfhousing--full.sandbox.lightning.force.com/lightning/r/Application__c/${app.id}/view`}
							target="_blank"
							rel="noreferrer"
							className="mr-1 text-blue-600 hover:text-blue-800 hover:underline"
							title="Open application in Salesforce"
						>
							{app.firstName} {app.lastName}
						</a>
						<span className="text-gray-500">({app.email})</span>
						{app.listingId && <span className="ml-2 text-xs text-gray-400">Listing: {app.listingId}</span>}
						{app.responseTime && <span className="ml-2 text-xs text-gray-500">took {app.responseTime.toFixed(2)}s</span>}
					</div>
				))}
			</div>
		</div>
	);
}
