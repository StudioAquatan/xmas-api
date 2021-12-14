import { Router } from 'express';
import { lightInterface } from './light-interface';

export const deviceAPIRouter = Router();

deviceAPIRouter.get('/', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const devices = await lightInterface.getDevices();

  res.json(devices);
});

deviceAPIRouter.post('/:device/:pattern', async (req, res) => {
  if (!req.user) {
    return res.status(401).end();
  }

  const pattern = Number(req.params.pattern);

  if (isNaN(pattern) || pattern < 0) {
    return res.status(400).end();
  }

  const devices = await lightInterface.getDevicesWithCache();
  const device = devices.find(({ deviceId }) => deviceId === req.params.device);

  if (!device) {
    return res.status(404).end();
  }

  await lightInterface.applyPatternForDevice(device.deviceId, pattern);

  res.status(200).end();
});
