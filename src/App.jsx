import CsvUploader from "./components/CsvUploader";
import CreatedApplicationsList from "./components/CreatedApplicationsList";
import ListingForm from "./components/ListingForm";
import ListingPicker from "./components/ListingPicker";
import ServerSelector from "./components/ServerSelector";
import StatusBanner from "./components/StatusBanner";
import useApplicationGenerator from "./hooks/useApplicationGenerator";

export default function App() {
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

        <CsvUploader onUpload={processCsvData} isProcessing={isGenerating} />

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or generate manually</span>
          </div>
        </div>

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
        />

        <StatusBanner status={status} />

        <CreatedApplicationsList createdApps={createdApps} />
      </section>
    </main>
  );
}
