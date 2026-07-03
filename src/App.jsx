import { useState } from "react";
import CsvUploader from "./components/CsvUploader";
import CreatedApplicationsList from "./components/CreatedApplicationsList";
import DryRunTable from "./components/DryRunTable";
import ListingForm from "./components/ListingForm";
import ListingPicker from "./components/ListingPicker";
import ServerSelector from "./components/ServerSelector";
import StatusBanner from "./components/StatusBanner";
import Tabs from "./components/Tabs";
import useApplicationGenerator from "./hooks/useApplicationGenerator";

const TABS = [
  { id: "csv", label: "Upload CSV" },
  { id: "manual", label: "Manual Entry" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("csv");
  const {
    listingId,
    setListingId,
    numApplications,
    setNumApplications,
    status,
    isGenerating,
    createdApps,
    handleGenerateApplications,
    processCsvData,
    handleExportCsv,
    exportCsvDryRun,
    previewDryRun,
    previewCsvDryRun,
    dryRunRows,
    cancelGeneration,
    server,
    setServer,
    altContactPercent,
    setAltContactPercent,
    noEmailPercent,
    setNoEmailPercent
  } = useApplicationGenerator();

  return (
    <main className="min-h-screen py-12 px-4">
      <section className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 font-mono mb-12">
          🤖 applibot <img src="https://housing.sfgov.org/assets/favicon-96x96-a0efa58fa4aecb817d51b35dad3b9ee0b60dbf4a9c6e63aeade28fcd68279181.png" alt="DAHLIA logo" className="inline-block w-[32px] h-[32px] mt-[-4px]" />
        </h1>

        <ServerSelector
          server={server}
          onServerChange={setServer}
          disabled={isGenerating}
        />

        <Tabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} disabled={isGenerating} />

        {isGenerating && (
          <button
            type="button"
            onClick={cancelGeneration}
            className="w-full mb-6 bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-2 px-6 rounded-lg border border-red-200 transition duration-200 ease-in-out"
          >
            Cancel
          </button>
        )}

        {activeTab === "csv" ? (
          <>
            <ListingPicker
              server={server}
              selectedListingId={listingId}
              onListingChange={setListingId}
              disabled={isGenerating}
              label="Default listing (for rows without one)"
            />

            <CsvUploader
              onGenerate={processCsvData}
              onExportDryRun={exportCsvDryRun}
              onPreviewDryRun={previewCsvDryRun}
              isProcessing={isGenerating}
              defaultListingId={listingId}
              defaultNumApplications={numApplications}
              onDefaultNumApplicationsChange={(event) => setNumApplications(parseInt(event.target.value) || 1)}
            />
          </>
        ) : (
          <>
            <ListingPicker
              server={server}
              selectedListingId={listingId}
              onListingChange={setListingId}
              disabled={isGenerating}
            />

            <ListingForm
              numApplications={numApplications}
              onNumApplicationsChange={(event) => setNumApplications(parseInt(event.target.value))}
              altContactPercent={altContactPercent}
              onAltContactPercentChange={(event) => setAltContactPercent(parseInt(event.target.value) || 0)}
              noEmailPercent={noEmailPercent}
              onNoEmailPercentChange={(event) => setNoEmailPercent(parseInt(event.target.value) || 0)}
              isGenerating={isGenerating}
              onSubmit={handleGenerateApplications}
              onExportCsv={handleExportCsv}
              onPreviewDryRun={previewDryRun}
            />
          </>
        )}

        <StatusBanner status={status} />

        <CreatedApplicationsList createdApps={createdApps} />
      </section>

      <section className="max-w-6xl mx-auto mt-8">
        <DryRunTable rows={dryRunRows} />
      </section>
    </main>
  );
}
