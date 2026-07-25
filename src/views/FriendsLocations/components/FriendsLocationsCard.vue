<template>
    <UserContextMenu :user-id="friend.id" :state="friend.state" :location="friend.ref?.location">
        <Card
            class="friend-card x-hover-card hover:bg-muted relative"
            :class="{ 'friend-card--friend': friend.ref?.isFriend }"
            :style="cardStyle"
            @click="showUserDialog(friend.id)">
            <div class="friend-card__header grid items-center mb-1.75">
                <div>
                    <Avatar
                        class="friend-card__avatar"
                        :style="{ width: `${avatarSize}px`, height: `${avatarSize}px` }">
                        <AvatarImage :src="imageUrl" />
                        <AvatarFallback>
                            <User class="text-muted-foreground" :size="Math.max(16, 20 * cardScale)" />
                        </AvatarFallback>
                    </Avatar>
                </div>
                <span
                    class="friend-card__status-dot absolute rounded-full pointer-events-none"
                    :class="statusDotClass"></span>
                <div class="friend-card__identity flex min-w-0 flex-col justify-center ml-2">
                    <div
                        class="friend-card__name font-semibold leading-[1.3] overflow-hidden text-ellipsis whitespace-nowrap"
                        :style="{ color: friend.ref?.$userColour }"
                        :title="friend.name">
                        <Crown v-if="friend.isOwner" class="inline-block text-muted-foreground" />
                        {{ friend.name }}
                    </div>
                    <div
                        v-if="epoch && !friend.isOwner"
                        class="friend-card__elapsed flex items-center overflow-hidden whitespace-nowrap text-muted-foreground">
                        <Spinner
                            v-if="isFriendTraveling"
                            class="shrink-0"
                            :style="{
                                width: `${Math.max(12, 14 * cardScale)}px`,
                                height: `${Math.max(12, 14 * cardScale)}px`
                            }" />
                        <Clock v-else class="shrink-0" :size="Math.max(12, 14 * cardScale)" />
                        <Timer :epoch="epoch" exact-seconds show-seconds />
                    </div>
                </div>
            </div>
            <div class="friend-card__body grid">
                <div
                    class="friend-card__signature flex items-center overflow-hidden text-ellipsis whitespace-nowrap text-muted-foreground"
                    :title="friend.ref?.statusDescription">
                    <Pencil v-if="friend.ref?.statusDescription" class="h-3.5 w-3.5 mr-0.5" style="opacity: 0.7" />
                    {{ friend.ref?.statusDescription || '&nbsp;' }}
                </div>
                <div
                    v-if="displayInstanceInfo"
                    @click.stop
                    class="friend-card__world flex items-center justify-start box-border max-w-full min-w-0 overflow-hidden"
                    :title="friend.worldName">
                    <Location
                        class="friend-card__location flex w-full overflow-hidden wrap-break-word text-center"
                        :location="friend.ref?.location"
                        :traveling="friend.ref?.travelingToLocation"
                        enable-context-menu
                        link />
                </div>
            </div>
        </Card>
    </UserContextMenu>
</template>

<script setup>
    import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
    import { Clock, Crown, Pencil, User } from 'lucide-vue-next';
    import { Card } from '@/components/ui/card';
    import { Spinner } from '@/components/ui/spinner';
    import { computed } from 'vue';

    import { statusClass } from '../../../shared/utils';
    import { useUserDisplay } from '../../../composables/useUserDisplay';

    import Location from '../../../components/Location.vue';
    import Timer from '../../../components/Timer.vue';
    import UserContextMenu from '../../../components/UserContextMenu.vue';
    import { showUserDialog } from '../../../coordinators/userCoordinator';

    const { userImage, userStatusClass } = useUserDisplay();

    const props = defineProps({
        friend: {
            type: Object,
            required: true
        },
        cardScale: {
            type: Number,
            default: 1
        },
        displayInstanceInfo: {
            type: Boolean,
            default: true
        },
        cardSpacing: {
            type: Number,
            default: 1
        }
    });

    const avatarSize = computed(() => Math.max(36, 46 * props.cardScale));
    const isFriendTraveling = computed(() => props.friend.ref?.location === 'traveling');
    const epoch = computed(() =>
        isFriendTraveling.value ? props.friend.ref?.$travelingToTime : props.friend.ref?.$location_at
    );

    const imageUrl = computed(() => {
        const url = userImage(props.friend.ref, true);
        if (!url || url.startsWith('null/') || url.startsWith('https://null/')) {
            return '';
        }
        return url;
    });

    const cardStyle = computed(() => ({
        '--card-scale': props.cardScale,
        '--card-spacing': props.cardSpacing,
        cursor: 'pointer',
        padding: `${8 * props.cardScale}px`,
        paddingBottom: `${6 * props.cardScale}px !important`
    }));

    const statusDotClass = computed(() => {
        let status = userStatusClass(props.friend.ref, props.friend.pendingOffline);

        if (!status) {
            status = {};
        }

        if (
            props.friend.isOwner &&
            !props.friend.isFriendOwner &&
            (status.offline || !Object.keys(status).length) &&
            props.friend.status
        ) {
            status = statusClass(props.friend.status);
        }

        if (!status) {
            status = {};
        }

        if (status?.online) {
            return 'friend-card__status-dot--online';
        }
        if (status?.['active-joinme']) {
            return 'friend-card__status-dot--active-joinme';
        }
        if (status?.['active-askme']) {
            return 'friend-card__status-dot--active-askme';
        }
        if (status?.['active-busy']) {
            return 'friend-card__status-dot--active-busy';
        }
        if (status?.active) {
            return 'friend-card__status-dot--active';
        }
        if (status?.joinme) {
            return 'friend-card__status-dot--joinme';
        }
        if (status?.askme) {
            return 'friend-card__status-dot--askme';
        }
        if (status?.busy) {
            return 'friend-card__status-dot--busy';
        }
        if (status?.offline) {
            return 'friend-card__status-dot--offline';
        }

        return 'friend-card__status-dot--hidden';
    });
