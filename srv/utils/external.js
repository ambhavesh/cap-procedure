const cds = require("@sap/cds");

const calculateDaysDifference = (startDate, endDate) => {
    // Ensure input is a Date object
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Calculate difference in milliseconds
    const differenceInMilliseconds = end - start;

    // Convert milliseconds to days
    const differenceInDays = differenceInMilliseconds / (1000 * 3600 * 24);

    return differenceInDays;
};

const formatDate = async (date) => {
    let currentDate = new Date(date);
    let formattedDate = currentDate.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    return formattedDate;
};

const formatTime = async (inputTime) => {
    let timeParts = inputTime.toLowerCase().split(' ');
    let time = timeParts[0];
    let period = timeParts[1].toUpperCase();
    let [hours, minutes, seconds] = time.split(':');

    hours = parseInt(hours, 10);
    if (hours < 10) {
        hours = `0${hours}`;
    }
    return `${hours}:${minutes}:${seconds} ${period}`;

};


exports.calculateDaysDifference = calculateDaysDifference;
exports.formatDate = formatDate;
exports.formatTime = formatTime;