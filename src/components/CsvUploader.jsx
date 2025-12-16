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

            if (listingId && lastName) {
              const key = `${listingId}-${lastName}`;
              if (!groups[key]) {
                groups[key] = {
                  ListingID: listingId,
                  LastName: lastName,
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
                NumApplications: remaining
              });
            }
          });

          if (resumeData.length > 0) {
            console.log("Resuming generation:", resumeData);
            onUpload(resumeData, existingApps);
          } else {
            setError("All applications in this export file have already been generated.");
          }
          return;
        }

        // Standard CSV parsing
        const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes("last name") || h.toLowerCase() === "lastname");
        const emailIndex = headers.findIndex(h => h.toLowerCase().includes("email"));
        const listingIdIndex = headers.findIndex(h => h.toLowerCase().includes("listing id") || h.toLowerCase() === "listingid");
        const numAppsIndex = headers.findIndex(h => h.toLowerCase().includes("num applications") || h.toLowerCase().includes("numapplications"));

        if (emailIndex === -1 || listingIdIndex === -1 || numAppsIndex === -1) {
          console.error("Missing headers:", { lastNameIndex, emailIndex, listingIdIndex, numAppsIndex, headers });
          setError("Invalid CSV format. Expected headers: Email, ListingID, NumApplications (LastName optional)");
          return;
        }

        const parsedData = [];
        for (let i = 1; i < lines.length; i++) {
          const currentLine = lines[i].trim();
          if (!currentLine) continue;

          const values = currentLine.split(",");
          const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : "";
          const row = {
            Email: values[emailIndex]?.trim(),
            ListingID: values[listingIdIndex]?.trim(),
            NumApplications: values[numAppsIndex]?.trim()
          };

          // only include LastName if it has a value
          if (lastName) {
            row.LastName = lastName;
          }

          if (row.Email && row.ListingID && row.NumApplications) {
            parsedData.push(row);
          } else {
            console.warn("Skipping invalid row:", row, "Values:", values);
          }
        }

        if (parsedData.length === 0) {
          setError("No valid data found in CSV.");
          return;
        }

        console.log("Parsed CSV Data:", parsedData);
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
            Format: Email, ListingID, NumApplications (LastName optional)
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
