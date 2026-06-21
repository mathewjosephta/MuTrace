chrome.storage.local.get(
    ["attendance"],
    (result) => {

        const count =
            result.attendance
            ? result.attendance.length
            : 0;

        document.getElementById("count")
            .innerText =
            `Participants: ${count}`;
    }
);

document
.getElementById("exportBtn")
.addEventListener("click", () => {

    chrome.storage.local.get(
        ["attendance"],
        (result) => {

            const data =
                result.attendance || [];

            let csv =
                "Name,First Join,Last Leave,Total Minutes\n";

            data.forEach(user => {

                csv +=
                    `${user.Name},${user.FirstJoin},${user.LastLeave},${user.TotalMinutes}\n`;

            });

            const blob =
                new Blob(
                    [csv],
                    { type: "text/csv" }
                );

            const url =
                URL.createObjectURL(blob);

            chrome.downloads.download({
                url,
                filename:
                `MuTrace_Attendance.csv`
            });

        }
    );

});