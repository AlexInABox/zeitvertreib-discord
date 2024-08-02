import util from 'util';
import request from 'request';

const requestPromise = util.promisify(request);

async function sendPowerEventToServer(signal, BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN) {
    const options = {
        method: 'POST',
        url: `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/power`,
        headers: {
            'Authorization': 'Bearer ' + PANEL_CLIENT_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        form: {
            'signal': signal
        },
        jar: false // Disable cookie jar to prevent saving and sending cookies
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body);
    });
}

async function reinstallServer(BASE_URL, SERVER_APPLICATION_ID, PANEL_APPLICATION_TOKEN) {
    const options = {
        'method': 'POST',
        'url': `${BASE_URL}api/application/servers/${SERVER_APPLICATION_ID}/reinstall`,
        'headers': {
            'Authorization': 'Bearer ' + PANEL_APPLICATION_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    await request(options, function (error, response) {
        if (error) throw new Error(error);
        console.log(response);
    });
}

async function isServerInstalling(BASE_URL, SERVER_CLIENT_ID, PANEL_CLIENT_TOKEN) {
    const options = {
        'method': 'GET',
        'url': `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/`,
        'headers': {
            'Authorization': 'Bearer ' + PANEL_CLIENT_TOKEN,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        jar: false // Disable cookie jar to prevent saving and sending cookies
    };

    try {
        const response = await requestPromise(options);
        const isInstalling = JSON.parse(response.body).attributes.is_installing;
        return isInstalling;
    } catch (error) {
        console.error(error);
        return false;
    }
}

export default { isServerInstalling, reinstallServer, sendPowerEventToServer }