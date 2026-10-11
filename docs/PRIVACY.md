# Privacy and retention

Anonymous in the community means other members see a nickname or “Anonymous,” not an email. Moderators can see which account a report points at. That is not the same as being anonymous to the operator of the server.

## What other members can see

- Nickname or Anonymous on a post or comment
- The post or comment text, category, and optional content note
- Supportive reaction counts

They cannot see email, internal user id, journal entries, mood check-ins, or AI conversations.

## What the account holder can see

Their own email, nickname, preferences, journal, mood history, conversations they agreed to keep, blocks, and notices.

## Retention

| Data | How long |
| --- | --- |
| Access token | About 15 minutes |
| Refresh session | 30 days, or until logout, rotation, or password change |
| Email verification token | 24 hours, single use |
| Password reset token | 1 hour, single use |
| Temporary conversation | 24 hours, then the retention job deletes it |
| Saved conversation | Until the owner deletes it or deletes the account |
| Journal and mood | Until the owner deletes the entry or the account |
| Community post the owner deletes | Soft-deleted immediately. After 30 days the retention job replaces the body with “[deleted by member]” |
| Account deletion | Journal, moods, conversations, notices, and sessions are deleted. With “delete community content,” posts and comments are removed too. Otherwise the nickname becomes “Deleted member” and the text remains so other people’s replies still have context |

Expired sessions and used tokens are deleted by a job every six hours while the API process is running. This repository does not configure database backups. A backup you add later would need its own deletion policy.

## Storage limits

- Passwords are hashed with bcrypt.
- Refresh tokens are stored as SHA-256 hashes.
- Phone sign-in tokens use Expo SecureStore on iOS and Android.
- The web build stores those tokens in AsyncStorage and says so. That is not hardware-backed.
- Guest journals and chats use AsyncStorage and are not encrypted.
- MySQL content is protected by authentication and queries scoped to the owner. Disk encryption is a hosting choice this repo does not turn on.
- Logs omit request bodies and query strings.
- Journal text is never sent to a training job. There is no training job in this build.
- Crisis conversation text is not forwarded to a third-party model.

## Notices

Optional notices cover replies, reactions, and circle activity. The text is generic (“Someone left a supportive reply”) so a lock screen does not reveal the post. Account-status messages, such as a suspension or an appeal result, are sent because they are about the account itself. Push delivery is not connected.
