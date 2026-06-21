// Load the existing session name when the popup is opened
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get(["sessionName"], (result) => {
        if (result.sessionName) {
            document.getElementById("sessionName").value = result.sessionName;
        }
    });
});

// Save Session Name Functionality
document.getElementById("saveSession").addEventListener("click", () => {
    const sessionNameInput = document.getElementById("sessionName").value;
    
    chrome.storage.local.set({ sessionName: sessionNameInput }, () => {
        // Visual feedback for the user
        const saveBtn = document.getElementById("saveSession");
        const originalText = saveBtn.innerText;
        
        saveBtn.innerText = "Saved!";
        
        setTimeout(() => {
            saveBtn.innerText = originalText;
        }, 1500); // Changes back after 1.5 seconds
    });
});

// Open Dashboard Functionality
document.getElementById("dashboardBtn").addEventListener("click", () => {
    chrome.tabs.create({
        url: chrome.runtime.getURL("dashboard.html")
    });
});

// --- NOTE ---
// If you already have existing logic in your popup.js for the 
// "Export CSV" button (id="exportBtn") or the participant count (id="count"),
// make sure to leave those parts intact at the bottom of this file!