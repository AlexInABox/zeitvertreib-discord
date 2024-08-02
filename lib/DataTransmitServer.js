import express from "express";

let dataTransmitServerData = {
    listeners: {},
    app: express(),
    isActive: false,
}



/**
 * Gives you a callback when the packet is recieved
 * @param {String} packetName "PacketName" value in C# Packet definition
 * @param {(packet) => {}} callback 
 */
const registerPacketListener = (packetName, callback) => {
    if (!Object.keys(dataTransmitServerData.listeners).includes(packetName))
        dataTransmitServerData.listeners[packetName] = [callback];
    else
        dataTransmitServerData.listeners[packetName].push(callback);
}

/**
 * 
 * @param {*} port 
 */
const openServer = (port, internalEndpoint = "/") => {
    if (dataTransmitServerData.isActive) throw new Error("Cant open a second server when one is already running!");
    dataTransmitServerData.isActive = true;

    dataTransmitServerData.app.use(express.json());
    dataTransmitServerData.app.disable("x-powered-by");

    dataTransmitServerData.app.post(internalEndpoint, (req, res) => {
        if (typeof req.body.PacketName !== 'string')
            return res.sendStatus(400); // https://http.cat/400

        const packet = req.body;
        const listeners = dataTransmitServerData.listeners[packet.PacketName];

        if (!listeners || listeners.length == 0)
            return res.sendStatus(202); // No handlers but fine so https://http.cat/202

        delete packet.PacketName;

        for (const handler of listeners)
            handler(packet);

        return res.sendStatus(202); // https://http.cat/202
    })

    dataTransmitServerData.app.listen(port);
}

/**
 * 
 * @param {String} path 
 * @param {IRouterMatcher} callback 
 */
const registerGetRequest = (path, callback) => {
    dataTransmitServerData.app.get(path, callback);
}

export default { registerPacketListener, openServer, registerGetRequest };