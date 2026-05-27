import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

type AnalysisResult = {
  score: number;
  level: string;
  decision: string;
  priority: string;
  categories: string[];
  reasons: string[];
  evidence: string[];
  actions: string[];
  removalDraft: string;
  timeSaved: number;
  source: string;
};

function fallbackAnalyze(title: string, body: string): AnalysisResult {
  const text = `${title} ${body}`.toLowerCase();

  let score = 10;
  const reasons: string[] = [];
  const categories: string[] = [];
  const evidence: string[] = [];
  const actions: string[] = [];

  const addRisk = (
    points: number,
    reason: string,
    category: string,
    proof: string
  ) => {
    score += points;
    reasons.push(reason);
    evidence.push(proof);
    if (!categories.includes(category)) categories.push(category);
  };

  if (/(crypto|trading|profit|investment|forex|wallet|airdrop|token|staking)/i.test(text)) {
    addRisk(
      25,
      'Financial or crypto promotion detected',
      'Scam / Financial Risk',
      'Crypto, trading, investment, wallet, token, staking, or similar financial wording was detected.'
    );
  }

  if (/(guarantee|guaranteed profit|100% profit|risk free|no loss|double your money)/i.test(text)) {
    addRisk(
      25,
      'Unrealistic guarantee claim detected',
      'Misleading Claim',
      'The content uses guarantee-style wording such as guaranteed profit, risk free, no loss, or similar claims.'
    );
  }

  if (/(discount|referral|promo code|affiliate|use my link|coupon|link now)/i.test(text)) {
    addRisk(
      20,
      'Referral or promotional language detected',
      'Spam / Self Promotion',
      'Referral, discount, promo, affiliate, coupon, or link-based promotional wording was detected.'
    );
  }

  if (/(dm me|message me|limited spots|join now|act fast|urgent|only today)/i.test(text)) {
    addRisk(
      15,
      'Urgency or off-platform contact detected',
      'Off-platform Solicitation',
      'The content encourages urgent action or asks users to move to DM/off-platform communication.'
    );
  }

  if (/(idiot|stupid|kill yourself|hate you|moron|loser|shut up)/i.test(text)) {
    addRisk(
      30,
      'Harassment or toxic language detected',
      'Harassment',
      'The content includes hostile, insulting, abusive, or harmful wording.'
    );
  }

  if (/(phone number|address|email|password|otp|bank account|private key|seed phrase)/i.test(text)) {
    addRisk(
      35,
      'Possible private information exposure detected',
      'Privacy / Safety',
      'The content appears to reference sensitive personal, financial, or security information.'
    );
  }

  score = Math.min(score, 100);

  let level = 'Low';
  let decision = 'Approve';
  let priority = 'Normal';

  if (score >= 80) {
    level = 'Critical';
    decision = 'Remove';
    priority = 'Immediate';
  } else if (score >= 60) {
    level = 'High';
    decision = 'Review before approval';
    priority = 'High';
  } else if (score >= 35) {
    level = 'Medium';
    decision = 'Manual review';
    priority = 'Medium';
  }

  if (score >= 80) {
    actions.push('Remove the post immediately');
    actions.push('Mark as spam if promotional or scam-related');
    actions.push('Review the author history for repeated violations');
    actions.push('Consider a temporary ban if this is repeated behavior');
  } else if (score >= 60) {
    actions.push('Keep the post in mod queue');
    actions.push('Review the claim manually before approval');
    actions.push('Warn the user if a rule violation is confirmed');
  } else if (score >= 35) {
    actions.push('Manually review the post');
    actions.push('Ask the user to edit unclear or promotional wording');
  } else {
    actions.push('Approve or leave visible');
    actions.push('No immediate enforcement required');
  }

  const removalDraft =
    score >= 60
      ? 'Your post was removed because it appears to contain promotional, misleading, risky, or rule-breaking content. Please review the community rules before posting again.'
      : score >= 35
        ? 'Your post may need edits before approval. Please remove unclear promotional, risky, or rule-breaking wording and review the community rules.'
        : 'No removal message required. Content appears low risk.';

  return {
    score,
    level,
    decision,
    priority,
    categories: categories.length ? categories : ['General Review'],
    reasons: reasons.length ? reasons : ['No major risk signals detected'],
    evidence: evidence.length ? evidence : ['No strong violation evidence detected'],
    actions,
    removalDraft,
    timeSaved: score >= 80 ? 7 : score >= 60 ? 5 : score >= 35 ? 3 : 1,
    source: 'Rule-based fallback',
  };
}

