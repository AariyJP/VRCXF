<script setup>
    import { computed, inject } from 'vue';
    import { ContextMenuRoot, useForwardPropsEmits } from 'reka-ui';
    import { PORTAL_DOCUMENT_KEY, isUsableDocument } from '@/composables/usePortalDocument';

    /** @typedef {import('reka-ui').ContextMenuRootProps} ContextMenuRootProps */

    const props = defineProps({
        pressOpenDelay: { type: Number, required: false },
        dir: { type: /** @type {import('vue').PropType<ContextMenuRootProps['dir']>} */ (String), required: false },
        modal: { type: Boolean, required: false, default: undefined }
    });
    const emits = defineEmits(['update:open']);

    const forwarded = useForwardPropsEmits(props, emits);

    const portalDocument = inject(PORTAL_DOCUMENT_KEY, null);
    const resolvedModal = computed(() => {
        if (isUsableDocument(portalDocument?.value) && portalDocument.value !== document) {
            return false;
        }
        return props.modal ?? false;
    });
</script>

<template>
    <ContextMenuRoot data-slot="context-menu" v-bind="forwarded" :modal="resolvedModal">
        <slot />
    </ContextMenuRoot>
</template>
