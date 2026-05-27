# ModPulse AI

ModPulse AI is a Devvit-powered Reddit moderation triage tool that helps subreddit moderators analyze risky posts, detect scam/spam/harassment/privacy signals, generate risk scores, and produce structured moderation reports with suggested actions.

It is built for moderators who want faster, clearer, and more consistent review decisions directly inside Reddit’s moderation workflow.

---

## Problem

Moderators often spend a lot of time reviewing posts that may contain:

- Spam or self-promotion
- Crypto or financial scams
- Misleading claims
- Off-platform solicitation
- Harassment or toxic language
- Privacy or sensitive information risks

Manual moderation can become repetitive and inconsistent, especially when communities grow and queues become larger.

---

## Solution

ModPulse AI adds a custom moderator action to Reddit posts.

Moderators can open **ModPulse AI Analyzer**, enter the post title/body, and instantly generate a structured moderation report containing:

- Risk score
- Risk level
- Priority
- Recommended decision
- Detected categories
- Detected signals
- Evidence summary
- Suggested moderator actions
- User-facing removal message
- Estimated moderation time saved

---

## Features

- Devvit-based Reddit mod tool
- Post-level moderation action
- AI-ready moderation analysis
- Rule-based fallback scoring engine
- Risk score from 0 to 100
- Critical / High / Medium / Low classification
- Evidence-based moderation report
- Suggested moderator action checklist
- Ready-to-send removal message
- Moderator time-saving estimate
- Report modal inside Reddit

---

## Risk Detection

ModPulse AI can detect signals such as:

- Crypto or financial promotion
- Guaranteed profit claims
- Referral or discount link promotion
- Urgency-based spam
- DM or off-platform solicitation
- Harassment or abusive language
- Possible private information exposure

---

## Example Report Output

Risk Score: 95/100
Risk Level: Critical
Priority: Immediate
Recommended Decision: Remove

Detected Categories:
- Scam / Financial Risk
- Misleading Claim
- Spam / Self Promotion
- Off-platform Solicitation

Detected Signals:
- Financial or crypto promotion detected
- Unrealistic guarantee claim detected
- Referral or promotional language detected
- Urgency or off-platform contact detected

Suggested Moderator Actions:
- Remove the post immediately

---

## Tech Stack

Devvit
TypeScript
Hono
Node.js
Reddit Developer Platform
OpenAI-ready architecture
Rule-based fallback engine

---

## How It Works

Moderator opens a Reddit post.
Moderator clicks Open ModPulse AI Analyzer from the post moderation menu.
Moderator enters or reviews the post title and body.
ModPulse AI analyzes the content.
A structured moderation report is displayed.
Moderator uses the risk score, evidence, and suggested actions to make a faster decision.

---

## OpenAI Support

ModPulse AI is designed with OpenAI API support for AI-based moderation analysis.

If an OpenAI API key is not available, the app automatically uses a stable rule-based fallback engine.

Example PowerShell command:

$env:OPENAI_API_KEY="your_api_key_here"
npm run dev

If OpenAI is active, the report shows:

Analysis Source: OpenAI

If fallback is active, the report shows:

Analysis Source: Rule-based fallback
Run Locally

---

## Install dependencies:

npm install

Build the project:

npm run build

Start Devvit playtest:

npm run dev

---

## Project Structure
src/
  index.ts        # Main Devvit server and moderation analyzer logic

devvit.json      # Devvit app configuration
package.json     # Project dependencies and scripts
Commands
npm run dev

## Starts Devvit playtest mode.

npm run build

## Builds the project.

npm run deploy

## Uploads a new version of the app to Reddit.

npm run launch

Publishes the app for review and public use.

npm run login

Authenticates the Devvit CLI with Reddit.

---

## Hackathon Relevance

ModPulse AI is designed for the New Mod Tool category.

## It focuses on:

Reducing moderator workload
Improving moderation consistency
Speeding up risky post triage
Helping moderators identify scams, spam, harassment, and privacy risks
Generating clear evidence-based reports
Making moderation decisions easier for mod teams
Impact

For high-risk posts, ModPulse AI can save an estimated 5–7 minutes per review by automatically preparing:

Risk analysis
Evidence summary
Action checklist
Removal message

This helps moderators act faster and maintain better community safety.

Future Improvements
Automatic post content fetching
Full custom dashboard view
Exportable PDF moderation reports
Community-specific rule configuration
Moderator analytics dashboard
Auto-escalation for repeated offenders
Integration with Reddit mod queue workflows
Configurable subreddit-specific risk rules
Author

Built by Mohamed Farhun M.

---

## License

BSD-3-Clause
- Mark as spam if promotional or scam-related
- Review the author history for repeated violations
- Consider a temporary ban if this is repeated behavior
