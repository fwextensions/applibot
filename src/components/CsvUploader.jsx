import { useState, useCallback } from "react";

export default function CsvUploader({ onUpload, isProcessing }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = useCallback((file) => {
    if (!file) return;

    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const rows = text.split("\n").map(row => row.trim()).filter(row => row);
        if (rows.length === 0) {
          setError("The CSV file is empty.");
          return;
        }

        // Simple CSV parsing (assumes no commas in fields for now, or we can use a library if needed)
        // Expected format: LastName, Email, ListingID, NumApplications
        const parsedData = rows.map((row, index) => {
          // Skip header if it looks like a header
          if (index === 0 && row.toLowerCase().includes("lastname")) return null;
          
          const cols = row.split(",").map(c => c.trim());
          if (cols.length < 4) return null;

          return {
            lastName: cols[0],
            email: cols[1],
            listingId: cols[2],
            numApplications: parseInt(cols[3], 10) || 1
          };
        }).filter(item => item !== null);

        if (parsedData.length === 0) {
          setError("No valid data found in CSV.");
          return;
        }

        setError("");
        onUpload(parsedData);
      } catch (err) {
        setError("Error parsing CSV file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  }, [onUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  }, [processFile]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    processFile(file);
  }, [processFile]);

  return (
    <div className="mb-8">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}
      >
        <div className="space-y-2">
          <p className="text-gray-600">
            Drag and drop a CSV file here, or{" "}
            <label className="text-blue-600 hover:text-blue-800 cursor-pointer font-medium">
              browse
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
                disabled={isProcessing}
              />
            </label>
          </p>
          <p className="text-xs text-gray-500">
            Format: LastName, Email, ListingID, NumApplications
          </p>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
