import { Router } from 'express';
import { lightInterface } from './light-interface';

export const deviceAPIRouter = Router();

deviceAPIRouter.get('/', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  const devices = await lightInterface.getDevices();

  res.json(devices);
});

deviceAPIRouter.post('/:device/:pattern', async (req, res) => {
  if (!req.user) {
    res.status(401).end();
    return;
  }

  const pattern = Number(req.params.pattern);

  if (isNaN(pattern) || pattern < 0) {
    res.status(400).end();
    return;
  }

  const devices = await lightInterface.getDevicesWithCache();
  const device = devices.find(({ deviceId }) => deviceId === req.params.device);

  if (!device) {
    res.status(404).end();
    return;
  }

  await lightInterface.applyPatternForDevice(device.deviceId, pattern);

  res.status(200).end();
});
