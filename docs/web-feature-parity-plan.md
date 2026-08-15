# Web feature parity plan

`apps/web` (Next.js) is a new companion to `apps/mobile` (Expo), sharing the same Supabase project. This tracks what's built vs. outstanding on web, so feature/bugfix work can keep the two apps in lock-step (see the standing rule in `CLAUDE.md`). Update this file when you close a gap or find a new one.

## Built

- **Auth** — email/password sign in, sign up (with username), email-confirmation callback (`app/auth/callback`), sign out. Session managed via `@supabase/ssr` cookies + middleware refresh.
- **Games — list, detail & creation** — upcoming/past games list (`app/(protected)/games`), respecting the same visibility rule as mobile (visible once `visible_at` passes, or always visible to the game's admin). Game detail page with capacity/waitlist display and sign up / withdraw (Server Actions), using `@temur/shared`'s `getGameCapacity`/`getActivePlayers`/`getWaitlistPlayers`/`getNextSignupOrder`/`getPlayerDisplayName`. Create game (`games/new`, optional `?group=<id>` preset from a group's detail page): friends-invite or group mode, default kickoff defaults to the next Saturday not already taken (mirrors mobile's clash-avoidance loop), visible-from date, players-per-team, team names; friends mode sends `game_invite` pushes on create, same as mobile.
- **Results & ratings** — result entry (score or win/draw/loss outcome, `games/[id]/result`) via the `set_game_result` RPC — open to anyone who can view the game, not admin-gated, same as the RPC's own authorization; player ratings 1–10 (own ratings private) via `player_ratings` upsert, aggregate averages on the game detail page's player rows via `get_player_rating_summary`. Entry point only shown once the game's kickoff has passed, matching mobile.
- **Ringers** — on the game detail page (group games only): admin "Open to Ringers" (sends a `ringers_open` push to every group member, mirrors `notifyGroupMembersRingersOpen`), any group member can then "Add a Ringer" with saved-name quick-picks until kickoff, ringer badge + remove button (adder or admin) on player rows. Saved-ringer management (`/friends/ringers`, linked from the Friends page) — add/list/delete names for quick re-add, mirrors mobile's `RingersScreen`.
- **Profile** — view (`app/(protected)/profile`), edit display name/username/avatar (`profile/edit`, avatar via `<input type="file">` uploaded directly to the `avatars` Storage bucket, owner-write RLS already in place), change password (`profile/change-password`, email-auth users only). Uses `@temur/shared`'s `validateUsername`/`formatUsername`/`getInitials` (new — extracted from mobile's duplicated initials logic). Theme toggle and push-notification toggle still outstanding (see below).
- **Friends** — friends list with remove (`app/(protected)/friends`), search + send request (`friends/search`, debounced client-side search calling a Server Action directly), accept/decline incoming requests (`friends/requests`). Sends a `send-notification` push on new request, same as mobile (no-op for users without a push token, so this works even though web itself has no push story yet). Uses `@temur/shared`'s `getInitials`.
- **Groups** — list with pending-invite banner and create group (`app/(protected)/groups`, `groups/new`), group detail with inline admin edit (name/description/team-assignment message template), "Create Game" and leave group (`groups/[id]`), member list with promote/demote/remove (`groups/[id]/members`), invite a friend to the group (`groups/[id]/invite`, admin only) and view/accept/decline incoming group invitations (`groups/invites`), group's upcoming-games list (`groups/[id]/games`). `Group`/`GroupMember(WithProfile)`/`GroupWithRole`/`GroupInvitation(WithDetails)` types moved from mobile-only `types/group.ts` into `@temur/shared` since both apps need them now.

## Outstanding

Each item below references the mobile implementation to mirror (screens/hooks/services under `apps/mobile/src/`).

### Profile (remaining)
- Mirror: `screens/profile/AboutScreen.tsx` — not yet built on web (version/build info + GitHub link); low priority, static content.
- Theme toggle (light/dark/system) — web currently just follows `prefers-color-scheme` via CSS; an explicit toggle needs its own preference storage (e.g. a cookie), separate from mobile's `ThemeContext`.
- Push-notification toggle — blocked on the Notifications item below.

### Team assignment board
- Mirror: `components/team-assignment/TeamAssignmentBoard.tsx`, `hooks/useTeamAssignment.ts`, `screens/main/TeamAssignmentScreen.tsx`.
- Needs a **web-native drag-and-drop** reimplementation — mobile's board uses RN `PanResponder`/`Animated.ValueXY`, which has no web equivalent. Recommend `@dnd-kit/core` (or similar) for the web version. The data model is already shared (`board_x`/`board_y`, `team` columns on `player_games`; `getTeamCounts` util), so only the interaction/rendering layer is new work.
- The simpler list-based team-picker mode (`PlayerAssignmentItem` equivalent) is easy to do first and doesn't need any of this.

### Notifications
- Mobile uses Expo push (native-only, requires a physical device) via `send-notification`/`sweep-visible-games` edge functions.
- Web options to evaluate: Web Push API + a service worker (real push, more setup — VAPID keys, service worker lifecycle), or defer entirely for v1 and rely on realtime in-app badge counts (see below) plus email as the out-of-band channel.
- Either way, `send-notification` will need a second delivery path alongside Expo push once web notifications exist.

### Social sign-in
- Mirror: `services/socialAuthService.ts`, the Google/Apple buttons in `screens/auth/{SignInScreen,SignUpScreen}.tsx`.
- Web uses standard Supabase OAuth redirect flow (`supabase.auth.signInWithOAuth`) rather than `expo-auth-session`'s custom-scheme redirect — simpler than mobile, not blocked on anything.

### Cross-cutting: realtime updates
- Mobile subscribes to `postgres_changes` (games, player_games, friendships, group_invitations, game_invitations) to live-update lists and tab badge counts. Web's current pages are plain Server Components that only refresh on navigation/`revalidatePath` after a mutation.
- Decide per-feature whether web needs live updates (e.g. a client-side Supabase subscription that calls `router.refresh()`) or whether request-time freshness is good enough — start without it and add where it's actually missed.
