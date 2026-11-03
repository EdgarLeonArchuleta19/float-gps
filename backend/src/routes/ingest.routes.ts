import { Router } from 'express';
import { handleTraccarWebhook } from '../controllers/ingest.controller';

const router = Router();

router.post('/traccar', handleTraccarWebhook);

export default router;
