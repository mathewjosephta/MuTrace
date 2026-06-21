let attendanceData = [];

function renderTable(data){

    const table =
        document.getElementById(
            "attendanceTable"
        );

    table.innerHTML = "";

    let eligible = 0;
    let totalAttendance = 0;

    data.forEach(user => {

        if(user.Eligible === "Yes"){
            eligible++;
        }

        totalAttendance +=
            parseFloat(
                user.AttendancePercent
                .replace("%","")
            );

        const row =
        `
        <tr>
            <td>${user.Name}</td>
            <td>${user.FirstJoin}</td>
            <td>${user.LastLeave}</td>
            <td>${user.TotalMinutes}</td>
            <td>${user.AttendancePercent}</td>
            <td class="${
                user.Eligible === "Yes"
                ? "yes"
                : "no"
            }">
                ${user.Eligible}
            </td>
        </tr>
        `;

        table.innerHTML += row;

    });

    document.getElementById(
        "participantsCount"
    ).innerText = data.length;

    document.getElementById(
        "eligibleCount"
    ).innerText = eligible;

    const avg =
        data.length
        ? (
            totalAttendance /
            data.length
          ).toFixed(1)
        : 0;

    document.getElementById(
        "averageAttendance"
    ).innerText =
        avg + "%";
}

function loadAttendance(){

    chrome.storage.local.get(
        ["attendance"],
        result => {

            attendanceData =
                result.attendance || [];

            renderTable(
                attendanceData
            );

        }
    );

}

loadAttendance();

setInterval(
    loadAttendance,
    5000
);

document
.getElementById("searchInput")
.addEventListener(
    "input",
    e => {

        const value =
            e.target.value
            .toLowerCase();

        const filtered =
            attendanceData.filter(
                user =>
                user.Name
                .toLowerCase()
                .includes(value)
            );

        renderTable(filtered);

    }
);

document
.getElementById("exportBtn")
.addEventListener(
    "click",
    () => {

        let csv =
        "Name,First Join,Last Leave,Total Minutes,Attendance %,Eligible\n";

        attendanceData.forEach(
            user => {

            csv +=
            `${user.Name},${user.FirstJoin},${user.LastLeave},${user.TotalMinutes},${user.AttendancePercent},${user.Eligible}\n`;

        });

        const blob =
        new Blob(
            [csv],
            {
                type:"text/csv"
            }
        );

        const url =
            URL.createObjectURL(blob);

        chrome.downloads.download({
            url,
            filename:
            "MuTrace_Attendance.csv"
        });

    }
);