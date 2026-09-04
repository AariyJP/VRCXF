<template>
    <slot v-if="disabled" />
    <Teleport v-else-if="target" :to="target">
        <div class="h-full w-full overflow-hidden bg-background text-foreground">
            <slot />
        </div>
        <Toaster position="top-center" :theme="toasterTheme" />
    </Teleport>
</template>

<script setup>
    import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
    import { providePortalDocument } from '@/composables/usePortalDocument';
    import { activeDocument, registerActiveDocument } from '@/lib/activeWindowTracker';
    import { useAppearanceSettingsStore } from '@/stores/settings/appearance';
    import { Toaster } from '@/components/ui/sonner';

    const appearanceSettingsStore = useAppearanceSettingsStore();
    const toasterTheme = computed(() => (appearanceSettingsStore.isDarkMode ? 'dark' : 'light'));

    const popupDocument = shallowRef(null);
    providePortalDocument(popupDocument);

    const props = defineProps({
        disabled: {
            type: Boolean,
            default: false
        },
        open: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        width: {
            type: Number,
            default: 1200
        },
        height: {
            type: Number,
            default: 800
        },
        focusKey: {
            type: [Number, String],
            default: 0
        }
    });

    const emit = defineEmits(['close']);

    const target = ref(null);
    let newWindow = null;
    let themeObserver = null;
    let styleObserver = null;
    let activeDocumentCleanup = null;
    let eventBridgeCleanup = null;

    const resetWindowState = () => {
        target.value = null;
        themeObserver?.disconnect();
        themeObserver = null;
        styleObserver?.disconnect();
        styleObserver = null;
        activeDocumentCleanup?.();
        activeDocumentCleanup = null;
        eventBridgeCleanup?.();
        eventBridgeCleanup = null;
        newWindow = null;
        popupDocument.value = null;
    };

    const bridgeEvents = (sourceDocument) => {
        const forward = (originalEvent, forwardedEvent) => {
            Reflect.set(forwardedEvent, '__vrcxForwarded', true);
            Reflect.set(forwardedEvent, '__vrcxSourceDocument', sourceDocument);
            if (!document.body.dispatchEvent(forwardedEvent)) {
                originalEvent.preventDefault();
            }
        };
        const forwardPointerDown = (event) => {
            forward(
                event,
                new PointerEvent('pointerdown', {
                    bubbles: true,
                    cancelable: true,
                    pointerId: event.pointerId,
                    pointerType: event.pointerType,
                    button: event.button,
                    buttons: event.buttons,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey,
                    metaKey: event.metaKey
                })
            );
        };
        const forwardKeyDown = (event) => {
            if (event.key !== 'Escape') {
                return;
            }
            forward(
                event,
                new KeyboardEvent('keydown', {
                    bubbles: true,
                    cancelable: true,
                    key: event.key,
                    code: event.code,
                    repeat: event.repeat,
                    ctrlKey: event.ctrlKey,
                    shiftKey: event.shiftKey,
                    altKey: event.altKey,
                    metaKey: event.metaKey
                })
            );
        };

        sourceDocument.addEventListener('pointerdown', forwardPointerDown);
        sourceDocument.addEventListener('keydown', forwardKeyDown);

        return () => {
            sourceDocument.removeEventListener('pointerdown', forwardPointerDown);
            sourceDocument.removeEventListener('keydown', forwardKeyDown);
        };
    };

    const windowName = `vrcx-popout-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

    const focusNewWindow = () => {
        if (!newWindow || newWindow.closed) {
            return;
        }
        if (WINDOWS) {
            AppApi.FocusPopupWindow(windowName);
        }
        newWindow.electron?.focusSelfWindow?.();
        newWindow.focus();
    };

    const createNewWindow = () => {
        if (newWindow && !newWindow.closed && target.value?.isConnected) {
            focusNewWindow();
            return;
        }

        resetWindowState();
        const activeWindow = activeDocument.value?.defaultView;
        const openerWindow = activeWindow && !activeWindow.closed ? activeWindow : window;
        const screen = openerWindow.screen;
        const left = Math.round((screen.availWidth - props.width) / 2 + (screen.availLeft ?? 0));
        const top = Math.round((screen.availHeight - props.height) / 2 + (screen.availTop ?? 0));

        const openedWindow = openerWindow.open(
            'about:blank',
            windowName,
            `width=${props.width},height=${props.height},top=${top},left=${left}`
        );

        if (!openedWindow) {
            console.error('Failed to open window');
            emit('close');
            return;
        }

        newWindow = openedWindow;

        popupDocument.value = newWindow.document;
        activeDocumentCleanup = registerActiveDocument(newWindow.document);
        eventBridgeCleanup = bridgeEvents(newWindow.document);

        newWindow.document.title = props.title;

        const bodyStyle = window.getComputedStyle(document.body);
        newWindow.document.body.style.backgroundColor = bodyStyle.backgroundColor;
        newWindow.document.body.style.color = bodyStyle.color;

        const syncStyles = () => {
            if (!newWindow || newWindow.closed) {
                return;
            }
            const head = newWindow.document.head;
            const stale = Array.from(head.querySelectorAll('[data-vrcx-cloned-style]'));
            document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
                const clone = node.cloneNode(true);
                clone.setAttribute('data-vrcx-cloned-style', '');
                head.appendChild(clone);
            });
            stale.forEach((node) => node.remove());
        };
        syncStyles();

        styleObserver = new MutationObserver(syncStyles);
        styleObserver.observe(document.head, {
            attributeFilter: ['href'],
            attributes: true,
            childList: true,
            subtree: true
        });

        Array.from(document.documentElement.attributes).forEach((attr) => {
            newWindow.document.documentElement.setAttribute(attr.name, attr.value);
        });

        themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (newWindow && !newWindow.closed && mutation.type === 'attributes') {
                    const attrName = mutation.attributeName;
                    const attrValue = document.documentElement.getAttribute(attrName);
                    if (attrValue !== null) {
                        newWindow.document.documentElement.setAttribute(attrName, attrValue);
                    } else {
                        newWindow.document.documentElement.removeAttribute(attrName);
                    }
                }
            });
        });
        themeObserver.observe(document.documentElement, { attributes: true });

        const el = newWindow.document.createElement('div');
        el.id = 'teleport-target';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.overflow = 'hidden';
        newWindow.document.body.appendChild(el);
        newWindow.document.body.style.margin = '0';
        newWindow.document.body.style.width = '100vw';
        newWindow.document.body.style.height = '100vh';
        newWindow.document.body.style.overflow = 'hidden';

        target.value = el;
        focusNewWindow();

        const openedDocument = newWindow.document;
        const handleWindowClose = () => {
            if (popupDocument.value !== openedDocument) {
                return;
            }
            resetWindowState();
            emit('close');
        };
        openedWindow.addEventListener('pagehide', handleWindowClose, { once: true });
        openedWindow.addEventListener('unload', handleWindowClose, { once: true });
    };

    const closeNewWindow = () => {
        const windowToClose = newWindow;
        if (windowToClose && !windowToClose.closed) {
            windowToClose.close();
        }
        if (newWindow === windowToClose) {
            resetWindowState();
        }
    };

    watch(
        [() => props.open, () => props.disabled],
        ([open, disabled]) => {
            if (open && !disabled) {
                createNewWindow();
            } else {
                closeNewWindow();
            }
        },
        { immediate: true }
    );

    watch(
        () => props.title,
        (title) => {
            if (newWindow && !newWindow.closed) {
                newWindow.document.title = title;
            }
        }
    );

    watch(
        () => props.focusKey,
        () => {
            if (props.open && !props.disabled) {
                createNewWindow();
            }
        }
    );

    onBeforeUnmount(() => {
        closeNewWindow();
    });
</script>
