import { Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { asyncHandler } from '../middleware/errorHandler';
import { getTenant } from '../middleware/auth';

const eventService = new EventService();

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await eventService.findAll(req.query as any, getTenant(req));
  res.json(result);
});
