"use client";

import React, {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

export type MentionUser = {
    id: string; // Clerk user id
    name: string;
    email?: string;
    username?: string | null;
    image_url?: string | null;
};

export type MentionRef = {
    userId: string;
    name: string;
};

type Props = {
    value: string;
    setValue: (value: string) => void;
    onChange: (value: string) => void;
    mentions: MentionRef[];
    onMentionsChange: (mentions: MentionRef[]) => void;
    users: MentionUser[];
    placeholder?: string;
    className?: string;
    rows?: number;
    disabled?: boolean;
};

export function MentionTextarea({
    value,
    setValue,
    users,
    placeholder = "Type @ to mention someone...",
    onChange,
    mentions,
    onMentionsChange,
    className = "",
}: Props) {
    // const [value, setValue] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionStart, setMentionStart] = useState<number | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Filter users based on the text after @
    const filteredUsers = users.filter((user: MentionUser) => {
        const q = query.toLowerCase();
        return (
            user?.username?.toLowerCase().includes(q) ||
            user?.name?.toLowerCase().includes(q)
        );
    });

    // Detect @ mention as the user types
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart;

        setValue(newValue);
        onChange?.(newValue);

        // Look backwards from cursor for the nearest @
        const textBeforeCursor = newValue.slice(0, cursorPos);
        const atIndex = textBeforeCursor.lastIndexOf("@");

        if (atIndex !== -1) {
            const textAfterAt = textBeforeCursor.slice(atIndex + 1);

            // Only treat as a mention if there's no space after the @
            if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
                setMentionStart(atIndex);
                setQuery(textAfterAt);
                setShowSuggestions(true);
                setSelectedIndex(0);
                return;
            }
        }

        // No active mention
        setShowSuggestions(false);
        setQuery("");
        setMentionStart(null);
    };

    // Insert the selected mention
    const insertMention = useCallback(
        (user: MentionUser) => {
            if (mentionStart === null || !textareaRef.current) return;

            const before = value.slice(0, mentionStart);
            const after = value.slice(textareaRef.current.selectionStart);
            const mentionText = `@${user.username} `;

            const newValue = before + mentionText + after;
            setValue(newValue);
            onChange?.(newValue);

            // Dedupe by userId
            const nextMentions = [
                ...mentions.filter((m) => m.userId !== user.id),
                { userId: user.id, name: user.name },
            ];
            onMentionsChange(nextMentions);

            setShowSuggestions(false);
            setQuery("");
            setMentionStart(null);

            // Restore focus and place cursor after the inserted mention
            requestAnimationFrame(() => {
                if (textareaRef.current) {
                    const newCursorPos = before.length + mentionText.length;
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            });
        },
        [mentionStart, value, onChange]
    );

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!showSuggestions || filteredUsers.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) =>
                prev < filteredUsers.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) =>
                prev > 0 ? prev - 1 : filteredUsers.length - 1
            );
        } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            insertMention(filteredUsers[selectedIndex]);
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
        }
    };

    // Keep the selected item visible in the list
    useEffect(() => {
        if (listRef.current && showSuggestions) {
            const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
            selectedItem?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex, showSuggestions]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                textareaRef.current &&
                !textareaRef.current.contains(e.target as Node) &&
                listRef.current &&
                !listRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                rows={2}
                className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />

            {showSuggestions && filteredUsers.length > 0 && (
                <ul
                    ref={listRef}
                    className="absolute z-50 mt-1 max-h-60 w-72 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                >
                    {filteredUsers.map((user, index) => (
                        <li
                            key={user.id}
                            onClick={() => insertMention(user)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm ${index === selectedIndex
                                ? "bg-blue-50 text-blue-700"
                                : "text-gray-800 hover:bg-gray-50"
                                }`}
                        >
                            {user?.image_url ? (
                                <Avatar>
                                    <AvatarImage
                                        src={user?.image_url}
                                        alt=""
                                        className="h-8 w-8 rounded-full object-cover"></AvatarImage>
                                    <AvatarFallback>CN</AvatarFallback>
                                </Avatar>
                            ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="truncate font-medium">{user.name}</div>
                                <div className="truncate text-xs text-gray-500">
                                    @{user.username}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {showSuggestions && filteredUsers.length === 0 && query && (
                <div className="absolute z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500 shadow-lg">
                    No users found
                </div>
            )}
        </div>
    );
}
