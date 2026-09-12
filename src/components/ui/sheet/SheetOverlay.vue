<script setup>
    import { DialogOverlay } from 'reka-ui';
    import { cn } from '@/lib/utils';
    import { reactiveOmit } from '@vueuse/core';
    import { inject } from 'vue';

    import { DIALOG_OPEN_INJECTION_KEY, DIALOG_POPOUT_INJECTION_KEY } from '../dialog/context';

    const props = defineProps({
        forceMount: { type: Boolean, required: false },
        asChild: { type: Boolean, required: false },
        as: { type: null, required: false },
        class: { type: null, required: false }
    });

    const delegatedProps = reactiveOmit(props, 'class');

    const isPopoutDocument = inject(DIALOG_POPOUT_INJECTION_KEY, null);
    const isOpen = inject(DIALOG_OPEN_INJECTION_KEY, null);
</script>

<template>
    <div
        v-if="isPopoutDocument?.value && isOpen?.value"
        data-slot="sheet-overlay"
        :class="cn('fixed inset-0 z-50 bg-black/80', props.class)">
        <slot />
    </div>
    <DialogOverlay
        v-else
        data-slot="sheet-overlay"
        :class="
            cn(
                'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80',
                props.class
            )
        "
        v-bind="delegatedProps">
        <slot />
    </DialogOverlay>
</template>
