import { useMemo } from "react";
import {
  MessageView,
  UserView,
  UserLiveQuery,
} from "ankurah-template-wasm-bindings";
import { signalObserver } from "../utils";
import "./MessageRow.css";

interface MessageRowProps {
  message: MessageView;
  users: UserLiveQuery;
}

export const MessageRow: React.FC<MessageRowProps> = signalObserver(({ message, users }) => {
  const author = useMemo(() => {
    const userList = (users.resultset.items || []) as UserView[];
    return userList.find(u => u.id.to_base64() === message.user);
  }, [users.resultset.items, message.user]);

  const formatTimestamp = (timestamp: bigint): string => {
    const date = new Date(Number(timestamp));
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="messageBubble" data-msg-id={message.id.to_base64()}>
      <div className="messageHeader">
        <span className="messageAuthor">{author?.display_name || "Unknown"}</span>
        <span className="messageTime">
          {formatTimestamp(message.timestamp)}
          <span style={{ fontSize: '9px', color: '#a0aec0', marginLeft: '4px' }}>
            {message.timestamp.toString()}
          </span>
        </span>
      </div>
      <div className="messageText">{message.text}</div>
    </div>
  );
});
