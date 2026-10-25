import { Router } from 'express';
import { intakeBasicsSchema, type IntakeQuestionsResponse } from '@preppilot/shared';
import { ai } from '../ai/service';
import { currentUserId } from '../middleware/auth';
import { aiLimiter } from '../middleware/rate-limit';
import { parse } from '../middleware/validate';
import { resolveApiKey } from './users';

export const intakeRouter = Router();

intakeRouter.post('/questions', aiLimiter, async (req, res) => {
  const basics = parse(intakeBasicsSchema, req.body);
  const apiKey = await resolveApiKey(currentUserId(req));
  const questions = await ai.generateIntakeQuestions({ apiKey }, basics);
  const body: IntakeQuestionsResponse = { questions };
  res.json(body);
});
