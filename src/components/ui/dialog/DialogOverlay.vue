<script setup>
    import { DialogOverlay } from 'reka-ui';
    import { cn } from '@/lib/utils';
    import { reactiveOmit } from '@vueuse/core';
    import { storeToRefs } from 'pinia';
    import { inject } from 'vue';
    import { useGeneralSettingsStore } from '@/stores/settings/general';

    import { DIALOG_OPEN_INJECTION_KEY, DIALOG_POPOUT_INJECTION_KEY } from './context';

    const props = defineProps({
        forceMount: { type: Boolean, required: false },
        asChild: { type: Boolean, required: false },
        as: { type: null, required: false },
        class: { type: null, required: false }
    });

    const delegatedProps = reactiveOmit(props, 'class');
    const { disableGpuAcceleration } = storeToRefs(useGeneralSettingsStore());

    const isPopoutDocument = inject(DIALOG_POPOUT_INJECTION_KEY, null);
    const isOpen = inject(DIALOG_OPEN_INJECTION_KEY, null);
</script>

<template>
    <div
        v-if="isPopoutDocument?.value && isOpen?.value"
        data-slot="dialog-overlay"
        :class="cn('fixed inset-0 z-50 bg-black/40', !disableGpuAcceleration && 'backdrop-blur-xs', props.class)">
        <slot />
    </div>
    <DialogOverlay
        v-else
        data-slot="dialog-overlay"
        v-bind="delegatedProps"
        :class="
            cn(
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40',
                !disableGpuAcceleration && 'backdrop-blur-xs',
                props.class
            )
        ">
        <slot />
    </DialogOverlay>
</template>
