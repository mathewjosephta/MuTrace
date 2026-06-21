// Global Variables
let attendanceData = [];
let attendanceChart;
let meetingStart = null;
let currentHosts = [];

// 1. Load Metadata (Name, Hosts, Start Time) from Chrome Storage
function loadMetadata() {
    chrome.storage.local.get(["sessionName", "hosts", "meetingStart"], result => {
        
        // Session Title
        const titleEl = document.getElementById("sessionName");
        if (titleEl) {
            titleEl.innerText = result.sessionName || "Untitled Session";
        }

        // Host Display
        currentHosts = result.hosts || [];
        const hostEl = document.getElementById("sessionHosts");
        if (hostEl) {
            hostEl.innerText = currentHosts.length > 0 ? currentHosts.join(", ") : "None Selected";
        }

        // True Timer Start Time (Saved by content.js)
        if (result.meetingStart) {
            meetingStart = result.meetingStart;
        }
    });
}

// 2. Real Meeting Timer Logic
function updateTimer() {
    const timerElement = document.getElementById("sessionTimer");
    if (!timerElement) return;

    if (!meetingStart) {
        timerElement.innerText = "00:00:00";
        return; 
    }

    const elapsed = Date.now() - meetingStart;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);

    timerElement.innerText =
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

setInterval(updateTimer, 1000);

// Helper function for formatting time
function formatDuration(minutes) {
    minutes = parseFloat(minutes) || 0; 
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
}

// Render Main Table
function renderTable(data) {
    const table = document.getElementById("attendanceTable");
    if (!table) return;
    table.innerHTML = "";

    data.forEach(user => {
        const attendanceStr = user.AttendancePercent ? user.AttendancePercent.toString().replace("%", "") : "0";
        const attendance = parseFloat(attendanceStr);
        const status = user.LastLeave === "-" ? "Online" : "Offline";

        const row = `
        <tr>
            <td><strong>${user.Name}</strong></td>
            <td>${user.FirstJoin}</td>
            <td>${user.LastLeave}</td>
            <td>${formatDuration(user.TotalMinutes)}</td>
            <td>
                <div style="display:flex;align-items:center;gap:10px">
                    <div class="progress">
                        <div class="progress-fill" style="width:${attendance}%"></div>
                    </div>
                    <span>${attendance}%</span>
                </div>
            </td>
            <td>
                <span class="badge ${status === "Online" ? "badge-online" : "badge-offline"}">
                    ${status}
                </span>
            </td>
            <td>
                <span class="badge ${user.Eligible === "Yes" ? "badge-eligible" : "badge-noteligible"}">
                    ${user.Eligible}
                </span>
            </td>
        </tr>
        `;
        table.innerHTML += row;
    });
}

// Stats Updates
function updateStats(data) {
    const totalParticipants = data.length;
    const eligibleParticipants = data.filter(user => user.Eligible === "Yes").length;
    const currentlyPresent = data.filter(user => user.LastLeave === "-").length;

    const avgAttendance = data.length
        ? (data.reduce((sum, user) => {
                const pct = user.AttendancePercent ? parseFloat(user.AttendancePercent.toString().replace("%", "")) : 0;
                return sum + pct;
            }, 0) / data.length).toFixed(1)
        : 0;

    if (document.getElementById("totalParticipants")) document.getElementById("totalParticipants").innerText = totalParticipants;
    if (document.getElementById("currentlyPresent")) document.getElementById("currentlyPresent").innerText = currentlyPresent;
    if (document.getElementById("eligibleParticipants")) document.getElementById("eligibleParticipants").innerText = eligibleParticipants;
    if (document.getElementById("avgAttendance")) document.getElementById("avgAttendance").innerText = avgAttendance + "%";
}

// Insights Panel
function updateInsights(data) {
    if (document.getElementById("peakParticipants")) document.getElementById("peakParticipants").innerText = data.length;

    let totalMinutes = 0;
    let mostActive = "-";
    let maxMinutes = 0;

    data.forEach(user => {
        const minutes = parseFloat(user.TotalMinutes) || 0;
        totalMinutes += minutes;
        if (minutes > maxMinutes) {
            maxMinutes = minutes;
            mostActive = user.Name;
        }
    });

    if (document.getElementById("attendanceHours")) document.getElementById("attendanceHours").innerText = (totalMinutes / 60).toFixed(1) + "h";
    if (document.getElementById("mostActive")) document.getElementById("mostActive").innerText = mostActive;
    if (document.getElementById("avgDuration")) document.getElementById("avgDuration").innerText = formatDuration(totalMinutes / (data.length || 1));
}

