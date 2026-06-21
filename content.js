console.log("MuTrace Attendance Tracker Started");

const attendance = {};
const GRACE_PERIOD = 20000; // 20 seconds
const meetingStartTime = new Date();

function getParticipants() {

    const elements = document.querySelectorAll(
        '[data-participant-id]'
    );

    const participants = [];

    elements.forEach(el => {

        const name = el.innerText
            .trim()
            .split("\n")[0];

        if (
            name &&
            !participants.includes(name)
        ) {
            participants.push(name);
        }

    });

    return participants;
}

setInterval(() => {

    const now = new Date();
    const currentParticipants = getParticipants();

    // Handle joins
    currentParticipants.forEach(name => {

        if (!attendance[name]) {

            attendance[name] = {
                firstJoin: now,
                lastLeave: null,
                totalDuration: 0,
                lastSeen: now,
                activeSession: {
                    joinTime: now
                },
                sessions: []
            };

            console.log(`${name} joined`);

        } else {

            attendance[name].lastSeen = now;

            // Rejoin
            if (!attendance[name].activeSession) {

                attendance[name].activeSession = {
                    joinTime: now
                };

                console.log(`${name} rejoined`);
            }
        }

        attendance[name].lastSeen = now;

    });

    // Handle leaves
    Object.keys(attendance).forEach(name => {

        const user = attendance[name];

        if (
            user.activeSession &&
            !currentParticipants.includes(name)
        ) {

            const diff =
                now.getTime() -
                user.lastSeen.getTime();

            if (diff > GRACE_PERIOD) {

                const leaveTime = user.lastSeen;

                user.activeSession.leaveTime =
                    leaveTime;

                const duration =
                    leaveTime.getTime() -
                    user.activeSession.joinTime.getTime();

                user.totalDuration += duration;

                user.sessions.push(
                    user.activeSession
                );

                user.activeSession = null;

                user.lastLeave = leaveTime;

                console.log(`${name} left`);
            }
        }

    });

    // Build report
    const report = [];

    Object.keys(attendance).forEach(name => {

        const user = attendance[name];

        let totalDuration =
            user.totalDuration;

        let lastLeave =
            user.lastLeave;

        if (user.activeSession) {

            totalDuration +=
                now.getTime() -
                user.activeSession.joinTime.getTime();

            lastLeave = now;
        }

        const meetingDuration =
            now.getTime() -
            meetingStartTime.getTime();

        const attendancePercentage =
            meetingDuration > 0
                ? (
                    (totalDuration /
                        meetingDuration) *
                    100
                ).toFixed(1)
                : 0;

        report.push({
            Name: name,
            FirstJoin:
                user.firstJoin.toLocaleTimeString(),

            LastLeave:
                lastLeave
                    ? lastLeave.toLocaleTimeString()
                    : "-",

            TotalMinutes:
                (
                    totalDuration /
                    60000
                ).toFixed(1),

            AttendancePercent:
                attendancePercentage + "%",

            Eligible:
                attendancePercentage >= 80
                    ? "Yes"
                    : "No"
        });

    });

    console.clear();

    console.table(report);

    chrome.runtime.sendMessage({
        type: "SAVE_ATTENDANCE",
        data: report
    });

}, 5000);