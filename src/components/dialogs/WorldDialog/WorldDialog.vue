<template>
    <div class="w-full max-w-full min-w-0 sm:w-223 flex-1 min-h-0 flex flex-col max-sm:overflow-y-auto">
        <DialogHeader class="sr-only">
            <DialogTitle>{{ worldDialog.ref?.name || t('dialog.world.info.header') }}</DialogTitle>
            <DialogDescription>
                {{ worldDialog.ref?.description || worldDialog.ref?.name || t('dialog.world.info.header') }}
            </DialogDescription>
        </DialogHeader>
        <div class="flex flex-col max-sm:flex-none sm:flex-1 sm:min-h-0">
            <div class="flex shrink-0 flex-col gap-3 sm:flex-row">
                <div style="flex: none; width: 160px; height: 120px">
                    <img
                        v-if="!worldDialog.loading && !imageError"
                        :src="worldDialog.ref.thumbnailImageUrl"
                        class="cursor-pointer"
                        style="width: 160px; height: 120px; border-radius: var(--radius-xl)"
                        @click="showFullscreenImageDialog(worldDialog.ref.imageUrl)"
                        @error="imageError = true"
                        loading="lazy" />
                    <div
                        v-else-if="!worldDialog.loading"
                        class="flex items-center justify-center bg-muted"
                        style="width: 160px; height: 120px; border-radius: var(--radius-xl)">
                        <Image class="size-8 text-muted-foreground" />
                    </div>
                </div>
                <div class="min-w-0 sm:ml-4 sm:flex sm:flex-1 sm:items-start sm:gap-4">
                    <div class="min-w-0 flex-1">
                        <div>
                            <span class="font-bold mr-1.5 break-all" style="cursor: pointer" @click="copyWorldName">
                                <Home
                                    v-if="
                                        currentUser.$homeLocation &&
                                        currentUser.$homeLocation.worldId === worldDialog.id
                                    "
                                    class="inline-block" />
                                {{ worldDialog.ref.name }}
                            </span>
                        </div>
                        <div class="mt-1.5">
                            <span
                                class="cursor-pointer x-grey font-mono break-all"
                                @click="showUserDialog(worldDialog.ref.authorId)"
                                v-text="worldDialog.ref.authorName" />
                        </div>
                        <div class="flex flex-wrap items-center">
                            <Badge class="mr-1.5 mt-1.5" v-if="worldDialog.ref.$isLabs" variant="outline">
                                {{ t('dialog.world.tags.labs') }}
                            </Badge>
                            <Badge
                                class="mr-1.5 mt-1.5"
                                v-else-if="worldDialog.ref.releaseStatus === 'public'"
                                variant="outline">
                                {{ t('dialog.world.tags.public') }}
                            </Badge>
                            <Badge class="mr-1.5 mt-1.5" v-else variant="outline">
                                {{ t('dialog.world.tags.private') }}
                            </Badge>
                            <TooltipWrapper v-if="worldDialog.isPC" side="top" content="PC">
                                <Badge class="text-platform-pc border-platform-pc! mr-1.5 mt-1.5" variant="outline">
                                    <Monitor class="h-4 w-4 text-platform-pc" />
                                    <span
                                        v-if="worldDialog.fileAnalysis.standalonewindows?._fileSize"
                                        class="x-grey text-platform-pc border-l-[0.8px] border-solid ml-1.5 pl-1.5">
                                        {{ worldDialog.fileAnalysis.standalonewindows._fileSize }}
                                    </span>
                                </Badge>
                            </TooltipWrapper>

                            <TooltipWrapper v-if="worldDialog.isQuest" side="top" content="Quest">
                                <Badge
                                    class="text-platform-quest border-platform-quest! mr-1.5 mt-1.5"
                                    variant="outline">
                                    <Smartphone class="h-4 w-4 text-platform-quest" />
                                    <span
                                        v-if="worldDialog.fileAnalysis.android?._fileSize"
                                        class="x-grey text-platform-quest border-l-[0.8px] border-solid ml-1.5 pl-1.5">
                                        {{ worldDialog.fileAnalysis.android._fileSize }}
                                    </span>
                                </Badge>
                            </TooltipWrapper>

                            <TooltipWrapper v-if="worldDialog.isIos" side="top" content="iOS">
                                <Badge class="text-platform-ios border-platform-ios mr-1.5 mt-1.5" variant="outline">
                                    <Apple class="h-4 w-4 text-platform-ios" />
                                    <span
                                        v-if="worldDialog.fileAnalysis.ios?._fileSize"
                                        class="x-grey text-platform-ios border-platform-ios border-l-[0.8px] border-solid ml-1.5 pl-1.5">
                                        {{ worldDialog.fileAnalysis.ios._fileSize }}
                                    </span>
                                </Badge>
                            </TooltipWrapper>

                            <Badge class="mr-1.5 mt-1.5" v-if="worldDialog.avatarScalingDisabled" variant="outline">
                                {{ t('dialog.world.tags.avatar_scaling_disabled') }}
                            </Badge>
                            <Badge class="mr-1.5 mt-1.5" v-if="worldDialog.focusViewDisabled" variant="outline">
                                {{ t('dialog.world.tags.focus_view_disabled') }}
                            </Badge>
                            <Badge class="mr-1.5 mt-1.5" v-if="worldDialog.ref.unityPackageUrl" variant="outline">
                                {{ t('dialog.world.tags.future_proofing') }}
                            </Badge>
                            <Badge
                                v-if="worldDialog.inCache"
                                variant="outline"
                                class="cursor-pointer mr-1.5 mt-1.5"
                                @click="openFolderGeneric(worldDialog.cachePath)">
                                <span v-text="worldDialog.cacheSize" />
                                | {{ t('dialog.world.tags.cache') }}
                            </Badge>
                        </div>
                        <div>
                            <template v-for="tag in worldDialog.ref.tags" :key="tag">
                                <Badge class="mr-1.5 mt-1.5" v-if="tag.startsWith('content_')" variant="outline">
                                    <span v-if="tag === 'content_horror'">
                                        {{ t('dialog.world.tags.content_horror') }}
                                    </span>
                                    <span v-else-if="tag === 'content_gore'">
                                        {{ t('dialog.world.tags.content_gore') }}
                                    </span>
                                    <span v-else-if="tag === 'content_violence'">
                                        {{ t('dialog.world.tags.content_violence') }}
                                    </span>
                                    <span v-else-if="tag === 'content_adult'">
                                        {{ t('dialog.world.tags.content_adult') }}
                                    </span>
                                    <span v-else-if="tag === 'content_sex'">
                                        {{ t('dialog.world.tags.content_sex') }}
                                    </span>
                                    <span v-else>
                                        {{ tag.replace('content_', '') }}
                                    </span>
                                </Badge>
                            </template>
                        </div>
                        <div class="mt-1.5 flex items-center">
                            <span
                                v-show="worldDialog.ref.name !== worldDialog.ref.description"
                                class="min-w-0 flex-1 break-words pr-2 text-xs"
                                >{{ translatedDescription || worldDialog.ref.description }}</span
                            >
                            <Button
                                v-if="
                                    translationApi &&
                                    worldDialog.ref.description &&
                                    worldDialog.ref.name !== worldDialog.ref.description
                                "
                                class="w-3 h-6 text-xs"
                                size="icon-sm"
                                variant="ghost"
                                @click="translateDescription">
                                <Spinner v-if="isTranslating" class="size-1" />
                                <Languages v-else class="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                    <div class="mt-1 shrink-0 self-start sm:ml-2 sm:mt-12">
                        <TooltipWrapper
                            v-if="worldDialog.inCache"
                            side="top"
                            :content="t('dialog.world.actions.delete_cache_tooltip')">
                            <Button
                                class="rounded-full mr-2"
                                size="icon-lg"
                                variant="outline"
                                :ariaLabel="t('common.actions.delete')"
                                :disabled="isGameRunning && worldDialog.cacheLocked"
                                @click="deleteVRChatCache(worldDialog.ref)"
                                ><Trash2
                            /></Button>
                        </TooltipWrapper>
                        <TooltipWrapper
                            v-if="worldDialog.isFavorite"
                            side="top"
                            :content="t('dialog.world.actions.favorites_tooltip')">
                            <Button
                                class="rounded-full"
                                size="icon-lg"
                                @click="worldDialogCommand('Add Favorite')"
                                :ariaLabel="t('dialog.world.actions.favorites_tooltip')"
                                ><Star
                            /></Button>
                        </TooltipWrapper>
                        <TooltipWrapper v-else side="top" :content="t('dialog.world.actions.favorites_tooltip')">
                            <Button
                                class="rounded-full"
                                size="icon-lg"
                                variant="outline"
                                :ariaLabel="t('dialog.world.actions.favorites_tooltip')"
                                @click="worldDialogCommand('Add Favorite')"
                                ><Star
                            /></Button>
                        </TooltipWrapper>
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <Button variant="outline" size="icon-lg" class="rounded-full ml-2">
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem @click="worldDialogCommand('Refresh')">
                                    <RefreshCw class="size-4" />
                                    {{ t('dialog.world.actions.refresh') }}
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="worldDialogCommand('Share')">
                                    <Share2 class="size-4" />
                                    {{ t('dialog.world.actions.share') }}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem @click="worldDialogCommand('New Instance')">
                                    <Flag class="size-4" />
                                    {{ t('dialog.world.actions.new_instance') }}
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="worldDialogCommand('New Instance and Self Invite')">
                                    <MessageSquare class="size-4" />
                                    {{
                                        canOpenInstanceInGame
                                            ? t('dialog.world.actions.new_instance_and_open_ingame')
                                            : t('dialog.world.actions.new_instance_and_self_invite')
                                    }}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    v-if="
                                        currentUser.$homeLocation &&
                                        currentUser.$homeLocation.worldId === worldDialog.id
                                    "
                                    @click="worldDialogCommand('Reset Home')">
                                    <Wand2 class="size-4" />
                                    {{ t('dialog.world.actions.reset_home') }}
                                </DropdownMenuItem>
                                <DropdownMenuItem v-else @click="worldDialogCommand('Make Home')">
                                    <Home class="size-4" />
                                    {{ t('dialog.world.actions.make_home') }}
                                </DropdownMenuItem>
                                <DropdownMenuItem @click="worldDialogCommand('Previous Instances')">
                                    <LineChart class="size-4" />
                                    {{ t('dialog.world.actions.show_previous_instances') }}
                                </DropdownMenuItem>
                                <template v-if="currentUser.id !== worldDialog.ref.authorId">
                                    <DropdownMenuItem
                                        :disabled="!worldDialog.hasPersistData"
                                        @click="worldDialogCommand('Delete Persistent Data')">
                                        <Upload class="size-4" />
                                        {{ t('dialog.world.actions.delete_persistent_data') }}
                                    </DropdownMenuItem>
                                </template>
                                <template v-else>
                                    <DropdownMenuItem @click="worldDialogCommand('Rename')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.rename') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change Description')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.change_description') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change Capacity')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.change_capacity') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change Recommended Capacity')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.change_recommended_capacity') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change YouTube Preview')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.change_preview') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change Tags')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.change_warnings_settings_tags') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change Allowed Domains')">
                                        <Pencil class="size-4" />
                                        {{ t('dialog.world.actions.change_allowed_video_player_domains') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem @click="worldDialogCommand('Change Image')">
                                        <Image class="size-4" />
                                        {{ t('dialog.world.actions.change_image') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        v-if="worldDialog.ref.unityPackageUrl"
                                        @click="worldDialogCommand('Download Unity Package')">
                                        <Download class="size-4" />
                                        {{ t('dialog.world.actions.download_package') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        v-if="
                                            worldDialog.ref?.tags?.includes('system_approved') ||
                                            worldDialog.ref?.tags?.includes('system_labs')
                                        "
                                        @click="worldDialogCommand('Unpublish')">
                                        <Eye class="size-4" />
                                        {{ t('dialog.world.actions.unpublish') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem v-else @click="worldDialogCommand('Publish')">
                                        <Eye class="size-4" />
                                        {{ t('dialog.world.actions.publish_to_labs') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        :disabled="!worldDialog.hasPersistData"
                                        @click="worldDialogCommand('Delete Persistent Data')">
                                        <Upload class="size-4" />
                                        {{ t('dialog.world.actions.delete_persistent_data') }}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem variant="destructive" @click="worldDialogCommand('Delete')">
                                        <Trash2 class="size-4" />
                                        {{ t('dialog.world.actions.delete') }}
                                    </DropdownMenuItem>
                                </template>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
            <div class="sm:hidden mt-2 mb-2 w-full [&_[data-slot=native-select-wrapper]]:w-full">
                <NativeSelect
                    :model-value="worldDialog.activeTab"
                    class="w-full"
                    @update:modelValue="selectWorldDialogTab">
                    <NativeSelectOption v-for="tab in worldDialogTabs" :key="tab.value" :value="tab.value">
                        {{ tab.label }}
                    </NativeSelectOption>
                </NativeSelect>
            </div>
            <TabsUnderline
                v-model="worldDialog.activeTab"
                :items="worldDialogTabs"
                :unmount-on-hide="false"
                fill
                class="max-sm:[&_[role=tabpanel]]:flex-none max-sm:[&_[role=tabpanel]]:overflow-visible"
                tab-list-class="!hidden sm:!flex max-sm:!hidden"
                @update:modelValue="worldDialogTabClick">
                <template #Instances>
                    <WorldDialogInstancesTab />
                </template>
                <template #Info>
                    <WorldDialogInfoTab />
                </template>
                <template #JSON>
                    <DialogJsonTab
                        :tree-data="treeData"
                        :tree-data-key="treeData?.id"
                        :dialog-id="worldDialog.id"
                        :dialog-ref="worldDialog.ref"
                        :file-analysis="worldDialog.fileAnalysis"
                        @refresh="refreshWorldDialogTreeData()" />
                </template>
            </TabsUnderline>
        </div>

        <template v-if="isDialogVisible">
            <WorldAllowedDomainsDialog :world-allowed-domains-dialog="worldAllowedDomainsDialog" />
            <SetWorldTagsDialog
                v-model:is-set-world-tags-dialog-visible="isSetWorldTagsDialogVisible"
                :old-tags="worldDialog.ref?.tags"
                :old-disabled-prop-abilities="worldDialog.ref?.disabledPropAbilities"
                :world-id="worldDialog.id"
                :is-world-dialog-visible="worldDialog.visible" />
            <NewInstanceDialog
                :new-instance-dialog-location-tag="newInstanceDialogLocationTag"
                :last-location="lastLocation" />
            <input
                id="WorldImageUploadButton"
                type="file"
                accept="image/*"
                style="display: none"
                @change="onFileChangeWorldImage" />
            <ImageCropDialog
                :open="cropDialogOpen"
                :title="t('dialog.change_content_image.world')"
                :aspect-ratio="4 / 3"
                :file="cropDialogFile"
                @update:open="cropDialogOpen = $event"
                @confirm="onCropConfirmWorld" />
        </template>
    </div>
</template>

<script setup>
    import {
        Apple,
        Download,
        Ellipsis,
        Eye,
        Flag,
        Home,
        Image,
        Languages,
        LineChart,
        MessageSquare,
        Monitor,
        Pencil,
        RefreshCw,
        Share2,
        Smartphone,
        Star,
        Trash2,
        Upload,
        Wand2
    } from 'lucide-vue-next';
    import { computed, ref, watch } from 'vue';
    import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { Button } from '@/components/ui/button';
    import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
    import { Spinner } from '@/components/ui/spinner';
    import { TabsUnderline } from '@/components/ui/tabs';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';

    import {
        useAdvancedSettingsStore,
        useFavoriteStore,
        useGalleryStore,
        useGameStore,
        useInstanceStore,
        useInviteStore,
        useLocationStore,
        useModalStore,
        useUserStore,
        useWorldStore
    } from '../../../stores';
    import { showWorldDialog } from '../../../coordinators/worldCoordinator';
    import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger
    } from '../../ui/dropdown-menu';
    import { deleteVRChatCache, openFolderGeneric } from '../../../shared/utils';
    import { Badge } from '../../ui/badge';
    import { formatJsonVars } from '../../../shared/utils/base/ui';
    import { runNewInstanceSelfInviteFlow as newInstanceSelfInvite } from '../../../coordinators/inviteCoordinator';
    import { useWorldDialogCommands } from './useWorldDialogCommands';

    import DialogJsonTab from '../DialogJsonTab.vue';
    import ImageCropDialog from '../ImageCropDialog.vue';
    import WorldDialogInfoTab from './WorldDialogInfoTab.vue';
    import WorldDialogInstancesTab from './WorldDialogInstancesTab.vue';
    import { showUserDialog } from '../../../coordinators/userCoordinator';

    import NewInstanceDialog from '../NewInstanceDialog/NewInstanceDialog.vue';
    import SetWorldTagsDialog from './SetWorldTagsDialog.vue';
    import WorldAllowedDomainsDialog from './WorldAllowedDomainsDialog.vue';

    const { currentUser, userDialog } = storeToRefs(useUserStore());
    const worldStore = useWorldStore();
    const { worldDialog } = storeToRefs(worldStore);
    const { cachedWorlds, setWorldDialogActiveTab } = worldStore;
    const { lastLocation } = storeToRefs(useLocationStore());
    const { canOpenInstanceInGame } = useInviteStore();
    const { showFavoriteDialog } = useFavoriteStore();
    const { showPreviousInstancesListDialog: openPreviousInstancesListDialog } = useInstanceStore();
    const { isGameRunning } = storeToRefs(useGameStore());
    const { showFullscreenImageDialog } = useGalleryStore();
    const { bioLanguage, translationApi } = storeToRefs(useAdvancedSettingsStore());
    const { translateText } = useAdvancedSettingsStore();
    const modalStore = useModalStore();

    const { t } = useI18n();

    const {
        worldAllowedDomainsDialog,
        isSetWorldTagsDialogVisible,
        newInstanceDialogLocationTag,
        cropDialogOpen,
        cropDialogFile,
        worldDialogCommand,
        onFileChangeWorldImage,
        onCropConfirmWorld,
        copyWorldName,
        showWorldAllowedDomainsDialog,
        registerCallbacks
    } = useWorldDialogCommands(worldDialog, {
        t,
        toast,
        modalStore,
        userDialog,
        cachedWorlds,
        showWorldDialog,
        showFavoriteDialog,
        newInstanceSelfInvite,
        showPreviousInstancesListDialog: openPreviousInstancesListDialog,
        showFullscreenImageDialog
    });

    registerCallbacks({
        showSetWorldTagsDialog: () => {
            isSetWorldTagsDialogVisible.value = true;
        },
        showWorldAllowedDomainsDialog: () => {
            showWorldAllowedDomainsDialog();
        },
        showChangeWorldImageDialog: () => {
            document.getElementById('WorldImageUploadButton').click();
        }
    });

    const worldDialogTabs = computed(() => [
        { value: 'Instances', label: t('dialog.world.instances.header') },
        { value: 'Info', label: t('dialog.world.info.header') },
        { value: 'JSON', label: t('dialog.world.json.header') }
    ]);

    const treeData = ref({});
    const translatedDescription = ref('');
    const isTranslating = ref(false);
    const imageError = ref(false);

    watch(
        () => worldDialog.value.id,
        () => {
            imageError.value = false;
        }
    );

    const isDialogVisible = computed({
        get() {
            return worldDialog.value.visible;
        },
        set(value) {
            worldDialog.value.visible = value;
        }
    });

    watch(
        () => worldDialog.value.loading,
        () => {
            if (worldDialog.value.visible) {
                handleDialogOpen();
                !worldDialog.value.loading && loadLastActiveTab();
            }
        }
    );

    /**
     *
     * @param tabName
     */
    function handleWorldDialogTab(tabName) {
        worldDialog.value.lastActiveTab = tabName;
        if (tabName === 'JSON') {
            refreshWorldDialogTreeData();
        }
    }

    /**
     *
     */
    function loadLastActiveTab() {
        handleWorldDialogTab(worldDialog.value.lastActiveTab);
    }

    /**
     *
     * @param tabName
     */
    function worldDialogTabClick(tabName) {
        if (tabName === worldDialog.value.lastActiveTab) {
            if (tabName === 'JSON') {
                refreshWorldDialogTreeData();
            }
            return;
        }
        handleWorldDialogTab(tabName);
    }

    function selectWorldDialogTab(tabName) {
        setWorldDialogActiveTab(tabName);
        worldDialogTabClick(tabName);
    }

    /**
     *
     */
    function handleDialogOpen() {
        treeData.value = {};
    }

    /**
     *
     */
    function refreshWorldDialogTreeData() {
        treeData.value = formatJsonVars(worldDialog.value.ref);
    }

    /**
     *
     */
    async function translateDescription() {
        if (isTranslating.value) return;

        const description = worldDialog.value.ref.description;
        if (!description) return;

        // Toggle: if already translated, clear to show original
        if (translatedDescription.value) {
            translatedDescription.value = '';
            return;
        }

        isTranslating.value = true;
        try {
            const translated = await translateText(description, bioLanguage.value);
            if (!translated) {
                throw new Error('No translation returned');
            }

            translatedDescription.value = translated;
        } catch (error) {
            console.error('Translation failed:', error);
        } finally {
            isTranslating.value = false;
        }
    }

    watch(
        () => [worldDialog.value.id, worldDialog.value.ref?.description],
        () => {
            translatedDescription.value = '';
        }
    );
</script>
