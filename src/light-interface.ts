import { IoT } from '@aws-sdk/client-iot';
import { IoTDataPlane } from '@aws-sdk/client-iot-data-plane';
import { config } from './config';

interface DeviceInfo {
  ruleId?: number;
  deviceId: string;
  patternId: number;
}
class LightInterface {
  private coreClient: IoT;
  private dpClient: IoTDataPlane;
  private deviceCache: DeviceInfo[] = [];
  private deviceCacheLastModified = 0;

  constructor() {
    this.coreClient = new IoT({ region: config.iot.region });
    this.dpClient = new IoTDataPlane({
      region: config.iot.region,
      endpoint: config.iot.dataEndpoint,
    });
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const thingsResponse = await this.coreClient.listThings({ maxResults: 50 });
    const things = thingsResponse.things ?? [];

    this.deviceCache = things.map((device) => ({
      deviceId: device.thingName!,
      ruleId: Number(device.attributes?.RuleId ?? -1),
      patternId: -1,
    }));
    this.deviceCacheLastModified = Date.now();

    return this.deviceCache;
  }

  async getDevicesWithCache() {
    if (Date.now() - this.deviceCacheLastModified > 1000 * 60 * 10) {
      return await this.getDevices();
    } else {
      return this.deviceCache;
    }
  }

  async updateDeviceRuleId(deviceId: string, ruleId: number) {
    await this.coreClient.updateThing({
      thingName: deviceId,
      attributePayload: {
        attributes: {
          RuleId: ruleId.toString(),
        },
        merge: false,
      },
    });
  }
  async applyPatternForDevice(deviceId: string, pattern: number) {
    const shadowPayload = {
      state: {
        desired: {
          patternId: pattern,
        },
      },
    };
    await this.dpClient.updateThingShadow({
      thingName: deviceId,
      payload: Buffer.from(JSON.stringify(shadowPayload), 'utf-8'),
    });
  }

  async applyPatternForRule(ruleId: number, pattern: number) {
    const devices = await this.getDevicesWithCache();
    const matchedDevices = devices.filter((device) => device.ruleId === ruleId);

    for (const device of matchedDevices) {
      await this.applyPatternForDevice(device.deviceId, pattern);
    }
  }
}

export const lightInterface = new LightInterface();
