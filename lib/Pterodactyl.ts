import util from "util";
import request from "request";

const requestPromise = util.promisify(request);

async function sendPowerEventToServer(
  signal: "start" | "restart" | "stop",
  BASE_URL: string,
  SERVER_CLIENT_ID: number,
  PANEL_CLIENT_TOKEN: string
): Promise<void> {
  const options = {
    method: "POST",
    url: `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/power`,
    headers: {
      Authorization: "Bearer " + PANEL_CLIENT_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    form: {
      signal: signal,
    },
    jar: false, // Disable cookie jar to prevent saving and sending cookies
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    console.log(body);
  });
}

async function reinstallServer(
  BASE_URL: string,
  SERVER_APPLICATION_ID: number,
  PANEL_APPLICATION_TOKEN: string
): Promise<void> {
  const options = {
    method: "POST",
    url: `${BASE_URL}api/application/servers/${SERVER_APPLICATION_ID}/reinstall`,
    headers: {
      Authorization: "Bearer " + PANEL_APPLICATION_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  };

  await request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response);
  });
}

async function isServerInstalling(
  BASE_URL: string,
  SERVER_CLIENT_ID: number,
  PANEL_CLIENT_TOKEN: string,
): Promise<boolean> {
  const options = {
    method: "GET",
    url: `${BASE_URL}api/client/servers/${SERVER_CLIENT_ID}/`,
    headers: {
      Authorization: "Bearer " + PANEL_CLIENT_TOKEN,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    jar: false, // Disable cookie jar to prevent saving and sending cookies
  };

  try {
    const response = await requestPromise(options);
    const isInstalling: boolean = JSON.parse(response.body).attributes.is_installing;
    return isInstalling;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export default { isServerInstalling, reinstallServer, sendPowerEventToServer };
