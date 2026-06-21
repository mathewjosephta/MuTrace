chrome.runtime.onMessage.addListener((message) => {

    if (message.type === "SAVE_ATTENDANCE") {

        chrome.storage.local.set({
            attendance: message.data
        });

    }

});