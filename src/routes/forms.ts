import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { isT3 } from '@devvit/shared-types/tid.js';
import { handleAnalyzePost } from '../core/nuke';

type AnalyzePostFormValues = {
  targetId?: string;
  note?: string;
};

export const forms = new Hono();

const getTargetId = (values: AnalyzePostFormValues) => {
  if (typeof values.targetId === 'string' && values.targetId.trim()) {
    return values.targetId.trim();
  }

  return context.postId;
};

forms.post('/analyze-post-submit', async (c) => {
  const values = await c.req.json<AnalyzePostFormValues>();
  const targetId = getTargetId(values);

  if (!isT3(targetId)) {
    return c.json<UiResponse>(
      {
        showToast: 'ModPulse AI failed: selected target is not a valid post.',
      },
      200
    );
  }

  const result = await handleAnalyzePost({
    postId: targetId,
    subredditId: context.subredditId,
  });

  return c.json<UiResponse>(
    {
      showToast: `ModPulse AI: ${result.riskLevel} risk (${result.riskScore}/100). Rule: ${result.possibleRuleMatch}. Action: ${result.suggestedAction}.`,
    },
    200
  );
});