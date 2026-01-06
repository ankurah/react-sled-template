import "./ChatDebugHeader.css";

interface ChatDebugHeaderProps {
    mode: string;
    isLoading: boolean;
    hasMoreOlder: boolean;
    hasMoreNewer: boolean;
    shouldAutoScroll: boolean;
    itemCount: number;
}

export const ChatDebugHeader: React.FC<ChatDebugHeaderProps> = ({
    mode,
    isLoading,
    hasMoreOlder,
    hasMoreNewer,
    shouldAutoScroll,
    itemCount,
}) => {
    return (
        <div className="debugHeader">
            <div className="debugRow">
                <span className="debugLabel">Mode:</span>
                <span className={`debugValue mode-${mode.toLowerCase()}`}>{mode}</span>
                <span className="debugLabel">Loading:</span>
                <span className="debugValue">{isLoading ? 'yes' : 'no'}</span>
                <span className="debugLabel">Items:</span>
                <span className="debugValue">{itemCount}</span>
            </div>
            <div className="debugRow">
                <span className="debugLabel">More older:</span>
                <span className="debugValue">{hasMoreOlder ? 'yes' : 'no'}</span>
                <span className="debugLabel">More newer:</span>
                <span className="debugValue">{hasMoreNewer ? 'yes' : 'no'}</span>
                <span className="debugLabel">Auto-scroll:</span>
                <span className="debugValue">{shouldAutoScroll ? 'yes' : 'no'}</span>
            </div>
        </div>
    );
};
