import { ref } from 'vue';

export const activeDocument = ref(
    typeof document !== 'undefined' ? document : null
);

const trackedDocuments = new Set();

export function isDocumentAlive(value) {
    return Boolean(value?.defaultView && !value.defaultView.closed);
}

function collectDocuments() {
    const documents = new Set([
        activeDocument.value,
        ...trackedDocuments,
        typeof document !== 'undefined' ? document : null
    ]);
    return Array.from(documents).filter(isDocumentAlive);
}

export function queryAcrossWindows(selector) {
    for (const doc of collectDocuments()) {
        const element = doc.querySelector(selector);
        if (element) {
            return element;
        }
    }
    return null;
}

export function queryAllAcrossWindows(selector) {
    return collectDocuments().flatMap((doc) =>
        Array.from(doc.querySelectorAll(selector))
    );
}

export function registerActiveDocument(doc) {
    if (!doc) {
        return () => {};
    }

    trackedDocuments.add(doc);

    const handler = (event) => {
        if (Reflect.get(event, '__vrcxForwarded')) {
            return;
        }
        activeDocument.value = doc;
    };

    doc.addEventListener('pointerdown', handler, {
        capture: true,
        passive: true
    });
    doc.addEventListener('keydown', handler, { capture: true, passive: true });
    doc.addEventListener('focusin', handler, { capture: true, passive: true });

    return () => {
        trackedDocuments.delete(doc);
        doc.removeEventListener('pointerdown', handler, { capture: true });
        doc.removeEventListener('keydown', handler, { capture: true });
        doc.removeEventListener('focusin', handler, { capture: true });
        if (activeDocument.value === doc) {
            activeDocument.value =
                typeof document !== 'undefined' ? document : null;
        }
    };
}
