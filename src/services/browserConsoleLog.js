import { ref } from 'vue';

const maxEntries = 500;
const levels = ['debug', 'log', 'info', 'warn', 'error'];
const ignoredGlobalErrors = new Set([
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded'
]);
const stateKey = Symbol.for('vrcxf.browserConsoleLog');
const existingState = Reflect.get(globalThis, stateKey);
const state = existingState ?? {
    entries: ref([]),
    initialized: false,
    nextId: 1
};

if (!existingState) {
    Reflect.set(globalThis, stateKey, state);
}

function serialize(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (value instanceof Error) {
        return value.stack || value.message;
    }

    const seen = new WeakSet();
    try {
        const serialized = JSON.stringify(
            value,
            (_key, nestedValue) => {
                if (typeof nestedValue === 'bigint') {
                    return `${nestedValue}n`;
                }
                if (typeof nestedValue === 'object' && nestedValue !== null) {
                    if (seen.has(nestedValue)) {
                        return '[Circular]';
                    }
                    seen.add(nestedValue);
                }
                return nestedValue;
            },
            2
        );
        return serialized ?? String(value);
    } catch {
        return String(value);
    }
}

function append(level, values) {
    const entries = state.entries.value;
    state.entries.value = [
        ...entries.slice(-(maxEntries - 1)),
        {
            id: state.nextId,
            level,
            message: values.map(serialize).join(' '),
            time: new Date().toISOString()
        }
    ];
    state.nextId += 1;
}

function initBrowserConsoleLog() {
    if (state.initialized) {
        return;
    }
    state.initialized = true;

    levels.forEach((level) => {
        const original = console[level].bind(console);
        console[level] = (...values) => {
            original(...values);
            append(level, values);
        };
    });

    globalThis.addEventListener('error', (event) => {
        const error = event.error ?? event.message;
        const message = error instanceof Error ? error.message : String(error ?? '');
        if (!ignoredGlobalErrors.has(message)) {
            append('error', [error]);
        }
    });
    globalThis.addEventListener('unhandledrejection', (event) => {
        append('error', ['Unhandled promise rejection', event.reason]);
    });
}

export const browserConsoleLogs = state.entries;

export function clearBrowserConsoleLogs() {
    state.entries.value = [];
}

export async function executeBrowserConsoleCommand(command) {
    const source = String(command).trim();
    if (!source) {
        return;
    }

    append('command', [source]);
    try {
        const result = await globalThis.eval(source);
        append('result', [result]);
    } catch (error) {
        console.error(error);
    }
}

initBrowserConsoleLog();
