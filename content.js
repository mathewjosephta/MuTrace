console.log("MuTrace Attendance Tracker Started");

const attendance = {};
const GRACE_PERIOD = 20000; // 20 seconds
let meetingStartTime = new Date();

// Initialize and save the global meeting start time for the Dashboard
chrome.storage.local.get(["meetingStart"], (result) => {
    if (!result.meetingStart) {
        // If it's a new meeting, save the start time
        chrome.storage.local.set({ meetingStart: meetingStartTime.getTime() });
    } else {
        // If the page reloaded, resume from the saved start time
        meetingStartTime = new Date(result.meetingStart);
    }
});

function getParticipants() {
  const elements = document.querySelectorAll("[data-participant-id]");
  const participants = [];

  // Expanded blocklist including "person" to filter out UI garbage
  const blockedNames = [
      "frame_person",
      "keep_outline",
      "devices",
      "person",
      "more_vert",
      "Meeting host",
      "Admit",
      "You can't unmute"
  ];

  elements.forEach((el) => {
    // 1. Try to target the specific name element directly
    const nameElement = el.querySelector('.zWGUib');
    
    let name = "";
    if (nameElement) {
        name = nameElement.textContent.trim();
    } else {
        // Fallback just in case Google updates the UI
        name = el.innerText.trim().split("\n")[0];
    }

    if (!name) return;

    // 2. Clean up "(You)" if it exists so the host name is clean
    name = name.replace(/\(You\)/gi, "").trim();

    // 3. Filter out invalid UI text
    const isBlocked = blockedNames.some(blocked => name.includes(blocked) || name === blocked);
    
    if (isBlocked) {
        return; // Skip this element completely
    }

    if (!participants.includes(name)) {
      participants.push(name);
    }
  });

  return participants;
}

setInterval(() => {
  const now = new Date();
  const currentParticipants = getParticipants();

  // Handle joins
  currentParticipants.forEach((name) => {
    if (!attendance[name]) {
      attendance[name] = {
        firstJoin: now,
        lastLeave: null,
        totalDuration: 0,
        lastSeen: now,
        activeSession: {
          joinTime: now,
        },
        sessions: [],
      };
      console.log(`${name} joined`);
    } else {
      attendance[name].lastSeen = now;

      // Rejoin
      if (!attendance[name].activeSession) {
        attendance[name].activeSession = {
          joinTime: now,
        };
        console.log(`${name} rejoined`);
      }
    }

    attendance[name].lastSeen = now;
  });

  // Handle leaves
  Object.keys(attendance).forEach((name) => {
    const user = attendance[name];

    if (user.activeSession && !currentParticipants.includes(name)) {
      const diff = now.getTime() - user.lastSeen.getTime();

      if (diff > GRACE_PERIOD) {
        const leaveTime = user.lastSeen;
        user.activeSession.leaveTime = leaveTime;

        const duration = leaveTime.getTime() - user.activeSession.joinTime.getTime();
        user.totalDuration += duration;
        user.sessions.push(user.activeSession);
        user.activeSession = null;
        user.lastLeave = leaveTime;

        console.log(`${name} left`);
      }
    }
  });

  // Build report
  const report = [];

  Object.keys(attendance).forEach((name) => {
    const user = attendance[name];
    let totalDuration = user.totalDuration;

    // Proper LastLeave formatting for the Dashboard
    let displayLastLeave = "-"; 

    if (user.activeSession) {
      // If they are still in the meeting, add their current active time to the total
      totalDuration += now.getTime() - user.activeSession.joinTime.getTime();
      // displayLastLeave remains "-" because they haven't actually left yet
    } else if (user.lastLeave) {
      // If they are NOT active, show the time they actually left
      displayLastLeave = user.lastLeave.toLocaleTimeString();
    }

    const meetingDuration = now.getTime() - meetingStartTime.getTime();
    const attendancePercentage = meetingDuration > 0
        ? ((totalDuration / meetingDuration) * 100).toFixed(1)
        : 0;

    report.push({
      Name: name,
      FirstJoin: user.firstJoin.toLocaleTimeString(),
      LastLeave: displayLastLeave,
      TotalMinutes: (totalDuration / 60000).toFixed(1),
      AttendancePercent: attendancePercentage + "%",
      Eligible: attendancePercentage >= 50 ? "Yes" : "No",
    });
  });

  console.clear();
  console.table(report);

  // Write directly to Chrome Storage so the dashboard can read it
  chrome.storage.local.set({ attendance: report }, () => {
      // Also send the message just in case popup.js is listening for it
      try {
        chrome.runtime.sendMessage({
          type: "SAVE_ATTENDANCE",
          data: report,
        });
      } catch (error) {
        // Expected behavior if popup is closed
      }
  });

}, 5000);