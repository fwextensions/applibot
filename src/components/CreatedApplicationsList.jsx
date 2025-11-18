export default function CreatedApplicationsList({ createdApps }) {
	if (createdApps.length === 0) {
		return null;
	}

	return (
		<div className="mt-6 border-t pt-6">
			<h2 className="text-xl font-semibold text-gray-900 mb-4">
				Created Applications ({createdApps.length})
			</h2>
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
					</div>
				))}
			</div>
		</div>
	);
}
