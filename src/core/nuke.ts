import { reddit, redis } from '@devvit/web/server';
import type { Post } from '@devvit/web/server';
import type { T3 } from '@devvit/shared-types/tid.js';

export type AnalyzePostProps = {
  postId: T3;
  subredditId: string;
};

export type ModPulseReport = {
  success: boolean;
  message: string;
  riskScore: number;
  riskLevel: string;
  possibleRuleMatch: string;
  suggestedAction: string;
  confidence: string;
  explanation: string;
  suggestedRemovalComment: string;
};

function getRiskLevel(score: number): string {
  if (score >= 85) return 'Critical';
  if (score >= 65) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

function analyzeContent(title: string, body: string): ModPulseReport {
  const text = `${title} ${body}`.toLowerCase();

  let score = 10;
  const reasons: string[] = [];
  let rule = 'General review';
  let action = 'Approve';
  let removalComment =
    'Your post may need edits before it can be approved. Please review the community rules and repost with more context.';

  const checks = [
    {
      words: ['discount', 'referral', 'promo', 'dm me', 'limited spots', 'buy now', 'affiliate'],
      points: 30,
      rule: 'Spam / self-promotion',
      reason: 'Promotional or referral-style wording detected.',
      action: 'Remove or filter for manual review',
      removalComment:
        'Your post was removed because it appears to contain promotional or referral-style content. Please review the subreddit rules before posting again.',
    },
    {
      words: ['guaranteed profit', 'crypto', 'trading tool', 'investment', 'double your money'],
      points: 30,
      rule: 'Scam or risky financial claim',
      reason: 'Risky financial or scam-like claim detected.',
      action: 'Remove and warn user',
      removalComment:
        'Your post was removed because it appears to make risky or unrealistic financial claims. Please avoid promotional or misleading claims.',
    },
    {
      words: ['idiot', 'stupid', 'hate you', 'kill yourself', 'moron'],
      points: 35,
      rule: 'Harassment / abusive language',
      reason: 'Hostile or abusive language detected.',
      action: 'Remove and consider warning user',
      removalComment:
        'Your post/comment was removed because it contains abusive or hostile language. Please keep discussions respectful.',
    },
    {
      words: ['leak', 'dox', 'address', 'phone number', 'private info'],
      points: 45,
      rule: 'Privacy / personal information',
      reason: 'Possible private information or doxxing-related wording detected.',
      action: 'Remove immediately and escalate to human mod',
      removalComment:
        'Your content was removed because it may contain private or sensitive information. Sharing personal information is not allowed.',
    },
  ];

  for (const check of checks) {
    if (check.words.some((word) => text.includes(word))) {
      score += check.points;
      reasons.push(check.reason);
      rule = check.rule;
      action = check.action;
      removalComment = check.removalComment;
    }
  }

  score = Math.max(0, Math.min(100, score));

  return {
    success: true,
    message: 'Analysis complete',
    riskScore: score,
    riskLevel: getRiskLevel(score),
    possibleRuleMatch: rule,
    suggestedAction: action,
    confidence: score >= 65 ? 'High' : score >= 35 ? 'Medium' : 'Low',
    explanation:
      reasons.length > 0
        ? reasons.join(' ')
        : 'No major high-risk moderation signals were detected. Moderator review is still recommended.',
    suggestedRemovalComment: removalComment,
  };
}

async function saveDashboardStats(subredditName: string, report: ModPulseReport) {
  const totalKey = `modpulse:${subredditName}:total`;
  const highRiskKey = `modpulse:${subredditName}:highRisk`;

  const total = Number((await redis.get(totalKey)) || '0') + 1;
  await redis.set(totalKey, String(total));

  if (report.riskScore >= 65) {
    const highRisk = Number((await redis.get(highRiskKey)) || '0') + 1;
    await redis.set(highRiskKey, String(highRisk));
  }
}

export async function handleAnalyzePost(props: AnalyzePostProps): Promise<ModPulseReport> {
  try {
    const [user, post]: [any, Post] = await Promise.all([
      reddit.getCurrentUser(),
      reddit.getPostById(props.postId),
    ]);

    if (!user) {
      return {
        success: false,
        message: "Can't get current user.",
        riskScore: 0,
        riskLevel: 'Unknown',
        possibleRuleMatch: 'Unknown',
        suggestedAction: 'Try again',
        confidence: 'Low',
        explanation: 'Unable to identify the current user.',
        suggestedRemovalComment: '',
      };
    }

    const modPermissions = await user.getModPermissionsForSubreddit(post.subredditName);
    const canModerate =
      modPermissions.includes('all') ||
      modPermissions.includes('posts') ||
      modPermissions.includes('access');

    if (!canModerate) {
      return {
        success: false,
        message: 'You do not have moderator permissions to use ModPulse AI.',
        riskScore: 0,
        riskLevel: 'Unknown',
        possibleRuleMatch: 'Permission check failed',
        suggestedAction: 'Ask a moderator to run this tool',
        confidence: 'Low',
        explanation: 'Only subreddit moderators can run this moderation triage tool.',
        suggestedRemovalComment: '',
      };
    }

    const title = post.title || '';
    const body = post.body || '';

    const report = analyzeContent(title, body);
    await saveDashboardStats(post.subredditName, report);

    return report;
  } catch (err) {
    console.error(err);

    return {
      success: false,
      message: 'ModPulse analysis failed. Please try again later.',
      riskScore: 0,
      riskLevel: 'Unknown',
      possibleRuleMatch: 'Error',
      suggestedAction: 'Retry',
      confidence: 'Low',
      explanation: 'Unexpected error while analyzing the selected post.',
      suggestedRemovalComment: '',
    };
  }
}

export async function getDashboardSummary(subredditName: string) {
  const total = Number((await redis.get(`modpulse:${subredditName}:total`)) || '0');
  const highRisk = Number((await redis.get(`modpulse:${subredditName}:highRisk`)) || '0');

  return {
    total,
    highRisk,
    timeSaved: total * 2,
  };
}