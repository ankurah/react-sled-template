import { useMemo } from "react";
import { ws_client, JsValueRead, UserView } from "ankurah-template-wasm-bindings";
import { signalObserver } from "../utils";
import { EditableTextField } from "./EditableTextField";
import "./Header.css";

interface HeaderProps {
    currentUser: JsValueRead<UserView | null>;
}

export const Header: React.FC<HeaderProps> = signalObserver(({ currentUser }) => {
    const connectionState = useMemo(() => ws_client().connection_state, []);
    const connectionStatus = connectionState.value.value();
    const user = currentUser.get();

    return (
        <div className="header">
            <h1 className="title">ankurah-template Chat</h1>
            <div className="headerRight">
                <div className="userInfo">
                    <span>👤</span>
                    {user ?
                        <EditableTextField view={user} field="display_name" className="userName" />
                        :
                        <span className="userName">Loading...</span>
                    }
                </div>
                <div className={`connectionStatus ${connectionStatus === "Connected" ? 'connected' : 'disconnected'}`}>
                    {connectionStatus || "Disconnected"}
                </div>
            </div>
        </div>
    );
});

