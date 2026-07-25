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
        showSeconds: {
            type: Boolean,
            default: false
        },
        exactSeconds: {
            type: Boolean,
            default: false
        }
    });

    const now = shallowRef(new Date());
    const elapsed = computed(() => now.value - props.epoch);

    useIntervalFn(() => {
        now.value = new Date();
    }, 15000);

    const text = computed(() => {
        return props.epoch ? timeToText(elapsed.value, props.showSeconds, props.exactSeconds) : '-';
    });
</script>
