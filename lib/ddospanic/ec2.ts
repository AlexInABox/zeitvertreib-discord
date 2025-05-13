import { EC2Client, AllocateAddressCommand, AssociateAddressCommand, ReleaseAddressCommand, DescribeAddressesCommand } from "@aws-sdk/client-ec2";

export const allocateElasticIP = async (): Promise<{ publicIp: string, allocationId: string }> => {
    const ec2Client = new EC2Client({ region: "eu-central-1" });

    // Allocate a new Elastic IP
    const allocateResponse = await ec2Client.send(new AllocateAddressCommand({ Domain: "vpc" }));
    if (!allocateResponse.AllocationId || !allocateResponse.PublicIp) throw new Error("Elastic IP allocation failed.");

    console.log(`Elastic IP allocated: ${allocateResponse.PublicIp}`);

    return {
        publicIp: allocateResponse.PublicIp,
        allocationId: allocateResponse.AllocationId
    };
};

export const assignElasticIP = async (instanceId: string, privateIp: string, allocationId: string): Promise<void> => {
    const ec2Client = new EC2Client({ region: "eu-central-1" });
    
    // Step 1: Check if there's an existing Elastic IP associated with the private IP
    const describeResponse = await ec2Client.send(new DescribeAddressesCommand({
        Filters: [
            {
                Name: "private-ip-address",
                Values: [privateIp]
            }
        ]
    }));
    
    // Get the AllocationId of the existing Elastic IP, if it exists
    let oldAllocationId: string | undefined = undefined;
    if (describeResponse.Addresses && describeResponse.Addresses.length > 0) {
        const existingElasticIP = describeResponse.Addresses[0];
        oldAllocationId = existingElasticIP.AllocationId;
        console.log(`Found existing Elastic IP with AllocationId: ${oldAllocationId}`);
    }

    // Step 2: Associate the Elastic IP with the instance
    await ec2Client.send(new AssociateAddressCommand({
        AllocationId: allocationId,
        InstanceId: instanceId,
        PrivateIpAddress: privateIp,
    }));

    console.log(`Elastic IP associated with instance ${instanceId} at private IP ${privateIp}`);
    
    // Step 3: Release the old Elastic IP if it exists
    if (oldAllocationId) {
        await releaseElasticIP(oldAllocationId);
    }
};

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
    const { publicIp, allocationId } = await allocateElasticIP();

    // Step 4: Associate the newly allocated Elastic IP with the instance
    await assignElasticIP(instanceId, privateIp, allocationId);

    console.log(`Elastic IP allocated and associated: ${publicIp}`);

    // Step 5: Release the old Elastic IP if it exists
    if (oldAllocationId) {
        await releaseElasticIP(oldAllocationId);
    }

    return publicIp;
};

const releaseElasticIP = async (allocationId: string): Promise<void> => {
    const ec2Client = new EC2Client({ region: "eu-central-1" });
    await ec2Client.send(new ReleaseAddressCommand({ AllocationId: allocationId }));
    console.log(`Elastic IP released: ${allocationId}`);
};
