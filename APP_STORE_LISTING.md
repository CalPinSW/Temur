# App Store Listing Draft (for review before entering into App Store Connect)

Status: DRAFT — needs your review/edits before submission. Nothing here has been entered into App Store Connect yet.

## App Information

- **Name**: Temur
- **Subtitle** (30 char max): `5-a-side game organizer` (24 chars)
  - Alt: `Organize football games` (24 chars)
- **Primary Category**: Sports
- **Secondary Category**: Social Networking (optional)
- **Bundle ID**: com.calpin.temur
- **SKU**: `temur-ios` (any unique string, not shown to users)
- **Primary Language**: English (U.K.)

## Promotional Text (170 chars, editable anytime without a new review)

> Organize 5-a-side games with friends: create games, manage waitlists, drag-and-drop team assignment, and rate teammates after the match.

## Description (4000 char max)

> Temur makes it easy to organize casual football (5-a-side and beyond) with friends.
>
> **Create and join games**
> Set a kickoff time, pick players-per-team, and invite friends or a group. Players sign up and are automatically waitlisted once a game fills up.
>
> **Groups**
> Create a group for your regular five-a-side crew. Group admins can create games scoped to the group and manage membership.
>
> **Team assignment**
> Drag and drop players onto teams with a visual board, or use simple list-based assignment. Add guest "ringers" to fill numbers.
>
> **Results & ratings**
> Record the final score after the game, and rate your teammates and opponents. See your own rating history over time.
>
> **Friends**
> Find and add friends, send game invites, and keep track of who's playing.
>
> **Notifications**
> Get notified about game invites, team assignments, and when new games become visible to you — so you never miss a signup window.
>
> Temur is free to use.

## Keywords (100 chars, comma-separated, no spaces after commas needed)

`football,5-a-side,soccer,five-a-side,team,sports,organizer,pickup,game,scheduling,waitlist`

(~91 chars — leaves a little room; drop "scheduling" if something better comes up)

## Support URL

`https://github.com/CalPinSW/Temur` — decided.

## Marketing URL

Optional — skipping unless you want the web app's landing page used here.

## Privacy Policy URL

`https://github.com/CalPinSW/Temur/blob/main/PRIVACY_POLICY.md` (already wired up via `EXPO_PUBLIC_PRIVACY_POLICY_URL`, repo is public so this resolves for reviewers)

## Copyright

`© 2026 Calum Pinder` (adjust name/entity as you prefer)

---

# App Privacy ("Nutrition Label") Draft

Based on what the app actually collects (per `PRIVACY_POLICY.md` and the codebase). Enter this under App Store Connect → App Privacy. All categories below: **not used for tracking** (no ad networks, no cross-app/site tracking) — answer "No" to the tracking question entirely.

| Data Type | Collected? | Linked to identity? | Purpose |
|---|---|---|---|
| Email Address | Yes | Yes | App Functionality (auth), Account creation |
| Name | Yes | Yes | App Functionality (display name/username) |
| Photos or Videos | Yes | Yes | App Functionality (avatar upload) |
| User Content (other) | Yes | Yes | App Functionality (games, ratings, friend data) |
| User ID | Yes | Yes | App Functionality |
| Device ID / Push Token | Yes | Yes | App Functionality (push notifications) |
| Crash Data | Yes | No | App Functionality (Sentry error monitoring) |
| Other Diagnostic Data | Yes | No | App Functionality (Sentry) |
| Precise/Coarse Location | No | — | — |
| Contacts | No | — | — |
| Browsing/Search History | No | — | — |
| Financial Info | No | — | — |
| Health & Fitness | No | — | — |

Everything above should be marked **"Used for App Functionality"** only (not Analytics, not Product Personalization, not Third-Party Advertising).

---

## User-generated content & moderation — decided: skip for now

Apple's Guideline 1.2 (User-Generated Content) expects apps with UGC to have *some* combination of content filtering, a report mechanism, and the ability to block abusive users. Temur has usernames, display names, avatars, and player ratings — all UGC, even though it's scoped to friends/groups rather than public.

Decision: no formal "report/block user" feature for this release. Rationale (yours): among a friend group, a report/block button risks being used as a social weapon rather than genuine abuse mitigation — and content here is never public (friends/group-scoped only), with "remove friend" already available as a lighter-weight escape hatch. If Apple review pushes back, the fallback is adding a report path through the existing bug-report pipeline (`send-bug-report`) rather than a user-facing block feature.

## Age Rating

Based on the above (no violence/gambling/mature content, but does have UGC scoped to a closed network), suggested answers on Apple's questionnaire: all content-frequency questions → **None**, User-Generated Content → **Yes**. This typically lands at **4+** or **12+** depending on how Apple's current questionnaire weighs the UGC answer — App Store Connect will compute it live once you answer there.
