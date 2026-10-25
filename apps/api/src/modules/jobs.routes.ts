import { Router } from 'express';
import { notFound } from '../lib/errors';
import { currentUserId } from '../middleware/auth';
import { uuidParam } from '../middleware/validate';
import { getJobForUser, toJob } from '../jobs/queue';

export const jobsRouter = Router();

jobsRouter.get('/:jobId', async (req, res) => {
  const job = await getJobForUser(uuidParam(req.params.jobId, 'job id'), currentUserId(req));
  if (!job) throw notFound('Job');
  res.json(toJob(job));
});
