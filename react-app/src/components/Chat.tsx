import { useMemo, useEffect, useRef, useCallback } from "react";
import {
    User, ctx, JsValueRead, JsValueMut, RoomView, UserView, MessageView, MessageScrollManager,
} from "ankurah-template-wasm-bindings";
import { MessageRow } from "./MessageRow";
import { MessageInput } from "./MessageInput";
import { ChatDebugHeader } from "./ChatDebugHeader";
import { signalObserver } from "../utils";
import { NotificationManager } from "../NotificationManager";
import { useDebugMode } from "../hooks/useDebugMode";
import "./Chat.css";

interface ChatProps {
    room: JsValueRead<RoomView | null>;
    currentUser: JsValueRead<UserView | null>;
    notificationManager: NotificationManager | null;
}

export const Chat: React.FC<ChatProps> = signalObserver(({ room, currentUser, notificationManager }) => {
    const currentRoom = room.get();
    const user = currentUser.get();
    const roomId = currentRoom?.id.to_base64() ?? null;
    const { showDebug, toggleDebug } = useDebugMode();

    const editingMessageMut = useMemo(() => new JsValueMut<MessageView | null>(null), []);
    const editingMessage = editingMessageMut.get();

    const containerRef = useRef<HTMLDivElement | null>(null);
    const lastScrollTopRef = useRef(0);
    const manager = useMemo(() => {
        if (!roomId) return null;
        const m = new MessageScrollManager(ctx(), `room = '${roomId}' AND deleted = false`, 'timestamp DESC');
        m.start();
        return m;
    }, [roomId]);

    const visibleSet = useMemo(() => manager?.visibleSet() ?? null, [manager])?.get() ?? null;
    const users = useMemo(() => User.query(ctx(), ""), []);

    const scrollToBottom = useCallback(() => {
        if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, []);

    const bindContainer = useCallback((el: HTMLDivElement | null) => {
        containerRef.current = el;
        if (el && manager) {
            manager.setViewportHeight(el.clientHeight);
            lastScrollTopRef.current = el.scrollTop;
        }
    }, [manager]);

    const handleScroll = useCallback(async () => {
        if (!manager || !containerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        const scrollingUp = scrollTop < lastScrollTopRef.current;
        lastScrollTopRef.current = scrollTop;
        await manager.onScroll(scrollTop, scrollHeight - scrollTop - clientHeight, scrollingUp);
        notificationManager?.setActiveRoom(manager.mode === 'Live' ? roomId : null);
    }, [manager, notificationManager, roomId]);

    const handleJumpToLive = useCallback(async () => {
        await manager?.jumpToLive();
        notificationManager?.setActiveRoom(roomId);
        scrollToBottom();
    }, [manager, notificationManager, roomId, scrollToBottom]);

    const handleMessageSent = useCallback(() => {
        if (manager?.mode === 'Live') setTimeout(scrollToBottom, 100);
    }, [manager, scrollToBottom]);

    useEffect(() => {
        if (visibleSet?.shouldAutoScroll() && manager?.mode === 'Live') scrollToBottom();
    }, [visibleSet, manager, scrollToBottom]);

    useEffect(() => {
        if (manager?.mode === 'Live' && notificationManager && roomId) notificationManager.setActiveRoom(roomId);
    }, [manager, notificationManager, roomId]);

    const messages = visibleSet?.items ?? [];
    const showJumpToCurrent = manager && visibleSet && !visibleSet.shouldAutoScroll() && manager.mode !== 'Live';

    if (!currentRoom) {
        return <div className="chatContainer"><div className="emptyState">Select a room to start chatting</div></div>;
    }

    return (
        <div className="chatContainer">
            {manager && showDebug && (
                <ChatDebugHeader
                    mode={manager.mode}
                    isLoading={manager.isLoading()}
                    hasMoreOlder={visibleSet?.hasMoreOlder() ?? false}
                    hasMoreNewer={visibleSet?.hasMoreNewer() ?? false}
                    shouldAutoScroll={visibleSet?.shouldAutoScroll() ?? false}
                    itemCount={messages.length}
                />
            )}
            {manager && (
                <button className="debugToggle" onClick={toggleDebug} title={showDebug ? "Hide debug info" : "Show debug info"} style={{ opacity: 0.35 }}>
                    {showDebug ? "v" : "^"}
                </button>
            )}
            <div className="messagesContainer" ref={bindContainer} onScroll={handleScroll}>
                {messages.length === 0
                    ? <div className="emptyState">No messages yet. Be the first to say hello!</div>
                    : messages.map((msg) => (
                        <MessageRow key={msg.id.toString()} message={msg} users={users} currentUserId={user?.id || null} editingMessage={editingMessage} editingMessageMut={editingMessageMut} />
                    ))}
            </div>
            {showJumpToCurrent && <button className="jumpToCurrent" onClick={handleJumpToLive}>Jump to Current v</button>}
            <MessageInput room={currentRoom} currentUser={user} editingMessageMut={editingMessageMut} messages={messages} onMessageSent={handleMessageSent} />
        </div>
    );
});
