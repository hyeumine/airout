# Safety limits

AIrOut can sit with someone and point toward human help. It cannot be the help that a crisis requires.

## Listening companion

The practice listener is a small rule-based responder. If `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` are set on the server, the server may call an OpenAI-compatible chat endpoint. The phone never receives that key.

The companion is instructed to stay short, avoid diagnosis and medication advice, avoid pretending to be a human therapist, and avoid language that encourages dependency. Three modes change the shape of the reply: Just Listen, Help Me Reflect, and Encourage Me. The user can switch modes during a conversation.

Replies from the practice listener are marked `simulated: true`.

## Separate safety layer

A keyword check runs before any remote model call. It looks for phrases about suicide, self-harm, and a narrow set of threats to hurt someone else. A match returns a compassionate redirect to emergency services and published crisis lines. The message is not sent to the remote model.

This check misses paraphrases, quotations, and lyrics. It can also flag someone who is talking about a news story. It is not a clinical assessment. Teachable Machine scores are not an input to this decision. The classifier, when one exists, is optional context and must not be treated as a state of mind.

## Crisis resources in the app

The app links to published services and asks people to confirm them locally:

- Find a Helpline — https://findahelpline.com
- IASP — https://www.iasp.info/suicidalthoughts/
- United States: 988 Suicide & Crisis Lifeline — https://988lifeline.org
- Canada: 9-8-8 — https://988.ca
- United Kingdom and Ireland: Samaritans 116 123 — https://www.samaritans.org
- Australia: Lifeline 13 11 14 — https://www.lifeline.org.au

No other phone numbers are invented by this project.

## Community

Posts that match the crisis keywords are still the member’s to share. They are flagged `safetyReview` for moderators and the author receives the same resource note. The post is not automatically punished or copied into someone else’s private chat.

There is no private messaging in this build.

Reports can hide or remove a post or comment, or suspend community posting. Suspension does not delete the person’s journal. Appeals are a short statement reviewed by a moderator. The audit log stores the action, not journal text.

## What this build does not do

- It does not contact emergency services for the user.
- It does not staff a human moderator. The queue exists; people to review it do not.
- It does not claim the keyword list will catch every crisis.
- It does not let administrators browse private journals or AI transcripts through the API.
