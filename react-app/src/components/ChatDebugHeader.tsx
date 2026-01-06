import "./ChatDebugHeader.css";

interface ScrollManagerDebug {
    mode: string;
    isLoading: boolean;
    atEarliest: boolean;
    atLatest: boolean;
    debugMetrics: string;
}

interface ChatDebugHeaderProps {
    manager: ScrollManagerDebug;
}

export const ChatDebugHeader: React.FC<ChatDebugHeaderProps> = ({ manager }) => {
    const mode = manager.mode;
    const loading = manager.isLoading;
    const atEarliest = manager.atEarliest;
    const atLatest = manager.atLatest;
    const debugMetrics = manager.debugMetrics;

    return (
        <div className="debugHeader">
            <div className="debugRow">
                <span className="debugLabel">Mode:</span>
                <span className={`debugValue mode-${mode.toLowerCase()}`}>{mode}</span>
                <span className="debugLabel">Loading:</span>
                <span className="debugValue">{loading ? 'yes' : 'no'}</span>
            </div>
            <div className="debugRow">
                <span className="debugLabel">Metrics:</span>
                <span className="debugValue">{debugMetrics}</span>
            </div>
            <div className="debugRow">
                <span className="debugLabel">Boundaries:</span>
                <span className={`debugValue ${atEarliest ? 'boundary-hit' : ''}`}>
                    {atEarliest ? '⊣ earliest' : '← earliest'}
                </span>
                <span className={`debugValue ${atLatest ? 'boundary-hit' : ''}`}>
                    {atLatest ? 'latest ⊢' : 'latest →'}
                </span>
            </div>
        </div>
    );
};

