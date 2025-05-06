import { EC2Client, AllocateAddressCommand, AssociateAddressCommand, ReleaseAddressCommand, DescribeAddressesCommand } from "@aws-sdk/client-ec2";

export const allocateAndAssignElasticIP = async (instanceId: string, privateIp: string): Promise<string> => {
    const ec2Client = new EC2Client({ region: "eu-central-1" });

    // Step 1: Describe existing Elastic IPs associated with the private IP
    const describeResponse = await ec2Client.send(new DescribeAddressesCommand({
        Filters: [
            {
                Name: "private-ip-address",
                Values: [privateIp]
            }
        ]
    }));

    // Step 2: Get the AllocationId of the existing Elastic IP, if it exists
    let oldAllocationId: string | undefined = undefined;
    if (describeResponse.Addresses && describeResponse.Addresses.length > 0) {
        const existingElasticIP = describeResponse.Addresses[0];
        oldAllocationId = existingElasticIP.AllocationId;
        console.log(`Found existing Elastic IP with AllocationId: ${oldAllocationId}`);
    }

    // Step 3: Allocate a new Elastic IP
    const allocateResponse = await ec2Client.send(new AllocateAddressCommand({ Domain: "vpc" }));
    if (!allocateResponse.AllocationId || !allocateResponse.PublicIp) throw new Error("Elastic IP allocation failed.");

    // Step 4: Associate the newly allocated Elastic IP with the instance
    await ec2Client.send(new AssociateAddressCommand({
        AllocationId: allocateResponse.AllocationId,
        InstanceId: instanceId,
        PrivateIpAddress: privateIp,
    }));

    console.log(`Elastic IP allocated and associated: ${allocateResponse.PublicIp}`);

    // Step 5: Release the old Elastic IP if it exists
    if (oldAllocationId) {
        await releaseElasticIP(oldAllocationId);
    }

    return allocateResponse.PublicIp;
};

const releaseElasticIP = async (allocationId: string): Promise<void> => {
    const ec2Client = new EC2Client({ region: "eu-central-1" });
    await ec2Client.send(new ReleaseAddressCommand({ AllocationId: allocationId }));
    console.log(`Elastic IP released: ${allocationId}`);
};
