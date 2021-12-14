import { v1 as iot } from '@google-cloud/iot';
import { config } from './config';

interface DeviceInfo {
  ruleId?: number;
  deviceId: string;
  patternId: number;
  lastConfigAck?: Date | null;
  lastHeartbeat?: Date | null;
}
class LightInterface {
  private client: iot.DeviceManagerClient;
  private deviceCache: DeviceInfo[] = [];
  private deviceCacheLastModified = 0;

  constructor() {
    this.client = new iot.DeviceManagerClient({
      projectId: config.iot.projectId,
    });
  }

  async getDevices(): Promise<DeviceInfo[]> {
    const registryPath = this.client.registryPath(
      config.iot.projectId,
      config.iot.region,
      config.iot.registry,
    );
    const [devices] = await this.client.listDevices({
      pageSize: 50,
      parent: registryPath,
      fieldMask: {
        paths: [
          'metadata',
          'config',
          'last_config_ack_time',
          'last_heartbeat_time',
        ],
      },
    });

    this.deviceCache = devices.map((device) => ({
      deviceId: device.id!,
      ruleId: Number(device.metadata?.ruleId ?? -1),
      patternId: device.config?.binaryData
        ? Number(Buffer.from(device.config?.binaryData).toString('utf-8'))
        : -1,
      lastConfigAck: device.lastConfigAckTime?.seconds
        ? new Date(Number(device.lastConfigAckTime?.seconds) * 1000)
        : null,
      lastHeartbeat: device.lastHeartbeatTime?.seconds
        ? new Date(Number(device.lastHeartbeatTime?.seconds) * 1000)
        : null,
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

  async applyPatternForDevice(deviceId: string, pattern: number) {
    const devicePath = this.client.devicePath(
      config.iot.projectId,
      config.iot.region,
      config.iot.registry,
      deviceId,
    );

    await this.client.modifyCloudToDeviceConfig({
      name: devicePath,
      binaryData: Buffer.from(pattern.toString(), 'utf8').toString('base64'),
      versionToUpdate: 0,
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
