
import request from 'request';


let onChangeListeners = [];
let intervalId = -1;

const onUpdate = (callback) => {
    onChangeListeners.push(callback);
}

const startGettingInfo = (serverId) => {
    const updateFunc = () => {
        const options = {
            method: 'GET',
            url: `https://api.scplist.kr/api/servers/${serverId}`,
            headers: { 'Accept': 'application/json' }
        };

        request(options, (error, response, body) => {
            if (error) return;

            const json = JSON.parse(body);

            for (const listener of onChangeListeners) 
                listener(json);

        });
    };
    intervalId = setInterval(updateFunc, 60 * 1_000);
    updateFunc();
}

const stopGettingInfo = () => {
    if (intervalId < 0) return;

    clearInterval(intervalId);

    intervalId = -1;
}

export default { stopGettingInfo, startGettingInfo, onUpdate };