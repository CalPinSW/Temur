-- friendships.UNIQUE(user_id, friend_id) only blocks an exact repeat of the
-- same directed pair — it does not stop B from separately inserting
-- (user_id=B, friend_id=A) when (user_id=A, friend_id=B) already exists
-- (accepted or otherwise). That could previously happen from the friend
-- search screens, which only tracked "already sent" in local component
-- state rather than reading real friendship status, so a user could re-add
-- someone they were already friends with and end up with two rows for the
-- same pair. Clean up any such existing duplicates first (keeping the most
-- recently updated row per unordered pair), then add a real per-pair
-- uniqueness constraint.
DELETE FROM friendships f
USING friendships f2
WHERE f.id <> f2.id
  AND LEAST(f.user_id, f.friend_id) = LEAST(f2.user_id, f2.friend_id)
  AND GREATEST(f.user_id, f.friend_id) = GREATEST(f2.user_id, f2.friend_id)
  AND (f.updated_at, f.id) < (f2.updated_at, f2.id);

CREATE UNIQUE INDEX friendships_unique_pair_idx
  ON friendships (LEAST(user_id, friend_id), GREATEST(user_id, friend_id));
