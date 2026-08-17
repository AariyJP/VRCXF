import {
    computed,
    inject,
    onBeforeUnmount,
    provide,
    ref,
    shallowRef,
    watch
} from 'vue';
import { activeDocument, isDocumentAlive } from '@/lib/activeWindowTracker';
import { acquireModalPortalLayer } from '@/lib/modalPortalLayers';

export const PORTAL_DOCUMENT_KEY = Symbol('vrcx-portal-document');

export function isUsableDocument(value) {
    return Boolean(value?.nodeType === 9 && isDocumentAlive(value));
}

export function resolvePortalDocument(value) {
    if (isUsableDocument(value)) {
        return value;
    }
    if (isUsableDocument(activeDocument.value)) {
        return activeDocument.value;
    }
    return typeof document !== 'undefined' ? document : null;
}

export function providePortalDocument(documentRef) {
    provide(PORTAL_DOCUMENT_KEY, documentRef);
}

export function usePortalDocument(open = null) {
    const inheritedDocument = inject(PORTAL_DOCUMENT_KEY, null);
    const ownerDocument = shallowRef(null);

    if (open) {
        watch(
            open,
            (isOpen) => {
                ownerDocument.value = isOpen
                    ? resolvePortalDocument(inheritedDocument?.value)
                    : null;
            },
            { immediate: true }
        );
    }

    const portalDocument = computed(() => {
        if (isUsableDocument(inheritedDocument?.value)) {
            return inheritedDocument.value;
        }
        if (isUsableDocument(ownerDocument.value)) {
            return ownerDocument.value;
        }
        return resolvePortalDocument();
    });

    providePortalDocument(portalDocument);
    return portalDocument;
}

export function useModalPortalLayer(open, portalDocument) {
    const portalLayer = ref(null);

    watch(
        [open, portalDocument],
        ([isOpen, doc], oldValues) => {
            const oldDoc = oldValues?.[1];
            if (isOpen) {
                if (portalLayer.value && oldDoc !== doc) {
                    portalLayer.value.release();
                    portalLayer.value = null;
                }
                portalLayer.value ??= acquireModalPortalLayer(doc);
            } else {
                portalLayer.value?.release();
                portalLayer.value = null;
            }
        },
        { immediate: true }
    );

    onBeforeUnmount(() => {
        portalLayer.value?.release();
    });

    return computed(() => portalLayer.value?.element);
}

export function useCrossWindowDismissGuard(portalDocument) {
    return (event) => {
        const original = event?.detail?.originalEvent;
        if (!original || !portalDocument?.value) {
            return;
        }
        const sourceDocument =
            Reflect.get(original, '__vrcxSourceDocument') ||
            original.target?.ownerDocument;
        if (sourceDocument && sourceDocument !== portalDocument.value) {
            event.preventDefault();
        }
    };
}

export function useGuardedOutsideEmit(portalDocument, emits) {
    const guard = useCrossWindowDismissGuard(portalDocument);
    return (name, event) => {
        guard(event);
        if (!event.defaultPrevented) {
            emits(name, event);
        }
    };
}

export function usePortalTarget() {
    const portalDocument = inject(PORTAL_DOCUMENT_KEY, null);
    return computed(() =>
        isUsableDocument(portalDocument?.value)
            ? portalDocument.value.body
            : undefined
    );
}
