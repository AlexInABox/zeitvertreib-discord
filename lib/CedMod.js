import util from 'util';
import request from 'request';

const requestPromise = util.promisify(request);

async function requestData(instanceId) {
    
    const options = {
        'method': 'GET',
        'url': `https://queryws.cedmod.nl/Api/Realtime/QueryServers/GetPopulation?instanceId=${instanceId}`,
        'headers': {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    };

    const rawResponse = await requestPromise(options);
    if (!rawResponse.body || rawResponse.body.length < 2)
        return {
            success: false,
            errorMsg: "CedMod unavailable!"
        };

    let response;

    try {
        response = JSON.parse(rawResponse.body);
    } catch (e) {
        return {
            success: false,
            errorMsg: "Failed retrieving playerlist!"
        };
    }
    if (!response || !response[0])
        return {
            success: false,
            errorMsg: "Server unavailable!"
        };

    return {
        success: true,
        playerCount: response[0].playerCount,
        players: response[0].userIds,
    };
}


export default { requestData };