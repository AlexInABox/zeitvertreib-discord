import { Client } from "ssh2";
import { config } from "dotenv";
import axios from "axios";
config();

export const checkBlacklistedIPs = async (): Promise<void> => {
    const sshClient = new Client();

    sshClient.on('ready', () => {
        console.log('SSH Connection established for checking blacklisted IPs');

        // Run command to find blacklisted IPs with high failure counts
        const command = 'journalctl -k --since "5 minutes ago" | grep "BLACKLIST-MAGIC-FAIL" | grep -o "SRC=[^ ]*" | cut -d= -f2 | sort | uniq -c | awk \'$1 > 5 {print $2}\'';

        sshClient.exec(command, (err, stream) => {
            if (err) {
                console.error(`Error executing blacklist check command: ${err}`);
                return;
            }

            let data = '';

            stream.on('close', async (code: number) => {
                if (code === 0) {
                    console.log(`Successfully checked for blacklisted IPs`);

                    // Process data
                    const ips = data.trim().split('\n').filter(ip => ip.trim() !== '');

                    if (ips.length > 0) {
                        // Send to Discord webhook
                        await sendToDiscordWebhook(ips);
                    } else {
                        console.log('No blacklisted IPs with high failure counts found');
                    }
                } else {
                    console.warn(`Command execution failed with exit code ${code}`);
                }
                sshClient.end();
            }).on('data', (chunk: any) => {
                data += chunk.toString();
            }).stderr.on('data', (chunk) => {
                console.warn(`stderr: ${chunk}`);
            });
        });
    }).on('error', (err) => {
        console.error(`SSH connection error: ${err}`);
    }).connect({
        host: String(process.env.PROXY_IP),
        port: Number(process.env.PROXY_PORT || 22),
        username: process.env.PROXY_USER!,
        password: process.env.PROXY_PASS!,
    });
};

async function sendToDiscordWebhook(ips: string[]): Promise<void> {
    try {
        if (!process.env.BLAME_WEBHOOK) {
            throw new Error('BLAME_WEBHOOK environment variable is not set');
        }

        const content = `**Blacklisted IPs with high failure counts in the last 5 minutes:**\n${ips.join('\n')}`;

        await axios.post(process.env.BLAME_WEBHOOK, {
            content
        });

        console.log(`Successfully sent ${ips.length} blacklisted IPs to Discord webhook`);
    } catch (error) {
        console.error('Error sending to Discord webhook:', error);
    }
}