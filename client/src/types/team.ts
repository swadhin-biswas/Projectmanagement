export type TeamMemberStatus = 'active' | 'pending' | 'inactive' | 'on_leave';
export type TeamMemberRole = 'leader' | 'co_leader' | 'member';

export interface TeamMember {
  _id: string;
  user: {
    _id: string;
    fullName: string;
    email: string;
    profilePicture?: string;
  };
  role: TeamMemberRole;
  status: TeamMemberStatus;
  joinedAt: string;
  specialization?: string;
}

export interface TeamProject {
  _id: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed';
  progress: number;
  startDate: string;
  endDate?: string;
  supervisor?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

export interface TeamInvitation {
  _id: string;
  team: string;
  invitedBy: {
    _id: string;
    fullName: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'declined' | 'expired';
  createdAt: string;
  expiresAt: string;
  inviteMessage?: string;
  respondedAt?: string;
}

export interface Team {
  _id: string;
  name: string;
  description?: string;
  leader: string;
  members: TeamMember[];
  project?: TeamProject;
  createdAt: string;
  updatedAt: string;
  maxMembers: number;
  invitations: TeamInvitation[];
  chatMessages: ChatMessage[];
  status: 'forming' | 'active' | 'inactive' | 'completed' | 'dissolved';
  session: string;
}

export interface CreateTeamData {
  name: string;
  description?: string;
  projectName?: string;
  projectDescription?: string;
}

export interface UpdateTeamData {
  name?: string;
  description?: string;
  maxMembers?: number;
}

export interface TeamContext {
  team: Team | null;
  isLoading: boolean;
  error: Error | null;
  createTeam: (data: CreateTeamData) => Promise<void>;
  updateTeam: (data: UpdateTeamData) => Promise<void>;
  sendInvite: (userId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  leaveTeam: () => Promise<void>;
  changeLeader: (newLeaderId: string) => Promise<void>;
  respondToInvite: (data: { inviteId: string; accept: boolean }) => Promise<void>;
  refetch: () => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isSendingInvite: boolean;
  isRemoving: boolean;
  isLeaving: boolean;
  isChangingLeader: boolean;
  isRespondingToInvite: boolean;
}

export interface TeamInvite {
  _id: string;
  team: {
    _id: string;
    name: string;
  };
  invitedBy: {
    _id: string;
    fullName: string;
  };
  status: 'pending' | 'accepted' | 'declined';
  expiresAt: string;
  createdAt: string;
}

export interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    profilePicture?: string;
  };
  content: string;
  timestamp: string;
  readBy: string[];
  isAnnouncement: boolean;
  status?: 'sending' | 'sent' | 'error';
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  url: string;
  type: 'image' | 'file';
  name: string;
  size?: number;
}

export interface TeamResponse {
  success: boolean;
  team: Team;
  message?: string;
}

export interface InvitesResponse {
  success: boolean;
  invites: TeamInvite[];
}

export interface ChatResponse {
  success: boolean;
  messages: ChatMessage[];
}

// Request/Response types
export interface SendMessageRequest {
  content: string;
  isAnnouncement?: boolean;
  attachments?: {
    url: string;
    type: string;
    name: string;
  }[];
}

export interface SendInviteRequest {
  studentId: string;
  message?: string;
}

export interface InviteResponse {
  accept: boolean;
  message?: string;
}

// WebSocket Event Types
export interface TeamChatEvent {
  type: 'team:message' | 'team:announcement';
  teamId: string;
  message: ChatMessage;
}

export interface UserTypingEvent {
  type: 'team:userTyping';
  teamId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface MessageReadEvent {
  type: 'team:messageRead';
  teamId: string;
  messageId: string;
  userId: string;
  timestamp: string;
}