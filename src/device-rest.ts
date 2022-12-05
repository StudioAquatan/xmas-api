import { Router } from 'express';
import { lightInterface } from './light-interface';

export const deviceAPIRouter = Router();

deviceAPIRouter.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).end();
      return;
    }

    const devices = await lightInterface.getDevices();

    res.json(devices);
  } catch (e) {
    next(e);
  }
});

deviceAPIRouter.post('/:device/pattern', async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).end();
      return;
    }

    const pattern = Number(req.query.pattern);

    if (isNaN(pattern) || pattern < 0) {
      res.status(400).end();
      return;
    }

    const devices = await lightInterface.getDevicesWithCache();
    const device = devices.find(
      ({ deviceId }) => deviceId === req.params.device,
    );

    if (!device) {
      res.status(404).end();
      return;
    }

    await lightInterface.applyPatternForDevice(device.deviceId, pattern);

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});

deviceAPIRouter.patch('/:device/rules', async (req, res, next) => {
  try {
    if (!req.user) {
      res.status(401).end();
      return;
    }

    const ruleId = Number(req.query.ruleId);

    if (isNaN(ruleId) || ruleId < 0) {
      res.status(400).end();
      return;
    }

    const devices = await lightInterface.getDevicesWithCache();
    const device = devices.find(
      ({ deviceId }) => deviceId === req.params.device,
    );

    if (!device) {
      res.status(404).end();
      return;
    }

    await lightInterface.updateDeviceRuleId(device.deviceId, ruleId);

    res.status(200).end();
  } catch (e) {
    next(e);
  }
});
