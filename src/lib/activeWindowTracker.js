import { ref } from 'vue';

export const activeDocument = ref(
    typeof document !== 'undefined' ? document : null
);

export function registerActiveDocument(doc) {
    if (!doc) {
        return () => {};
    }

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
        doc.removeEventListener('pointerdown', handler, { capture: true });
        doc.removeEventListener('keydown', handler, { capture: true });
        doc.removeEventListener('focusin', handler, { capture: true });
        if (activeDocument.value === doc) {
            activeDocument.value =
                typeof document !== 'undefined' ? document : null;
        }
    };
}
