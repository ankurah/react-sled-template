import { useState } from "react";
import {
    Message,
    ctx,
    ws_client,
    RoomView,
    UserView,
} from "ankurah-template-wasm-bindings";
import "./MessageInput.css";

interface MessageInputProps {
    room: RoomView;
    currentUser: UserView | null;
}

export const MessageInput: React.FC<MessageInputProps> = ({ room, currentUser }) => {
    const [messageInput, setMessageInput] = useState("");
    const connectionState = ws_client().connection_state.value?.value();

    const handleSendMessage = async () => {
        if (!messageInput.trim() || !currentUser) {
            console.log("Cannot send:", { hasInput: !!messageInput.trim(), hasUser: !!currentUser });
            return;
        }

        console.log("Sending message:", {
            user: currentUser.id.to_base64(),
            room: room.id.to_base64(),
            text: messageInput.trim(),
            timestamp: Date.now(),
        });

        try {
            const transaction = ctx().begin();
            const msg = await Message.create(transaction, {
                user: currentUser.id.to_base64(),
                room: room.id.to_base64(),
                text: messageInput.trim(),
                timestamp: Date.now(),
            });
            console.log("Message created:", msg);
            await transaction.commit();
            console.log("Transaction committed");
            setMessageInput("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="inputContainer">
            <input
                type="text"
                className="input"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={connectionState !== "Connected"}
            />
            <button
                className="button"
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || connectionState !== "Connected"}
            >
                Send
            </button>
        </div>
    );
};
