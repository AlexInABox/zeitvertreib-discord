
import request from 'request';


let onChangeListeners = [];
let intervalObject;

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
    intervalObject = setInterval(updateFunc, 60 * 1_000);
    updateFunc();
}

const stopGettingInfo = () => {
    clearInterval(intervalObject);
}

export default { stopGettingInfo, startGettingInfo, onUpdate };