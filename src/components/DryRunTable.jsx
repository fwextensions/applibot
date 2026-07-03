export default function DryRunTable({ rows }) {
	if (!rows || rows.length === 0) {
		return null;
	}

	return (
		<div className="bg-white rounded-lg shadow-lg p-8">
			<h2 className="text-lg font-semibold text-gray-900 mb-3">
				Dry Run Preview ({rows.length} application{rows.length === 1 ? "" : "s"})
			</h2>
			<div className="overflow-x-auto border border-gray-200 rounded-lg">
				<table className="min-w-full divide-y divide-gray-200 text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-3 py-2 text-left font-semibold text-gray-700">First Name</th>
							<th className="px-3 py-2 text-left font-semibold text-gray-700">Last Name</th>
							<th className="px-3 py-2 text-left font-semibold text-gray-700">Email</th>
							<th className="px-3 py-2 text-left font-semibold text-gray-700">DOB</th>
							<th className="px-3 py-2 text-left font-semibold text-gray-700">Listing ID</th>
							<th className="px-3 py-2 text-left font-semibold text-gray-700">Claimed Preferences</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-100">
						{rows.map((row, index) => (
							<tr key={`${row.email}-${index}`} className="hover:bg-gray-50">
								<td className="px-3 py-2 text-gray-900">{row.firstName}</td>
								<td className="px-3 py-2 text-gray-900">{row.lastName}</td>
								<td className="px-3 py-2 text-gray-900">{row.email}</td>
								<td className="px-3 py-2 text-gray-900">{row.dob}</td>
								<td className="px-3 py-2 text-gray-900">{row.listingId}</td>
								<td className="px-3 py-2 text-gray-900">{row.claimedPreferences}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