async function openAiAnalyze(title: string, body: string): Promise<AnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackAnalyze(title, body);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are ModPulse AI, a Reddit moderation assistant. Return only valid JSON. No markdown.',
          },
          {
            role: 'user',
            content: `
Analyze this Reddit post for moderation risk.

Return JSON with:
score number 0-100,
level Low/Medium/High/Critical,
decision Approve/Manual review/Review before approval/Remove,
priority Normal/Medium/High/Immediate,
categories string[],
reasons string[],
evidence string[],
actions string[],
removalDraft string,
timeSaved number.

Title: ${title}

Body: ${body}
`,
          },
        ],
        temperature: 0.2,
      }),
    });

    const json: any = await response.json();
    const content = json?.choices?.[0]?.message?.content;

    if (!content) {
      return fallbackAnalyze(title, body);
    }

    const parsed = JSON.parse(content);

    return {
      score: Number(parsed.score ?? 10),
      level: parsed.level ?? 'Low',
      decision: parsed.decision ?? 'Manual review',
      priority: parsed.priority ?? 'Medium',
      categories: parsed.categories ?? ['General Review'],
      reasons: parsed.reasons ?? ['AI analysis completed'],
      evidence: parsed.evidence ?? ['AI-generated evidence summary'],
      actions: parsed.actions ?? ['Review manually'],
      removalDraft:
        parsed.removalDraft ??
        'Please review the community rules before posting again.',
      timeSaved: Number(parsed.timeSaved ?? 3),
      source: 'OpenAI',
    };
  } catch {
    return fallbackAnalyze(title, body);
  }
}

app.post('/internal/menu/open-analyzer', async (c) => {
  const data = await c.req.json().catch(() => ({}));

  const targetId =
    data?.targetId || c.req.header('devvit-post') || 'Unknown post';

  const subredditName =
    c.req.header('devvit-subreddit-name') || 'modpulsetriageai_dev';

  return c.json({
    showForm: {
      name: 'analyzerForm',
      form: {
        title: 'ModPulse AI Analyzer',
        acceptLabel: 'Generate AI Report',
        cancelLabel: 'Cancel',
        fields: [
          {
            type: 'string',
            name: 'postId',
            label: 'Post ID',
            required: true,
            defaultValue: targetId,
          },
          {
            type: 'string',
            name: 'subreddit',
            label: 'Subreddit',
            required: true,
            defaultValue: subredditName,
          },
          {
            type: 'string',
            name: 'title',
            label: 'Post title',
            required: true,
          },
          {
            type: 'paragraph',
            name: 'body',
            label: 'Post body or comment text',
            required: true,
          },
        ],
      },
    },
  });
});

app.post('/internal/form/analyze-submit', async (c) => {
  const data = await c.req.json().catch(() => ({}));

  const postId = data?.postId || data?.values?.postId || 'Unknown post';
  const subreddit =
    data?.subreddit || data?.values?.subreddit || 'modpulsetriageai_dev';
  const title = data?.title || data?.values?.title || '';
  const body = data?.body || data?.values?.body || '';

  const result = await openAiAnalyze(title, body);

  return c.json({
    showForm: {
      name: 'reportForm',
      form: {
        title: `ModPulse AI Report - ${result.level} Risk (${result.score}/100)`,
        acceptLabel: 'Close',
        fields: [
          {
            type: 'paragraph',
            name: 'contentDetails',
            label: 'Content Details',
            required: false,
            defaultValue:
              `Post ID: ${postId}\n` +
              `Subreddit: r/${subreddit}\n` +
              `Reviewed Title: ${title}`,
          },
          {
            type: 'paragraph',
            name: 'riskSummary',
            label: 'Risk Summary',
            required: false,
            defaultValue:
              `Risk Score: ${result.score}/100\n` +
              `Risk Level: ${result.level}\n` +
              `Priority: ${result.priority}\n` +
              `Recommended Decision: ${result.decision}\n` +
              `Analysis Source: ${result.source}`,
          },
          {
            type: 'paragraph',
            name: 'categories',
            label: 'Detected Categories',
            required: false,
            defaultValue: result.categories.map((x) => `• ${x}`).join('\n'),
          },
          {
            type: 'paragraph',
            name: 'signals',
            label: 'Detected Signals',
            required: false,
            defaultValue: result.reasons.map((x) => `• ${x}`).join('\n'),
          },
          {
            type: 'paragraph',
            name: 'evidence',
            label: 'Evidence Summary',
            required: false,
            defaultValue: result.evidence.map((x) => `• ${x}`).join('\n'),
          },
          {
            type: 'paragraph',
            name: 'actions',
            label: 'Suggested Moderator Actions',
            required: false,
            defaultValue: result.actions.map((x) => `• ${x}`).join('\n'),
          },
          {
            type: 'paragraph',
            name: 'removalMessage',
            label: 'User-Facing Removal Message',
            required: false,
            defaultValue: result.removalDraft,
          },
          {
            type: 'paragraph',
            name: 'originalContent',
            label: 'Original Content',
            required: false,
            defaultValue: body,
          },
          {
            type: 'paragraph',
            name: 'impact',
            label: 'Moderation Impact',
            required: false,
            defaultValue:
              `Estimated moderator time saved: ${result.timeSaved} minutes\n\n` +
              `ModPulse converts raw post content into a structured risk score, evidence summary, decision recommendation, action checklist, and ready-to-send removal message.`,
          },
        ],
      },
    },
  });
});

app.post('/internal/form/report-close', async (c) => {
  return c.json({
    showToast: 'ModPulse report closed.',
  });
});

export default serve(app);