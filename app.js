let isGenerating = false;

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

function showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = type;
    statusDiv.style.display = 'block';
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
    try {
        const response = await fetch(`http://localhost:3000/api/v1/listings/${listingId}/preferences`);
        if (!response.ok) {
            throw new Error(`Failed to fetch preferences: ${response.status}`);
        }
        const data = await response.json();
        return data.preferences.map(p => ({
            listingPreferenceID: p.listingPreferenceID,
            preferenceName: p.preferenceName,
            devName: getDevNameFromPreferenceName(p.preferenceName)
        }));
    } catch (error) {
        throw new Error(`Error fetching preferences: ${error.message}`);
    }
}

async function submitApplication(listingId, preferences) {
    const sessionId1 = generateSessionId();
    const sessionId2 = generateSessionId();
    const externalSessionId = `${sessionId1}-${sessionId2}`;
    const email = generateEmail();
    
    const payload = {
        locale: "en",
        uploaded_file: {
            session_uid: externalSessionId
        },
        application: {
            id: null,
            applicationLanguage: "English",
            applicationSubmittedDate: new Date().toISOString().split('T')[0],
            applicationSubmissionType: "Electronic",
            status: "submitted",
            answeredCommunityScreening: null,
            externalSessionId: externalSessionId,
            listingID: listingId,
            primaryApplicant: {
                email: email,
                firstName: "Test",
                middleName: new Date().toISOString(),
                lastName: "User",
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
                
                // Add individualPreference and optOut for Live/Work preferences
                if (pref.devName === "L_W" || pref.devName === "V-L_W") {
                    preference.individualPreference = "Live in SF";
                    preference.optOut = true;
                }
                
                return preference;
            })
        }
    };

    const response = await fetch('http://localhost:3000/api/v1/short-form/application', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
}

async function generateApplications() {
    if (isGenerating) return;
    
    const listingId = document.getElementById('listingId').value.trim();
    const numApplications = parseInt(document.getElementById('numApplications').value);
    
    if (!listingId) {
        showStatus('Please enter a listing ID', 'error');
        return;
    }
    
    if (!numApplications || numApplications < 1) {
        showStatus('Please enter a valid number of applications', 'error');
        return;
    }
    
    isGenerating = true;
    const btn = document.getElementById('generateBtn');
    btn.disabled = true;
    
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
                await submitApplication(listingId, preferences);
                successCount++;
                showStatus(`Progress: ${i + 1}/${numApplications} - Success: ${successCount}, Failed: ${failCount}`, 'info');
                
                // Small delay to avoid overwhelming the server
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
        isGenerating = false;
        btn.disabled = false;
    }
}
