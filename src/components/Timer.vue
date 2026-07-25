<template>
    <span>{{ text }}</span>
</template>
<script setup>
    import { useIntervalFn } from '@vueuse/core';
    import { computed, shallowRef } from 'vue';

    import { timeToText } from '../shared/utils';

    const props = defineProps({
        epoch: {
            type: Number,
            required: true
        },
        interval: {
            type: Number,
            default: 15000
        },
        showSeconds: {
            type: Boolean,
            default: false
        },
        exactSeconds: {
            type: Boolean,
            default: false
        },
        showSecondsUntil: {
            type: Number,
            default: 0
        }
    });

    const now = shallowRef(new Date());
    const elapsed = computed(() => now.value - props.epoch);
    const shouldShowSeconds = computed(
        () => props.showSeconds && (!props.showSecondsUntil || elapsed.value < props.showSecondsUntil)
    );
    const updateInterval = computed(() => (props.showSecondsUntil && shouldShowSeconds.value ? 1000 : props.interval));

    useIntervalFn(() => {
        now.value = new Date();
    }, updateInterval);

    const text = computed(() => {
        return props.epoch
            ? timeToText(elapsed.value, shouldShowSeconds.value, props.exactSeconds && shouldShowSeconds.value)
            : '-';
    });
</script>
