
import request from 'request';


let onChangeListeners = [];
let intervalObject;

const onUpdate = (callback) => {
    onChangeListeners.push(callback);
}

const startGettingInfo = (serverId) => {
    const updateFunc = () => {
        getRequestPromise(serverId).then((json) => {
            for (const listener of onChangeListeners)
                listener(json);
        }).catch(console.error);
    };
    intervalObject = setInterval(updateFunc, 60 * 1_000);
    updateFunc();
}

const stopGettingInfo = () => {
    clearInterval(intervalObject);
}

const getRequestPromise = (serverId) => {
    return new Promise((res, rej) => {
        const options = {
            method: 'GET',
            url: `https://api.scplist.kr/api/servers/${serverId}`,
            headers: { 'Accept': 'application/json' }
        };

        request(options, (error, response, body) => {
            if (error) rej(error);
            try {
                const json = JSON.parse(body);
                res(json);
            } catch (error) {
                rej(error);
            }
        });
    })
}

export default { stopGettingInfo, startGettingInfo, onUpdate, getRequestPromise };