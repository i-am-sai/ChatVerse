const moment = require('moment'); // momnet library for time

function formatMessage(username, text) {
    return {
        username,
        text,
        time: moment().format('h:mm a') // hours, minutes, am/pm
    };
}

module.exports = formatMessage