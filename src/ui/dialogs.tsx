'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Button,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';

// Promise-returning replacements for window.confirm / window.alert /
// window.prompt — rendered as Mantine modals so the app keeps its
// typography, focus-trap, ESC-to-close, dark theme, etc.
//
// Usage:
//   const confirm = useConfirm();
//   if (!(await confirm({ message: 'Delete this site?' }))) return;
//
//   const alert = useAlert();
//   await alert({ message: `Failed: ${err}` });
//
//   const prompt = usePrompt();
//   const name = await prompt({ message: 'File name', initial: 'untitled.md' });
//   if (!name) return;

type ConfirmOpts = {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type AlertOpts = {
  title?: string;
  message: ReactNode;
  okLabel?: string;
};

type PromptOpts = {
  title?: string;
  message?: ReactNode;
  label?: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type DialogSpec =
  | {
      kind: 'confirm';
      opts: ConfirmOpts;
      resolve: (v: boolean) => void;
    }
  | {
      kind: 'alert';
      opts: AlertOpts;
      resolve: () => void;
    }
  | {
      kind: 'prompt';
      opts: PromptOpts;
      resolve: (v: string | null) => void;
    };

type Ctx = {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  alert: (opts: AlertOpts) => Promise<void>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
};

const DialogCtx = createContext<Ctx | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  // Queue of pending dialogs. We render them one at a time in FIFO order
  // — matches native alert/confirm semantics where each call is modal.
  // If a caller fires two in a row (e.g. error handler), the second waits
  // for the first to resolve before showing.
  const [queue, setQueue] = useState<DialogSpec[]>([]);
  const keyRef = useRef(0);

  const enqueue = useCallback((spec: DialogSpec) => {
    setQueue((q) => [...q, spec]);
  }, []);

  const confirm = useCallback<Ctx['confirm']>(
    (opts) =>
      new Promise((resolve) => {
        enqueue({ kind: 'confirm', opts, resolve });
      }),
    [enqueue],
  );
  const alert = useCallback<Ctx['alert']>(
    (opts) =>
      new Promise<void>((resolve) => {
        enqueue({ kind: 'alert', opts, resolve });
      }),
    [enqueue],
  );
  const prompt = useCallback<Ctx['prompt']>(
    (opts) =>
      new Promise((resolve) => {
        enqueue({ kind: 'prompt', opts, resolve });
      }),
    [enqueue],
  );

  const active = queue[0] ?? null;

  const close = useCallback((settle: () => void) => {
    settle();
    setQueue((q) => q.slice(1));
    keyRef.current += 1;
  }, []);

  return (
    <DialogCtx.Provider value={{ confirm, alert, prompt }}>
      {children}
      {active && active.kind === 'confirm' && (
        <ConfirmModal
          key={`confirm-${keyRef.current}`}
          opts={active.opts}
          onClose={(value) => close(() => active.resolve(value))}
        />
      )}
      {active && active.kind === 'alert' && (
        <AlertModal
          key={`alert-${keyRef.current}`}
          opts={active.opts}
          onClose={() => close(() => active.resolve())}
        />
      )}
      {active && active.kind === 'prompt' && (
        <PromptModal
          key={`prompt-${keyRef.current}`}
          opts={active.opts}
          onClose={(value) => close(() => active.resolve(value))}
        />
      )}
    </DialogCtx.Provider>
  );
}

function useDialogCtx(): Ctx {
  const v = useContext(DialogCtx);
  if (!v) {
    throw new Error(
      '<DialogProvider> must wrap the app. Check app/providers.tsx.',
    );
  }
  return v;
}

export function useConfirm() {
  return useDialogCtx().confirm;
}
export function useAlert() {
  return useDialogCtx().alert;
}
export function usePrompt() {
  return useDialogCtx().prompt;
}

function ConfirmModal({
  opts,
  onClose,
}: {
  opts: ConfirmOpts;
  onClose: (value: boolean) => void;
}) {
  return (
    <Modal
      opened
      onClose={() => onClose(false)}
      title={opts.title ?? 'Confirm'}
      centered
      size="sm"
      trapFocus
    >
      <Stack gap="md">
        <Text size="sm">{opts.message}</Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" onClick={() => onClose(false)}>
            {opts.cancelLabel ?? 'Cancel'}
          </Button>
          <Button
            color={opts.danger ? 'red' : undefined}
            onClick={() => onClose(true)}
            autoFocus
          >
            {opts.confirmLabel ?? 'Confirm'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function AlertModal({
  opts,
  onClose,
}: {
  opts: AlertOpts;
  onClose: () => void;
}) {
  return (
    <Modal
      opened
      onClose={onClose}
      title={opts.title ?? 'Notice'}
      centered
      size="sm"
      trapFocus
    >
      <Stack gap="md">
        <Text size="sm">{opts.message}</Text>
        <Group justify="flex-end">
          <Button onClick={onClose} autoFocus>
            {opts.okLabel ?? 'OK'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function PromptModal({
  opts,
  onClose,
}: {
  opts: PromptOpts;
  onClose: (value: string | null) => void;
}) {
  const [value, setValue] = useState(opts.initial ?? '');
  return (
    <Modal
      opened
      onClose={() => onClose(null)}
      title={opts.title ?? 'Enter a value'}
      centered
      size="sm"
      trapFocus
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClose(value.trim() || null);
        }}
      >
        <Stack gap="md">
          {opts.message && <Text size="sm">{opts.message}</Text>}
          <TextInput
            autoFocus
            label={opts.label}
            placeholder={opts.placeholder}
            value={value}
            onChange={(e) => setValue(e.currentTarget.value)}
            data-autofocus
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" type="button" onClick={() => onClose(null)}>
              {opts.cancelLabel ?? 'Cancel'}
            </Button>
            <Button type="submit">{opts.confirmLabel ?? 'OK'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
