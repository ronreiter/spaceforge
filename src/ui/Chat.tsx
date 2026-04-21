import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '../storage/files';

export type ChatProps = {
  messages: ChatMessage[];
  disabled: boolean;
  statusLine?: string;
  tokensPerSecond?: number;
  onSend: (text: string) => void;
};

const SUGGESTIONS = [
  'A one-page portfolio for a landscape photographer named Ana, with an About page.',
  'A minimalist blog with three posts about urban cycling.',
  'A product landing page for a smart plant pot called Sprout.',
  'A three-page site for a local bakery — home, menu, contact.',
];

export function Chat({ messages, disabled, statusLine, tokensPerSecond, onSend }: ChatProps) {
  const [input, setInput] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, statusLine]);

  function submit() {
    const text = input.trim();
    if (!text || disabled) return;
    onSend(text);
    setInput('');
  }

  const visible = messages.filter((m) => m.role !== 'system');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0d1117',
        color: '#e6edf3',
      }}
    >
      <div
        ref={scroller}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 0,
        }}
      >
        {visible.length === 0 && (
          <div style={{ color: '#7d8590', fontSize: 13, lineHeight: 1.55 }}>
            <p style={{ marginBottom: 10 }}>
              Describe the site you want. Spaceforge will produce HTML/CSS/JS files in your browser.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => !disabled && onSend(s)}
                  disabled={disabled}
                  style={suggestionBtn}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {visible.map((m, i) => (
          <div
            key={i}
            style={{
              background: m.role === 'user' ? '#1f6feb' : '#161b22',
              color: m.role === 'user' ? '#fff' : '#e6edf3',
              padding: '8px 12px',
              borderRadius: 8,
              maxWidth: '90%',
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              lineHeight: 1.55,
              border: m.role === 'assistant' ? '1px solid #30363d' : 'none',
            }}
          >
            {m.content || (m.role === 'assistant' ? <span style={{ opacity: 0.5 }}>…</span> : null)}
          </div>
        ))}
        {statusLine && (
          <div style={{ color: '#7d8590', fontSize: 12, fontStyle: 'italic' }}>
            {statusLine}
            {tokensPerSecond ? ` · ${tokensPerSecond.toFixed(1)} tok/s` : ''}
          </div>
        )}
      </div>
      <div style={{ padding: 12, borderTop: '1px solid #30363d' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'Model is loading…' : 'Message Spaceforge…'}
          disabled={disabled}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
          }}
          style={{
            width: '100%',
            height: 80,
            background: '#161b22',
            color: '#e6edf3',
            border: '1px solid #30363d',
            borderRadius: 6,
            padding: 8,
            fontSize: 13,
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !input.trim()}
          style={{
            marginTop: 8,
            width: '100%',
            padding: 8,
            background: disabled || !input.trim() ? '#30363d' : '#238636',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: disabled || !input.trim() ? 'not-allowed' : 'pointer',
            fontSize: 14,
          }}
        >
          Send  (⌘⏎)
        </button>
      </div>
    </div>
  );
}

const suggestionBtn: React.CSSProperties = {
  textAlign: 'left',
  background: '#161b22',
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: 6,
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: 12,
  lineHeight: 1.4,
};
