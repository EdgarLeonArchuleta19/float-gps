import { Request, Response } from 'express';
import { EventService } from '../services/event.service';
import { asyncHandler } from '../middleware/errorHandler';

const eventService = new EventService();

export const getEvents = asyncHandler(async (req: Request, res: Response) => {
  const result = await eventService.findAll(req.query as any);
  res.json(result);
});
