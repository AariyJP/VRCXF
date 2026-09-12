import { computed, inject, provide, shallowRef, watch } from 'vue';
import { PORTAL_DOCUMENT_KEY, isUsableDocument, resolvePortalDocument } from '@/composables/usePortalDocument';
import { DIALOG_POPOUT_INJECTION_KEY } from '@/components/ui/dialog/context';

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

    provide(DIALOG_POPOUT_INJECTION_KEY, isPopoutDocument);

    return computed(() => (isPopoutDocument.value ? false : (props.modal ?? true)));
}