// Leaderboard Function
function renderLeaderboard(data) {
    const leaderboard = document.getElementById("leaderboard");
    if (!leaderboard) return; 
    leaderboard.innerHTML = "";

    const sorted = [...data]
        .filter(u => !isNaN(parseFloat(u.TotalMinutes)))
        .sort((a, b) => parseFloat(b.TotalMinutes) - parseFloat(a.TotalMinutes))
        .slice(0, 10);

    if (sorted.length === 0) {
        leaderboard.innerHTML = "<div style='color: #6b7280; text-align: center; padding: 10px;'>No data yet</div>";
        return;
    }

    sorted.forEach((user, index) => {
        leaderboard.innerHTML += `
        <div class="leaderboard-item" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span class="rank" style="font-weight: bold; width: 30px;">#${index + 1}</span>
            <span class="lb-name" style="flex-grow: 1;">${user.Name}</span>
            <span class="lb-time" style="font-weight: bold;">${formatDuration(user.TotalMinutes)}</span>
        </div>
        `;
    });
}

// Render Charts
function renderCharts(data) {
    const chartElement = document.getElementById("attendanceChart");
    if (!chartElement) return;

    if (attendanceChart) attendanceChart.destroy();

    attendanceChart = new Chart(chartElement, {
        type: "bar",
        data: {
            labels: data.map(user => user.Name),
            datasets: [{
                label: "Attendance %",
                data: data.map(user => user.AttendancePercent ? parseFloat(user.AttendancePercent.toString().replace("%", "")) : 0),
                backgroundColor: "#93c5fd"
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// Main Loader
function loadAttendance() {
    loadMetadata();

    chrome.storage.local.get(["attendance", "hosts"], result => {
        const rawData = result.attendance || [];
        const savedHosts = result.hosts || [];
        
        // Exclude hosts from all dashboard data
        attendanceData = rawData.filter(user => !savedHosts.includes(user.Name));

        renderTable(attendanceData);
        updateStats(attendanceData);
        updateInsights(attendanceData);
        renderCharts(attendanceData);
        renderLeaderboard(attendanceData);
    });
}

// Initialize and set interval
loadAttendance();
setInterval(loadAttendance, 5000);

// Event Listeners for Search & Filter
const searchInput = document.getElementById("searchInput");
if (searchInput) {
    searchInput.addEventListener("input", e => {
        const search = e.target.value.toLowerCase();
        const filtered = attendanceData.filter(user => user.Name.toLowerCase().includes(search));
        renderTable(filtered);
    });
}

const filterSelect = document.getElementById("filterSelect");
if (filterSelect) {
    filterSelect.addEventListener("change", e => {
        const value = e.target.value;
        let filtered = attendanceData;
        if (value === "eligible") filtered = attendanceData.filter(user => user.Eligible === "Yes");
        if (value === "notEligible") filtered = attendanceData.filter(user => user.Eligible === "No");
        renderTable(filtered);
    });
}

// Exports (Also inherit the filtered attendanceData without hosts)
function triggerDownload(data, filenameSuffix) {
    const titleEl = document.getElementById("sessionName");
    const sessionName = titleEl ? titleEl.innerText : "Untitled Session";
    let csv = `${sessionName}\n\nName,First Join,Last Leave,Total Minutes,Attendance %,Eligible\n`;

    data.forEach(user => {
        csv += `${user.Name},${user.FirstJoin},${user.LastLeave},${user.TotalMinutes},${user.AttendancePercent},${user.Eligible}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    chrome.downloads.download({ url, filename: `MuTrace_${filenameSuffix}.csv` });
}

const exportBtn = document.getElementById("exportBtn");
if (exportBtn) exportBtn.addEventListener("click", () => triggerDownload(attendanceData, "Attendance"));

const exportEligibleBtn = document.getElementById("exportEligibleBtn");
if (exportEligibleBtn) exportEligibleBtn.addEventListener("click", () => triggerDownload(attendanceData.filter(u => u.Eligible === "Yes"), "Eligible"));