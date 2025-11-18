import CreatedApplicationsList from "./components/CreatedApplicationsList";
import ListingForm from "./components/ListingForm";
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
    handleGenerateApplications
  } = useApplicationGenerator("a0Wbb000001JZxZEAW");

  return (
    <main className="min-h-screen py-12 px-4">
      <section className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          DAHLIA Application Generator
        </h1>

        <ListingForm
          listingId={listingId}
          onListingIdChange={(event) => setListingId(event.target.value)}
          numApplications={numApplications}
          onNumApplicationsChange={(event) => setNumApplications(parseInt(event.target.value))}
          isGenerating={isGenerating}
          onSubmit={handleGenerateApplications}
        />

        <StatusBanner status={status} />

        <CreatedApplicationsList createdApps={createdApps} />
      </section>
    </main>
  );
}
