import { useMemo, useEffect, useState } from "react";
import {
    User,
    Message,
    ctx,
    JsValueRead,
    JsValueMut,
    RoomView,
    UserView,
    MessageView,
    MessageLiveQuery,
    MessageScrollManager,
    SubscriptionGuard,
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

/**
 * Wrapper around the Rust MessageScrollManager that handles browser DOM-specific
 * container binding and scroll event handling.
 */
class ScrollManagerWrapper {
    private scrollManager: MessageScrollManager | null = null;
    private liveQuery: MessageLiveQuery | null = null;
    private subscriptionGuard: SubscriptionGuard | null = null;
    private container: HTMLDivElement | null = null;
    private scrollHandler: (() => void) | null = null;
    private wheelHandler: (() => void) | null = null;
    private touchStartHandler: (() => void) | null = null;
    private viewportHeight = 600;
    private lastScrollTop = 0;
    private userScrolling = false;
    private initialized = false;
    private listeners = new Set<() => void>();
    private _displayMessages: MessageView[] = [];
    private _mode: string = 'Live';

    constructor(
        private roomId: string,
        private notificationManager: NotificationManager
    ) {
        this.init();
    }

    private init() {
        const basePredicate = `room = '${this.roomId}' AND deleted = false`;
        const initialSelection = `${basePredicate} ORDER BY timestamp DESC LIMIT 50`;

        // Create LiveQuery with initial selection
        this.liveQuery = Message.query(ctx(), initialSelection);

        // Create Rust scroll manager
        this.scrollManager = new MessageScrollManager(
            this.liveQuery,
            basePredicate,
            this.viewportHeight
        );

        // Subscribe to LiveQuery changes
        this.subscriptionGuard = this.liveQuery.subscribe(() => {
            // Defer to next frame so DOM has updated
            setTimeout(() => this.onLiveQueryChange(), 0);
        });

        // Set as active room since rooms start in live mode
        this.notificationManager.setActiveRoom(this.roomId);

        // Initial load
        this.onLiveQueryChange();
    }

    private onLiveQueryChange() {
        if (!this.scrollManager || !this.liveQuery) return;

        // Get items (already in display order from Rust) and compute timestamps
        const items = this.scrollManager.items;
        const count = items.length;

        let oldestTimestamp: bigint | undefined;
        let newestTimestamp: bigint | undefined;

        if (count > 0) {
            const timestamps = items.map(m => m.timestamp);
            oldestTimestamp = timestamps.reduce((a, b) => a < b ? a : b);
            newestTimestamp = timestamps.reduce((a, b) => a > b ? a : b);
        }

        // Notify Rust scroll manager about results for boundary detection
        this.scrollManager.onResults(count, oldestTimestamp, newestTimestamp);

        // Update state
        this._mode = this.scrollManager.mode;
        this._displayMessages = items;

        // Handle auto-scroll
        if (this.shouldAutoScroll && this._mode === 'Live') {
            this.scrollToBottom();
        }

        this.notify();
    }

    private notify() {
        this.listeners.forEach(l => l());
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    get items(): MessageView[] {
        return this._displayMessages;
    }

    get mode(): string {
        return this._mode;
    }

    get isLoading(): boolean {
        return this.scrollManager?.isLoading() ?? false;
    }

    get shouldAutoScroll(): boolean {
        return this.scrollManager?.shouldAutoScroll() ?? false;
    }

    get atEarliest(): boolean {
        return this.scrollManager?.atEarliest() ?? false;
    }

    get atLatest(): boolean {
        return this.scrollManager?.atLatest() ?? true;
    }

    get debugMetrics(): string {
        return this.scrollManager?.debugMetrics() ?? '';
    }

    bindContainer = (container: HTMLDivElement | null) => {
        if (this.container === container) return;

        // Remove old handlers
        if (this.container) {
            if (this.scrollHandler) {
                this.container.removeEventListener('scroll', this.scrollHandler);
            }
            if (this.wheelHandler) {
                this.container.removeEventListener('wheel', this.wheelHandler);
            }
            if (this.touchStartHandler) {
                this.container.removeEventListener('touchstart', this.touchStartHandler);
            }
        }

        this.container = container;

        if (container) {
            this.lastScrollTop = container.scrollTop;
            this.viewportHeight = container.clientHeight;

            this.scrollHandler = () => this.onScroll();
            this.wheelHandler = () => this.onUserScroll();
            this.touchStartHandler = () => this.onUserScroll();

            container.addEventListener('scroll', this.scrollHandler, { passive: true });
            container.addEventListener('wheel', this.wheelHandler, { passive: true });
            container.addEventListener('touchstart', this.touchStartHandler, { passive: true });

            // Initial scroll and setup
            if (!this.initialized) {
                this.initialized = true;
                if (this._mode === 'Live') {
                    setTimeout(() => this.scrollToBottom(), 100);
                }
            }
        } else {
            this.scrollHandler = null;
            this.wheelHandler = null;
            this.touchStartHandler = null;
        }
    };

    private onUserScroll() {
        this.userScrolling = true;
    }

    private async onScroll() {
        if (!this.container || !this.scrollManager) return;

        const { scrollTop, scrollHeight, clientHeight } = this.container;
        const scrollDelta = scrollTop - this.lastScrollTop;
        this.lastScrollTop = scrollTop;

        // Call Rust scroll manager
        await this.scrollManager.onScroll(
            scrollTop,
            scrollHeight,
            clientHeight,
            scrollDelta,
            this.userScrolling
        );

        this.userScrolling = false;

        // Update mode in case it changed
        this._mode = this.scrollManager.mode;

        // Update notification manager based on mode
        if (this._mode === 'Live') {
            this.notificationManager.setActiveRoom(this.roomId);
        } else {
            this.notificationManager.setActiveRoom(null);
        }

        this.notify();
    }

    async jumpToLive() {
        if (!this.scrollManager) return;
        await this.scrollManager.jumpToLive();
        this._mode = this.scrollManager.mode;
        this.notificationManager.setActiveRoom(this.roomId);
        this.notify();
        this.scrollToBottom();
    }

    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    onMessageSent() {
        if (this._mode === 'Live') {
            setTimeout(() => this.scrollToBottom(), 100);
        }
    }

    destroy() {
        if (this.container) {
            if (this.scrollHandler) {
                this.container.removeEventListener('scroll', this.scrollHandler);
            }
            if (this.wheelHandler) {
                this.container.removeEventListener('wheel', this.wheelHandler);
            }
            if (this.touchStartHandler) {
                this.container.removeEventListener('touchstart', this.touchStartHandler);
            }
        }
        this.subscriptionGuard?.free();
        this.scrollManager?.free();
        this.liveQuery = null;
        this.scrollManager = null;
        this.container = null;
        this.listeners.clear();
    }
}

export const Chat: React.FC<ChatProps> = signalObserver(({ room, currentUser, notificationManager }) => {
    const currentRoom = room.get();
    const user = currentUser.get();

    const { showDebug, toggleDebug } = useDebugMode();

    // State for editing messages
    const editingMessageMut = useMemo(() => new JsValueMut<MessageView | null>(null), []);
    const editingMessage = editingMessageMut.get();

    // State to trigger re-renders when scroll manager updates
    const [, forceUpdate] = useState({});

    // Create scroll manager when room changes
    const manager = useMemo(() => {
        if (!currentRoom || !notificationManager) return null;
        return new ScrollManagerWrapper(currentRoom.id.to_base64(), notificationManager);
    }, [currentRoom, notificationManager]);

    // Subscribe to manager updates
    useEffect(() => {
        if (!manager) return;
        return manager.subscribe(() => forceUpdate({}));
    }, [manager]);

    // Query for all users
    const users = useMemo(() => User.query(ctx(), ""), []);

    // Access messages directly for observer tracking
    const messageList = manager?.items || [];
    const showJumpToCurrent = manager ? !manager.shouldAutoScroll && manager.mode !== 'Live' : false;
    const currentUserId = user?.id || null;

    // Cleanup on unmount or room change
    useEffect(() => () => manager?.destroy(), [manager]);

    if (!currentRoom) {
        return (
            <div className="chatContainer">
                <div className="emptyState">Select a room to start chatting</div>
            </div>
        );
    }

    return (
        <div className="chatContainer">
            {manager && showDebug && <ChatDebugHeader manager={manager} />}

            {manager && (
                <button
                    className="debugToggle"
                    onClick={toggleDebug}
                    title={showDebug ? "Hide debug info" : "Show debug info"}
                    style={{ opacity: 0.35 }}
                >
                    {showDebug ? "▼" : "▲"}
                </button>
            )}

            <div className="messagesContainer" ref={manager?.bindContainer}>
                {messageList.length === 0 ? (
                    <div className="emptyState">No messages yet. Be the first to say hello!</div>
                ) : (
                    messageList.map((message) => (
                        <MessageRow
                            key={message.id.toString()}
                            message={message}
                            users={users}
                            currentUserId={currentUserId}
                            editingMessage={editingMessage}
                            editingMessageMut={editingMessageMut}
                        />
                    ))
                )}
            </div>

            {showJumpToCurrent && (
                <button
                    className="jumpToCurrent"
                    onClick={() => manager?.jumpToLive()}
                >
                    Jump to Current ↓
                </button>
            )}

            <MessageInput
                room={currentRoom}
                currentUser={user}
                editingMessageMut={editingMessageMut}
                manager={manager}
            />
        </div>
    );
});
