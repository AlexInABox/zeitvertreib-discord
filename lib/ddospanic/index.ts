import { config } from "dotenv";
config();

import { allocateElasticIP, assignElasticIP } from "./ec2.js";
import { getOldIpFromCloudflare, updateCloudflareARecords } from "./cloudflare.js";
import { replaceIPInFiles } from "./sftp.js";
import { checkBlacklistedIPs } from "./blame.js";

const instanceId = "i-0a15c00767b88eaaa";
const privateIp = "172.31.22.106";

async function ddosFix() {
    try {
        const { publicIp: newIp, allocationId } = await allocateElasticIP();
        await replaceIPInFiles(newIp);
        const oldIp = await getOldIpFromCloudflare(process.env.CLOUDFLARE_ZONE_ID!, "node.zeitvertreib.vip");
        await assignElasticIP(instanceId, privateIp, allocationId);
        await updateCloudflareARecords(process.env.CLOUDFLARE_ZONE_ID!, oldIp, newIp);

        await checkBlacklistedIPs();
    } catch (err) {
        console.error("Script failed:", err);
    }
}

async function ddosFixWithDiscordFeedback(editReply: (message: string) => Promise<any>) {
    try {
        await editReply("Step 1: Allocating new Elastic IP...");
        const { publicIp: newIp, allocationId } = await allocateElasticIP();

        await editReply(`Step 2: Replacing IP in files with ${newIp}...`);
        await replaceIPInFiles(newIp);

        await editReply(`Step 3: Getting old IP from Cloudflare...`);
        const oldIp = await getOldIpFromCloudflare(process.env.CLOUDFLARE_ZONE_ID!, "");

        await editReply(`Step 4: Assigning new IP to instance...`);
        await assignElasticIP(instanceId, privateIp, allocationId);

        await editReply(`Step 5: Updating Cloudflare A records from ${oldIp} to ${newIp}...`);
        await updateCloudflareARecords(process.env.CLOUDFLARE_ZONE_ID!, oldIp, newIp);

        await editReply(`Step 6: Gathering bad IP's associated with this attack.`);
        await checkBlacklistedIPs();

        await editReply("✅ All steps completed. IP updated and DDoS mitigation applied.");
    } catch (err) {
        await editReply("❌ Error during DDoS fix: " + err);
        console.error("Script failed:", err);
    }
}


export default { ddosFix, ddosFixWithDiscordFeedback };
