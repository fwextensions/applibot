import { useState } from 'react';
import { faker } from '@faker-js/faker';

const PREFERENCE_NAME_MAP = {
  "Veteran with Certificate of Preference (V-COP)": "V-COP",
  "Certificate of Preference (COP)": "COP",
  "Veteran with Displaced Tenant Housing Preference (V-DTHP)": "V-DTHP",
  "Displaced Tenant Housing Preference (DTHP)": "DTHP",
  "Veteran with Neighborhood Resident Housing Preference (V-NRHP)": "V-NRHP",
  "Neighborhood Resident Housing Preference (NRHP)": "NRHP",
  "Veteran with Live or Work in San Francisco Preference (V-L_W)": "V-L_W",
  "Live or Work in San Francisco Preference": "L_W"
};

function getDevNameFromPreferenceName(preferenceName) {
  return PREFERENCE_NAME_MAP[preferenceName] || "L_W";
}

function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateEmail() {
  return `dahlia.internal+${Date.now()}@gmail.com`;
}

async function getPreferences(listingId) {
  const response = await fetch(`/api/v1/listings/${listingId}/preferences`);
  if (!response.ok) {
    throw new Error(`Failed to fetch preferences: ${response.status}`);
  }
  const data = await response.json();
  return data.preferences.map(p => ({
    listingPreferenceID: p.listingPreferenceID,
    preferenceName: p.preferenceName,
    devName: getDevNameFromPreferenceName(p.preferenceName)
  }));
}

async function submitApplication(listingId, preferences) {
  const sessionId1 = generateSessionId();
  const sessionId2 = generateSessionId();
  const externalSessionId = `${sessionId1}-${sessionId2}`;
  const email = generateEmail();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const payload = {
    locale: "en",
    uploaded_file: {
      session_uid: externalSessionId
    },
    application: {
      id: null,
      applicationLanguage: "English",
      applicationSubmittedDate: new Date().toISOString().split("T")[0],
      applicationSubmissionType: "Electronic",
      status: "submitted",
      answeredCommunityScreening: null,
      externalSessionId: externalSessionId,
      listingID: listingId,
      primaryApplicant: {
        email: email,
        firstName: firstName,
        middleName: new Date().toISOString(),
        lastName: lastName,
        noPhone: true,
        phone: null,
        phoneType: null,
        preferenceAddressMatch: "",
        dob: "1990-01-01",
        workInSf: false,
        xCoordinate: -13627616.12366289,
        yCoordinate: 4547681.551093868,
        whichComponentOfLocatorWasUsed: "eas_gc",
        candidateScore: 100,
        city: "SAN FRANCISCO",
        state: "CA",
        zip: "94103-1267",
        address: "1 S VAN NESS AVE APT A",
        mailingCity: "SAN FRANCISCO",
        mailingState: "CA",
        mailingZip: "94103-1267",
        mailingAddress: "1 S VAN NESS AVE APT A",
        isSFUSDEmployee: null,
        jobClassification: null
      },
      adaPrioritiesSelected: "None;",
      agreeToTerms: true,
      householdVouchersSubsidies: false,
      monthlyIncome: 4000,
      totalMonthlyRent: 0,
      formMetadata: JSON.stringify({
        completedSections: {
          Intro: true,
          Qualify: false,
          You: true,
          Household: true,
          Income: true,
          Preferences: false
        },
        session_uid: externalSessionId,
        lastPage: "review-terms",
        groupedHouseholdAddresses: []
      }),
      shortFormPreferences: preferences.map(pref => {
        const preference = {
          recordTypeDevName: pref.devName,
          listingPreferenceID: pref.listingPreferenceID
        };

        if (pref.devName === "L_W" || pref.devName === "V-L_W") {
          preference.individualPreference = "Live in SF";
          preference.optOut = true;
        }

        return preference;
      })
    }
  };

  const response = await fetch("/api/v1/short-form/application", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  const result = await response.json();

  return {
    ...result,
    applicantDetails: { firstName, lastName, email, id: result.id }
  };
}

export default function App() {
  const [listingId, setListingId] = useState('a0Wbb000001JZxZEAW');
  const [currentListingId, setCurrentListingId] = useState('a0Wbb000001JZxZEAW');
  const [numApplications, setNumApplications] = useState(1);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [createdApps, setCreatedApps] = useState([]);

  const showStatus = (message, type) => {
    setStatus({ message, type });
  };

  const handleGenerateApplications = async () => {
    if (isGenerating) return;

    if (!listingId.trim()) {
      showStatus('Please enter a listing ID', 'error');
      return;
    }

    if (!numApplications || numApplications < 1) {
      showStatus('Please enter a valid number of applications', 'error');
      return;
    }

    // Reset apps list if listing ID changed
    if (listingId !== currentListingId) {
      setCreatedApps([]);
      setCurrentListingId(listingId);
    }

    setIsGenerating(true);

    try {
      showStatus('Fetching preferences...', 'info');
      const preferences = await getPreferences(listingId);

      if (preferences.length === 0) {
        showStatus('No preferences found for this listing', 'error');
        return;
      }

      showStatus(`Found ${preferences.length} preferences. Generating ${numApplications} application(s)...`, 'info');

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < numApplications; i++) {
        try {
          const result = await submitApplication(listingId, preferences);
          successCount++;

          // Add to created apps list
          setCreatedApps(prev => [...prev, result.applicantDetails]);

          showStatus(`Progress: ${i + 1}/${numApplications} - Success: ${successCount}, Failed: ${failCount}`, 'info');

          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          failCount++;
          console.error(`Application ${i + 1} failed:`, error);
          showStatus(`Progress: ${i + 1}/${numApplications} - Success: ${successCount}, Failed: ${failCount}`, 'info');
        }
      }

      if (failCount === 0) {
        showStatus(`✓ Successfully generated ${successCount} application(s)!`, 'success');
      } else {
        showStatus(`Completed: ${successCount} successful, ${failCount} failed`, successCount > 0 ? 'info' : 'error');
      }

    } catch (error) {
      showStatus(`Error: ${error.message}`, 'error');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const statusClasses = {
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            DAHLIA Application Generator
          </h1>

          <div className="space-y-6">
            <div>
              <label htmlFor="listingId" className="block text-sm font-semibold text-gray-700 mb-2">
                Listing ID
              </label>
              <input
                type="text"
                id="listingId"
                value={listingId}
                onChange={(e) => setListingId(e.target.value)}
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
                onChange={(e) => setNumApplications(parseInt(e.target.value))}
                min="1"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              />
            </div>

            <button
              onClick={handleGenerateApplications}
              disabled={isGenerating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? 'Generating...' : 'Generate Applications'}
            </button>

            {status.message && (
              <div className={`p-4 rounded-lg border ${statusClasses[status.type] || statusClasses.info}`}>
                {status.message}
              </div>
            )}

            {createdApps.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Created Applications ({createdApps.length})
                </h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {createdApps.map((app, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
                      <span className="font-medium text-gray-700">#{index + 1}:</span>{' '}
                      <a
                        href={`https://sfhousing--full.sandbox.lightning.force.com/lightning/r/Application__c/${app.id}/view`}
                        target="_blank"
                        className="mr-1 text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {app.firstName} {app.lastName}
                      </a>
                      <span className="text-gray-500">({app.email})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
