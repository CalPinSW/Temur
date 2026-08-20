export type GroupRole = 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  team_assignment_message_template: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupRole;
  created_at: string;
  updated_at: string;
}

export interface GroupMemberWithProfile extends GroupMember {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface GroupWithRole extends Group {
  myRole: GroupRole;
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string;
  created_at: string;
}

export interface GroupInvitationWithDetails extends GroupInvitation {
  group: {
    id: string;
    name: string;
  };
  inviter: {
    id: string;
    username: string;
    display_name: string | null;
  };
}

export interface GroupJoinLink {
  token: string;
  expires_at: string;
}

export interface GroupJoinLinkInfo {
  group_id: string;
  group_name: string;
}
