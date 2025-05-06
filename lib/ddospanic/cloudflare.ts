import Cloudflare from "cloudflare";
import { config } from "dotenv";
config();

const cf = new Cloudflare({ apiKey: process.env.CLOUDFLARE_API_KEY!, apiEmail: process.env.CLOUDFLARE_API_EMAIL! });

export const getOldIpFromCloudflare = async (zoneId: string, domain: string): Promise<string> => {
    const records = await cf.dns.records.list({ zone_id: zoneId });
    const record = records.result.find((r: any) => r.name === domain && r.type === "A");
    if (!record || !record.content) throw new Error(`No A record found for ${domain}`);

    console.log(`Old IP from Cloudflare: ${record.content}`);
    return record.content;
};

export const updateCloudflareARecords = async (zoneId: string, oldIp: string, newIp: string) => {
    const records = await cf.dns.records.list({ zone_id: zoneId });
    const targets = records.result.filter((r: any) => r.type === "A" && r.content === oldIp);
    for (const record of targets) {
        await cf.dns.records.edit(
            record.id,
            {
                zone_id: zoneId,
                type: "A",
                name: record.name,
                content: newIp,
                ttl: record.ttl,
                proxied: record.proxied,
            }
        );
        console.log(`Updated ${record.name} to ${newIp}`);
    }
    if (targets.length === 0) console.log("No matching A records found.");
};
