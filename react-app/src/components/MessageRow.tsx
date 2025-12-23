import { useMemo, useState } from "react";
import {
  MessageView,
  UserView,
  UserLiveQuery,
  JsValueMut,
  EntityId,
} from "ankurah-template-wasm-bindings";
import { signalObserver } from "../utils";
import { MessageContextMenu } from "./MessageContextMenu";
import "./MessageRow.css";

interface MessageRowProps {
  message: MessageView;
  users: UserLiveQuery;
  currentUserId: EntityId | null;
  editingMessage: MessageView | null;
  editingMessageMut: JsValueMut<MessageView | null>;
}

export const MessageRow: React.FC<MessageRowProps> = signalObserver(({ message, users, currentUserId, editingMessage, editingMessageMut }) => {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Look up the message author using the typed reference
  const author = useMemo(() => {
    return users.resultset.by_id(message.user.id) as UserView | undefined;
  }, [users.resultset, message.user]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentUserId && message.user.id.equals(currentUserId)) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    }
  };

  const isEditing = editingMessage && message.id.equals(editingMessage.id);
  const isOwnMessage = currentUserId && message.user.id.equals(currentUserId);

  return (
    <div
      className={`messageBubble ${isEditing ? 'editing' : ''} ${isOwnMessage ? 'ownMessage' : ''}`}
      data-msg-id={message.id.to_base64()}
      onContextMenu={handleContextMenu}
    >
      {!isOwnMessage && (
        <div className="messageHeader">
          <span className="messageAuthor">{author?.display_name || "Unknown"}</span>
        </div>
      )}
      <div className="messageText">{message.text}</div>
      {contextMenu && (
        <MessageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          message={message}
          editingMessageMut={editingMessageMut}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});
