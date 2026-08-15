import { FriendSearch } from './FriendSearch';

export default function FriendSearchPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-lg font-semibold text-text">Find Friends</h1>
      <FriendSearch />
    </div>
  );
}
