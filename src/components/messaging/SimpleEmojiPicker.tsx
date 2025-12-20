'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SimpleEmojiPickerProps {
    onEmojiClick: (emoji: string) => void;
    className?: string;
}

const EMOJI_CATEGORIES = {
    'الوجوه': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓'],
    'إيماءات': ['👋', '🤚', '🖐', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
    'قلوب': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
    'رموز': ['✅', '❌', '⭐', '🌟', '✨', '💫', '⚡', '🔥', '💯', '💢', '💬', '💭', '🗯', '♨️', '💤', '🕐', '⏰', '⌚', '📱', '💻', '⚽', '🏀', '🎮', '🎯', '🎲'],
};

export default function SimpleEmojiPicker({ onEmojiClick, className }: SimpleEmojiPickerProps) {
    const [activeCategory, setActiveCategory] = React.useState<string>('الوجوه');

    return (
        <div className={cn("bg-white rounded-xl shadow-2xl border border-gray-200", className)}>
            {/* Categories */}
            <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto">
                {Object.keys(EMOJI_CATEGORIES).map((category) => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                            activeCategory === category
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 h-[300px] overflow-y-auto">
                <div className="grid grid-cols-8 gap-2">
                    {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                        <button
                            key={index}
                            onClick={() => onEmojiClick(emoji)}
                            className="text-2xl hover:bg-gray-100 rounded-lg p-2 transition-all hover:scale-110 active:scale-95"
                            title={emoji}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
