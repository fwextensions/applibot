import { useState, useCallback, useMemo } from "react";

export default function CsvUploader({
  onGenerate,
  onExportDryRun,
  onPreviewDryRun,
  isProcessing,
  defaultListingId = "",
  defaultNumApplications = 1,
  onDefaultNumApplicationsChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [existingApps, setExistingApps] = useState([]);

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
        const lines = text.split("\n").map(row => row.trim()).filter(row => row);
        if (lines.length === 0) {
          setError("The CSV file is empty.");
          return;
        }

        const headers = lines[0].split(",").map(h => h.trim());

        // Check if this is a resume file (has Target Count)
        const isResumeFile = headers.includes("Target Count") && headers.includes("Listing ID");

        if (isResumeFile) {
          const listingIdIndex = headers.indexOf("Listing ID");
          const emailIndex = headers.indexOf("Email");
          const lastNameIndex = headers.indexOf("Last Name");
          const firstNameIndex = headers.indexOf("First Name");
          const targetCountIndex = headers.indexOf("Target Count");
          const appIdIndex = headers.findIndex(h => h.toLowerCase().includes("application id"));
          const responseTimeIndex = headers.findIndex(h => h.toLowerCase().includes("response time"));
          const preferenceIndex = headers.findIndex(h => h.toLowerCase().includes("preference") && !h.toLowerCase().includes("claimed"));

          const groups = {};
          const existingApps = [];

          for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i].trim();
            if (!currentLine) continue;

            const values = currentLine.split(",");
            const listingId = values[listingIdIndex]?.trim();
            const email = values[emailIndex]?.trim();
            const lastName = values[lastNameIndex]?.trim();
            const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : "";
            const targetCount = parseInt(values[targetCountIndex]?.trim(), 10) || 0;
            const appId = appIdIndex !== -1 ? values[appIdIndex]?.trim() : "";
            const responseTime = responseTimeIndex !== -1 ? parseFloat(values[responseTimeIndex]?.trim()) : 0;
            const preference = preferenceIndex !== -1 ? values[preferenceIndex]?.trim() : "";

            if (listingId && lastName) {
              const key = `${listingId}-${lastName}-${preference}`;
              if (!groups[key]) {
                groups[key] = {
                  ListingID: listingId,
                  LastName: lastName,
                  Preference: preference,
                  TargetCount: targetCount,
                  CompletedCount: 0,
                  Rows: []
                };
              }
              groups[key].CompletedCount++;
              groups[key].Rows.push({ email, firstName });

              if (appId) {
                existingApps.push({
                  firstName,
                  lastName,
                  email,
                  id: appId,
                  listingId,
                  responseTime,
                  targetCount
                });
              }
            }
          }

          const resumeData = [];
          Object.values(groups).forEach(group => {
            const remaining = group.TargetCount - group.CompletedCount;
            if (remaining > 0) {
              // Try to find base email
              let baseEmail = group.Rows[0].email;
              for (const row of group.Rows) {
                if (row.firstName && row.email.toLowerCase().includes(`+${row.firstName.toLowerCase()}`)) {
                  // Found an alias, try to strip it
                  const parts = row.email.split("@");
                  if (parts.length === 2) {
                    const localPart = parts[0];
                    const aliasIndex = localPart.toLowerCase().lastIndexOf(`+${row.firstName.toLowerCase()}`);
                    if (aliasIndex !== -1) {
                      baseEmail = `${localPart.substring(0, aliasIndex)}@${parts[1]}`;
                      break;
                    }
                  }
                }
              }

              resumeData.push({
                ListingID: group.ListingID,
                Email: baseEmail,
                LastName: group.LastName,
                Preference: group.Preference,
                NumApplications: remaining
              });
            }
          });

          if (resumeData.length > 0) {
            console.log("Resuming generation:", resumeData);
            setError("");
            setFileName(file.name);
            setExistingApps(existingApps);
            setRawRows(resumeData);
          } else {
            setError("All applications in this export file have already been generated.");
          }
          return;
        }

        // Standard CSV parsing
        const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes("first name") || h.toLowerCase() === "firstname");
        const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes("last name") || h.toLowerCase() === "lastname");
        const emailIndex = headers.findIndex(h => h.toLowerCase().includes("email"));
        const listingIdIndex = headers.findIndex(h => h.toLowerCase().includes("listing id") || h.toLowerCase() === "listingid");
        const numAppsIndex = headers.findIndex(h => h.toLowerCase().includes("num applications") || h.toLowerCase().includes("numapplications"));
        const preferenceIndex = headers.findIndex(h => h.toLowerCase().includes("preference"));

        const parsedData = [];
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].trim();
          if (!currentLine) continue;

          const values = currentLine.split(",");
          const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : "";
          const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : "";
          const email = emailIndex !== -1 ? values[emailIndex]?.trim() : "";
          const listingId = listingIdIndex !== -1 ? values[listingIdIndex]?.trim() : "";
          const numApplications = numAppsIndex !== -1 ? values[numAppsIndex]?.trim() : "";
          const row = {
            ListingID: listingId,
            NumApplications: numApplications
          };

          // only include Email if it has a value; omitting it lets the backend auto-generate one
          if (email) {
            row.Email = email;
          }

          // only include FirstName if it has a value
          if (firstName) {
            row.FirstName = firstName;
          }

          // only include LastName if it has a value
          if (lastName) {
            row.LastName = lastName;
          }

          // only include Preference if the column is present; missing column preserves random selection
          if (preferenceIndex !== -1) {
            row.Preference = values[preferenceIndex]?.trim() || "None";
          }

          parsedData.push(row);
        }

        if (parsedData.length === 0) {
          setError("No valid data found in CSV.");
          return;
        }

        console.log("Parsed CSV Data:", parsedData);
        setError("");
        setFileName(file.name);
        setExistingApps([]);
        setRawRows(parsedData);
      } catch (err) {
        setError("Error parsing CSV file.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  }, []);

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

  const resolvedRows = useMemo(() => rawRows.map(row => ({
    ...row,
    ListingID: row.ListingID || defaultListingId,
    NumApplications: row.NumApplications || defaultNumApplications,
  })), [rawRows, defaultListingId, defaultNumApplications]);

  const missingListingCount = resolvedRows.filter(row => !row.ListingID).length;
  const isReady = resolvedRows.length > 0 && missingListingCount === 0;

  const handleClear = useCallback(() => {
    setFileName("");
    setRawRows([]);
    setExistingApps([]);
    setError("");
  }, []);

  return (
    <div className="mb-8">
      <div className="mb-4">
        <label htmlFor="csv-default-count" className="block text-sm font-semibold text-gray-700 mb-2">
          Default count (for rows without one)
        </label>
        <input
          type="number"
          id="csv-default-count"
          value={defaultNumApplications}
          onChange={onDefaultNumApplicationsChange}
          min="1"
          max="100"
          disabled={isProcessing}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:opacity-50"
        />
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
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
            Format: NumApplications, Email, ListingID, LastName, Preference all optional
          </p>
        </div>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {fileName && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Loaded {resolvedRows.length} row{resolvedRows.length === 1 ? "" : "s"} from <span className="font-medium">{fileName}</span>
            </span>
            <button
              type="button"
              onClick={handleClear}
              disabled={isProcessing}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              Clear
            </button>
          </div>

          {missingListingCount > 0 && (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              {missingListingCount} row{missingListingCount === 1 ? "" : "s"} missing a ListingID. Select a default listing above to enable generation.
            </p>
          )}

          <button
            onClick={() => onGenerate(resolvedRows, existingApps)}
            disabled={!isReady || isProcessing}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isProcessing ? "Generating..." : "Generate Applications"}
          </button>
          <button
            onClick={() => onExportDryRun(resolvedRows)}
            disabled={!isReady || isProcessing}
            className="w-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out"
          >
            Save as CSV (dry run)
          </button>
          <button
            onClick={() => onPreviewDryRun(resolvedRows)}
            disabled={!isReady || isProcessing}
            className="w-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out"
          >
            Dry Run (preview)
          </button>
        </div>
      )}
    </div>
  );
}
