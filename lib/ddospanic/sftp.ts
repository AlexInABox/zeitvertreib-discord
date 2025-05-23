import SFTPClient from "ssh2-sftp-client";
import { config } from "dotenv";
import { Client } from "ssh2";
config();

const sftp = new SFTPClient();

// Script path for Docker container restart

const targetFiles = [
    "/var/lib/pterodactyl/volumes/2a763cc5-ec26-4a34-9673-685256138b1d/.config/SCP Secret Laboratory/config/7000/config_gameplay.txt",
    "/var/lib/pterodactyl/volumes/7c4f034e-5d12-48ca-8e8a-134195a084db/.config/SCP Secret Laboratory/config/7001/config_gameplay.txt",
];

export const replaceIPInFiles = async (newIp: string) => {
    const sftpConfig = {
        host: String(process.env.SFTP_IP),
        port: Number(process.env.SFTP_PORT || 22),
        username: process.env.SFTP_USER!,
        password: process.env.SFTP_PASS!,
    };

    await sftp.connect(sftpConfig);

    for (const file of targetFiles) {
        try {
            const content = await sftp.get(file);
            let text = content.toString();

            // Replace the line starting with 'server_ip: <SOMEIP>' with 'server_ip: <newip>'
            const regex = /^server_ip:\s*.*$/m;
            if (regex.test(text)) {
                text = text.replace(regex, `server_ip: ${newIp}`);
                await sftp.put(Buffer.from(text), file);
                console.log(`Updated server_ip in ${file}`);
            } else {
                console.log(`No server_ip line found in ${file}`);
            }
        } catch (err) {
            console.warn(`Failed to update ${file}:`, err);
        }
    }

    await sftp.end();

    // SSH connection to restart Docker containers
    const sshClient = new Client();

    sshClient.on('ready', () => {
        sshClient.exec(
            `/home/ddospanic/softRestart/docker_sr.sh > /dev/null 2>&1 & 
/home/ddospanic/softRestart/docker_sr.sh > /dev/null 2>&1 &`,
            (err, stream) => {
                if (err) {
                    console.error(`Error executing script /home/ddospanic/softRestart/docker_sr.sh: ${err}`);
                    return;
                }

                stream.on('close', (code: number, signal: any) => {
                    if (code === 0) {
                        console.log(`Successfully executed script /home/ddospanic/softRestart/docker_sr.sh`);
                    } else {
                        console.warn(`Script execution failed with exit code ${code}`);
                    }
                    sshClient.end();
                }).on('data', (data: any) => {
                    console.log(`stdout: ${data}`);
                }).stderr.on('data', (data) => {
                    console.warn(`stderr: ${data}`);
                });
            }
        );
    }).on('error', (err) => {
        console.error(`SSH connection error: ${err}`);
    }).connect({
        host: String(process.env.SFTP_IP),
        port: Number(process.env.SFTP_PORT || 22),
        username: process.env.SFTP_USER!,
        password: process.env.SFTP_PASS!,
    });
};