</script>

<style scoped>
    .friend-card {
        --card-scale: 1;
        --card-spacing: 1;
        gap: calc(14px * var(--card-scale) * var(--card-spacing));
        max-width: var(--friend-card-target-width, 220px);
        min-width: var(--friend-card-min-width, 220px);
    }

    .friend-card--friend {
        border-color: color-mix(in oklch, color-mix(in oklch, var(--color-yellow-400) 65%, white) 70%, black);
    }

    .friend-card__header {
        grid-template-columns: auto minmax(0, 1fr);
        gap: calc(10px * var(--card-scale) * var(--card-spacing));
    }

    .friend-card__status-dot {
        top: calc(8px * var(--card-scale));
        right: calc(8px * var(--card-scale));
        inline-size: calc(12px * var(--card-scale));
        block-size: calc(12px * var(--card-scale));
    }

    .friend-card__status-dot--hidden {
        display: none;
    }

    .friend-card__status-dot--online {
        background: var(--status-online);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-online) 40%, transparent);
    }

    .friend-card__status-dot--active {
        background: transparent;
        border: calc(2px * var(--card-scale)) solid var(--status-online);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-online) 40%, transparent);
    }

    .friend-card__status-dot--active-joinme {
        background: transparent;
        border: calc(2px * var(--card-scale)) solid var(--status-joinme);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-joinme) 40%, transparent);
    }

    .friend-card__status-dot--active-askme {
        background: transparent;
        border: calc(2px * var(--card-scale)) solid var(--status-askme);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-askme) 40%, transparent);
    }

    .friend-card__status-dot--active-busy {
        background: transparent;
        border: calc(2px * var(--card-scale)) solid var(--status-busy);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-busy) 40%, transparent);
    }

    .friend-card__status-dot--joinme {
        background: var(--status-joinme);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-joinme) 40%, transparent);
    }

    .friend-card__status-dot--busy {
        background: var(--status-busy);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-busy) 40%, transparent);
    }

    .friend-card__status-dot--askme {
        background: var(--status-askme);
        box-shadow: 0 0 calc(8px * var(--card-scale)) color-mix(in oklch, var(--status-askme) 40%, transparent);
    }

    .friend-card__status-dot--offline {
        background: var(--status-offline-card);
    }

    .friend-card__body {
        gap: calc(8px * var(--card-scale) * var(--card-spacing));
    }

    .friend-card__name {
        font-size: calc(13px * var(--card-scale));
    }

    .friend-card__elapsed {
        gap: calc(3px * var(--card-scale));
        font-size: calc(12px * var(--card-scale));
        line-height: 1.3;
    }

    .friend-card__signature {
        font-size: calc(12px * var(--card-scale));
        padding: calc(7px * var(--card-scale)) calc(8px * var(--card-scale));
        line-height: 1.4;
        gap: calc(4px * var(--card-scale));
    }

    .friend-card__signature :deep(svg) {
        margin-top: calc(1px * var(--card-scale));
    }

    .friend-card__world {
        min-height: calc(24px * var(--card-scale));
        padding: calc(7px * var(--card-scale)) calc(8px * var(--card-scale));
        border-radius: calc(var(--radius-lg) * var(--card-scale));
        font-size: calc(12px * var(--card-scale));
        line-height: 1.3;
    }

    :global(html.dark) .friend-card__world,
    :global(:root.dark) .friend-card__world,
    :global(:root[data-theme='dark']) .friend-card__world {
        color: var(--color-zinc-300);
    }

    .friend-card__location {
        max-height: calc(36px * var(--card-scale));
        white-space: normal;
    }

    .friend-card__location :deep(.x-location__text) {
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        text-overflow: ellipsis;
    }

    .friend-card__location :deep(.x-location__text:only-child) {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: calc(24px * var(--card-scale));
    }

    .friend-card__location :deep(.x-location__text:only-child span) {
        display: block;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .friend-card__location :deep(.x-location__meta) {
        display: none;
    }

    .friend-card__location :deep(.flags) {
        scale: calc(1 * var(--card-scale));
        filter: brightness(1.05);
    }
</style>
