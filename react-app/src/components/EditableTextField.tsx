import { useState, useRef, useEffect } from "react";
import { ctx, Transaction, YrsStringString } from "ankurah-template-wasm-bindings";
import { signalObserver } from "../utils";
import "./EditableTextField.css";

// View with a string field K that edits to a Mutable with YrsStringString at K
type EditableStringView<K extends string> =
    Record<K, string | undefined> &
    { edit(trx: Transaction): Record<K, YrsStringString> };

interface Props<K extends string> {
    view: EditableStringView<K>;
    field: K;
    placeholder?: string;
    className?: string;
}

function EditableTextFieldBase<K extends string>({
    view,
    field,
    placeholder = "Click to edit",
    className = ""
}: Props<K>) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState("");
    const [cursorPos, setCursorPos] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const lastValueRef = useRef("");

    const currentValue = view[field] ?? "";

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(cursorPos, cursorPos);
        }
    }, [isEditing, cursorPos]);

    const startEdit = () => {
        if (!view) return;
        const value = String(currentValue);
        setLocalValue(value);
        lastValueRef.current = value;
        setCursorPos(value.length);
        setIsEditing(true);
    };

    const applyChanges = (oldValue: string, newValue: string) => {
        const trx = ctx().begin();
        const mutable = view.edit(trx);
        const yrsString = mutable[field];

        // Find where strings differ
        let i = 0;
        const minLen = Math.min(oldValue.length, newValue.length);
        while (i < minLen && oldValue[i] === newValue[i]) i++;

        // Delete remainder of old, insert remainder of new
        const deleteCount = oldValue.length - i;
        if (deleteCount > 0) yrsString.delete(i, deleteCount);

        const insertText = newValue.slice(i);
        if (insertText) yrsString.insert(i, insertText);

        trx.commit();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        const newCursorPos = e.target.selectionStart || 0;

        applyChanges(lastValueRef.current, newValue);

        setLocalValue(newValue);
        lastValueRef.current = newValue;
        setCursorPos(newCursorPos);
    };

    const endEdit = () => {
        setIsEditing(false);
        setLocalValue("");
        lastValueRef.current = "";
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            endEdit();
        }
    };

    return isEditing ? (
        <input
            ref={inputRef}
            type="text"
            className={`editableInput ${className}`}
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={endEdit}
        />
    ) : (
        <span className={`editableText ${className}`} onClick={startEdit} title={placeholder}>
            {currentValue || placeholder}
        </span>
    );
}

// Cast to preserve generic type parameter through signalObserver HOC
export const EditableTextField = signalObserver(EditableTextFieldBase) as typeof EditableTextFieldBase;

