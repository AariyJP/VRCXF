<script setup>
    import { DialogClose, DialogContent, DialogPortal, useForwardProps } from 'reka-ui';
    import { computed, inject, ref } from 'vue';
    import { X } from 'lucide-vue-next';
    import { isUsableDocument, useGuardedOutsideEmit, usePortalDocument } from '@/composables/usePortalDocument';
    import { cn } from '@/lib/utils';
    import { reactiveOmit } from '@vueuse/core';

    import SheetOverlay from './SheetOverlay.vue';
    import { DIALOG_OPEN_INJECTION_KEY } from '../dialog/context';

    defineOptions({
        inheritAttrs: false
    });

    const props = defineProps({
        class: { type: null, required: false },
        side: { type: String, required: false, default: 'right' },
        forceMount: { type: Boolean, required: false },
        disableOutsidePointerEvents: { type: Boolean, required: false },
        asChild: { type: Boolean, required: false },
        as: { type: null, required: false }
    });
    const emits = defineEmits([
        'escapeKeyDown',
        'pointerDownOutside',
        'focusOutside',
        'interactOutside',
        'openAutoFocus',
        'closeAutoFocus'
    ]);

    const delegatedProps = reactiveOmit(props, 'class', 'side');

    const forwarded = useForwardProps(delegatedProps);

    const open = inject(DIALOG_OPEN_INJECTION_KEY, ref(true));
    const portalDoc = usePortalDocument(open);
    const emitOutside = useGuardedOutsideEmit(portalDoc, emits);
    const portalTo = computed(() => (isUsableDocument(portalDoc.value) ? portalDoc.value.body : undefined));
</script>

<template>
    <DialogPortal :to="portalTo">
        <SheetOverlay />
        <DialogContent
            data-slot="sheet-content"
            :class="
                cn(
                    'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
                    side === 'right' &&
                        'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
                    side === 'left' &&
                        'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
                    side === 'top' &&
                        'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
                    side === 'bottom' &&
                        'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
                    props.class
                )
            "
            v-bind="{ ...$attrs, ...forwarded }"
            @pointer-down-outside="emitOutside('pointerDownOutside', $event)"
            @focus-outside="emitOutside('focusOutside', $event)"
            @interact-outside="emitOutside('interactOutside', $event)"
            @escape-key-down="emits('escapeKeyDown', $event)"
            @open-auto-focus="emits('openAutoFocus', $event)"
            @close-auto-focus="emits('closeAutoFocus', $event)">
            <slot />

            <DialogClose
                class="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none cursor-pointer">
                <X class="size-4" />
                <span class="sr-only">Close</span>
            </DialogClose>
        </DialogContent>
    </DialogPortal>
</template>
