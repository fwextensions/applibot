import { SERVERS } from "../services/applications";

export default function ServerSelector({ server, onServerChange, disabled }) {
	return (
		<div className="mb-6">
			<label className="block text-sm font-medium text-gray-700 mb-2">
				Target Server
			</label>
			<div className="flex gap-2">
				{Object.entries(SERVERS).map(([key, { name }]) => (
					<button
						key={key}
						type="button"
						onClick={() => onServerChange(key)}
						disabled={disabled}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
							server === key
								? key === "prod"
									? "bg-red-600 text-white"
									: "bg-blue-600 text-white"
								: "bg-gray-200 text-gray-700 hover:bg-gray-300"
						} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
					>
						{name}
					</button>
				))}
			</div>
			{server === "prod" && (
				<p className="mt-2 text-sm text-red-600 font-medium">
					⚠️ Production server - applications will be created on the live site
				</p>
			)}
		</div>
	);
}
