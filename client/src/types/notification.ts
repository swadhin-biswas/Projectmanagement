export type NotificationType =
  | 'team_invitation'
  | 'team_announcement'
  | 'team_message'
  | 'team_member_joined'
  | 'team_member_left'
  | 'project_feedback'
  | 'supervisor_assigned'
  | 'deadline_reminder'
  | 'session_update';

export interface NotificationAction {
  label: string;
  onClick: () => void;
  href?: string;
}

export interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  user: string;
  from?: {
    _id: string;
    fullName: string;
    role: string;
  };
  team?: {
    _id: string;
    name: string;
  };
  project?: {
    _id: string;
    name: string;
  };
  isRead: boolean;
  link?: string;
  createdAt: string;
  expiresAt?: string;
  action?: NotificationAction;
  meta?: Record<string, unknown>;
}

export interface NotificationContext {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  NotificationIcon: React.FC;
}

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
}

export interface NotificationPayload {
  title: string;
  message: string;
  type: NotificationType;
  userId: string;
  from?: string;
  teamId?: string;
  projectId?: string;
  link?: string;
  expiresAt?: string;
}