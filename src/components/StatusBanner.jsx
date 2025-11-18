const STATUS_CLASSES = {
	success: "bg-green-100 text-green-800 border-green-200",
	error: "bg-red-100 text-red-800 border-red-200",
	info: "bg-blue-100 text-blue-800 border-blue-200",
};

export default function StatusBanner({ status }) {
	if (!status.message) {
		return null;
	}

	return (
		<div className={`mt-6 p-4 rounded-lg border ${STATUS_CLASSES[status.type] || STATUS_CLASSES.info}`}>
			{status.message}
		</div>
	);
}
