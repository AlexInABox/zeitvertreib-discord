import { config } from "dotenv";
config();

import { allocateAndAssignElasticIP } from "./ec2.js";
import { getOldIpFromCloudflare, updateCloudflareARecords } from "./cloudflare.js";
import { replaceIPInFiles } from "./sftp.js";

const instanceId = "i-0a15c00767b88eaaa";
const privateIp = "172.31.22.106";

async function ddosFix() {
    try {
        const newIp = await allocateAndAssignElasticIP(instanceId, privateIp);
        const oldIp = await getOldIpFromCloudflare(process.env.CLOUDFLARE_ZONE_ID!, "zeitvertreib.vip");
        updateCloudflareARecords(process.env.CLOUDFLARE_ZONE_ID!, oldIp, newIp);
        replaceIPInFiles(newIp);
    } catch (err) {
        console.error("Script failed:", err);
    }
}

async function ddosFixWithDiscordFeedback(editReply: (message: string) => Promise<any>) {
    try {
        await editReply("Step 1: Allocating and assigning new Elastic IP...");
        const newIp = await allocateAndAssignElasticIP(instanceId, privateIp);

        await editReply(`Step 2: Getting old IP from Cloudflare...`);
        const oldIp = await getOldIpFromCloudflare(process.env.CLOUDFLARE_ZONE_ID!, "zeitvertreib.vip");

        await editReply(`Step 3: Replacing IP in files with ${newIp}...`);
        await replaceIPInFiles(newIp);

        await editReply(`Step 4: Updating Cloudflare A records from ${oldIp} to ${newIp}...`);
        await updateCloudflareARecords(process.env.CLOUDFLARE_ZONE_ID!, oldIp, newIp);



        await editReply("✅ All steps completed. IP updated and DDoS mitigation applied.");
    } catch (err) {
        await editReply("❌ Error during DDoS fix: " + err);
        console.error("Script failed:", err);
    }
}


export default { ddosFix, ddosFixWithDiscordFeedback };
