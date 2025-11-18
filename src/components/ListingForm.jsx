export default function ListingForm({
	listingId,
	onListingIdChange,
	numApplications,
	onNumApplicationsChange,
	isGenerating,
	onSubmit,
}) {
	return (
		<div className="space-y-6">
			<div>
				<label htmlFor="listingId" className="block text-sm font-semibold text-gray-700 mb-2">
					Listing ID
				</label>
				<input
					type="text"
					id="listingId"
					value={listingId}
					onChange={onListingIdChange}
					placeholder="e.g., a0Wbb000001JZxZEAW"
					className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
				/>
			</div>

			<div>
				<label htmlFor="numApplications" className="block text-sm font-semibold text-gray-700 mb-2">
					Number of Applications
				</label>
				<input
					type="number"
					id="numApplications"
					value={numApplications}
					onChange={onNumApplicationsChange}
					min="1"
					max="100"
					className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
				/>
			</div>

			<button
				onClick={onSubmit}
				disabled={isGenerating}
				className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
			>
				{isGenerating ? "Generating..." : "Generate Applications"}
			</button>
		</div>
	);
}
