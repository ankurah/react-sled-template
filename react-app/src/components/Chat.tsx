import { useMemo, useEffect, useLayoutEffect } from "react";
import {
    User,
    ctx,
    JsValueRead,
    RoomView,
    UserView,
} from "ankurah-template-wasm-bindings";
import { MessageRow } from "./MessageRow";
import { MessageInput } from "./MessageInput";
import { ChatDebugHeader } from "./ChatDebugHeader";
import { signalObserver } from "../utils";
import { ChatScrollManager } from "../ChatScrollManager";
import "./Chat.css";

interface ChatProps {
    room: JsValueRead<RoomView | null>;
    currentUser: JsValueRead<UserView | null>;
}

export const Chat: React.FC<ChatProps> = signalObserver(({ room, currentUser }) => {
    const currentRoom = room.get();
    const user = currentUser.get();

    // Create scroll manager when room changes
    const manager = useMemo(() => {
        if (!currentRoom) return null;
        return new ChatScrollManager(currentRoom.id.to_base64());
    }, [currentRoom]);

    // Query for all users
    const users = useMemo(() => User.query(ctx(), ""), []);

    // Access messages directly for observer tracking
    const messageList = manager?.items || [];
    const showJumpToCurrent = manager?.mode.get() !== 'live';

    // Cleanup on unmount or room change
    useEffect(() => () => manager?.destroy(), [manager]);

    // Handle initialization and autoscroll in live mode
    useLayoutEffect(() => manager?.afterLayout());

    if (!currentRoom) {
        return (
            <div className="chatContainer">
                <div className="emptyState">Select a room to start chatting</div>
            </div>
        );
    }

    return (
        <div className="chatContainer">
            {manager && <ChatDebugHeader manager={manager} />}

            <div className="messagesContainer" ref={manager?.bindContainer}>
                {messageList.length === 0 ? (
                    <div className="emptyState">No messages yet. Be the first to say hello!</div>
                ) : (
                    messageList.map((message) => (
                        <MessageRow
                            key={message.id.toString()}
                            message={message}
                            users={users}
                        />
                    ))
                )}
            </div>

            {showJumpToCurrent && (
                <button
                    className="jumpToCurrent"
                    onClick={() => manager?.setLiveMode()}
                >
                    Jump to Current ↓
                </button>
            )}

            <MessageInput room={currentRoom} currentUser={user} />
        </div>
    );
});
