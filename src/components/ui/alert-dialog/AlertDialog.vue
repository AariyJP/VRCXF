<script setup>
    import { AlertDialogRoot, useForwardPropsEmits } from 'reka-ui';
    import { useDialogPopoutModal } from '@/composables/useDialogPopoutModal';

    import AlertDialogStateProvider from './AlertDialogStateProvider.vue';

    const props = defineProps({
        open: { type: Boolean, required: false },
        defaultOpen: { type: Boolean, required: false }
    });
    const emits = defineEmits(['update:open']);

    const forwarded = useForwardPropsEmits(props, emits);

    useDialogPopoutModal(props);
</script>

<template>
    <AlertDialogRoot v-slot="slotProps" data-slot="alert-dialog" v-bind="forwarded">
        <AlertDialogStateProvider :open="slotProps.open">
            <slot v-bind="slotProps" />
        </AlertDialogStateProvider>
    </AlertDialogRoot>
</template>
