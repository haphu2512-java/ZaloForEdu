import type { Conversation, Message, NotificationItem, UserInfo } from '../types/chat';

type EntityWithId = {
  _id?: string;
  id?: string;
};

export function normalizeEntityId<T extends EntityWithId>(item: T): T & { _id: string; id: string } {
  return {
    ...item,
    _id: item._id || item.id || '',
    id: item.id || item._id || '',
  };
}

export function normalizeUser(user: UserInfo): UserInfo {
  return normalizeEntityId(user);
}

export function normalizeConversation(conversation: Conversation): Conversation {
  return normalizeEntityId(conversation);
}

export function normalizeMessage(message: Message): Message {
  return normalizeEntityId(message);
}

export function normalizeNotification(item: NotificationItem): NotificationItem {
  return normalizeEntityId(item);
}
