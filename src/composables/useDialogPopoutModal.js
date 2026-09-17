import { computed, inject, shallowRef, watch } from 'vue';
import { PORTAL_DOCUMENT_KEY, isUsableDocument, resolvePortalDocument } from '@/composables/usePortalDocument';

export function useDialogPopoutModal(props) {
    const inheritedDocument = inject(PORTAL_DOCUMENT_KEY, null);
    const isPopoutDocument = shallowRef(false);

    watch(
        () => props.open,
        (isOpen) => {
            if (!isOpen) {
                return;
            }
            const portalDocument = resolvePortalDocument(inheritedDocument?.value);
            isPopoutDocument.value = isUsableDocument(portalDocument) && portalDocument !== document;
        },
        { flush: 'sync', immediate: true }
    );

    return computed(() => (isPopoutDocument.value ? false : (props.modal ?? true)));
}
