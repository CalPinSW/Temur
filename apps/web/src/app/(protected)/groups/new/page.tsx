import { CreateGroupForm } from './CreateGroupForm';

export default function CreateGroupPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-text">Create Group</h1>
        <p className="text-sm text-text-secondary">
          You&apos;ll be the first admin. Invite others and create games for the group afterwards.
        </p>
      </div>
      <CreateGroupForm />
    </div>
  );
}
