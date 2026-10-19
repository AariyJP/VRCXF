<template>
    <div class="flex flex-col gap-10 py-2">
        <!-- Discord Rich Presence -->
        <SettingsGroup :title="t('view.settings.discord_presence.discord_presence.header')">
            <template #description>
                <p class="m-0">{{ t('view.settings.discord_presence.discord_presence.description') }}</p>
                <p class="m-0 cursor-pointer hover:text-foreground transition-colors" @click="showVRChatConfig">
                    {{ t('view.settings.discord_presence.discord_presence.enable_tooltip') }}
                </p>
            </template>

            <SettingsItem :label="t('view.settings.discord_presence.discord_presence.enable')" toggle>
                <Switch
                    :model-value="discordActive"
                    :ariaLabel="t('view.settings.discord_presence.discord_presence.enable')"
                    @update:modelValue="
                        setDiscordActive();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem
                :label="t('view.settings.discord_presence.discord_presence.world_integration')"
                :description="t('view.settings.discord_presence.discord_presence.world_integration_tooltip')"
                toggle>
                <Switch
                    :model-value="discordWorldIntegration"
                    :disabled="!discordActive"
                    :ariaLabel="t('view.settings.discord_presence.discord_presence.world_integration')"
                    @update:modelValue="
                        setDiscordWorldIntegration();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem
                :label="t('view.settings.discord_presence.discord_presence.instance_type_player_count')"
                toggle>
                <Switch
                    :model-value="discordInstance"
                    :disabled="!discordActive"
                    :ariaLabel="t('view.settings.discord_presence.discord_presence.instance_type_player_count')"
                    @update:modelValue="
                        setDiscordInstance();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.discord_presence.discord_presence.show_current_platform')" toggle>
                <Switch
                    :model-value="discordShowPlatform"
                    :disabled="!discordActive || !discordInstance"
                    :ariaLabel="t('view.settings.discord_presence.discord_presence.show_current_platform')"
                    @update:modelValue="
                        setDiscordShowPlatform();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.discord_presence.discord_presence.show_details_in_private')" toggle>
                <Switch
                    :model-value="!discordHideInvite"
                    :disabled="!discordActive"
                    :ariaLabel="t('view.settings.discord_presence.discord_presence.show_details_in_private')"
                    @update:modelValue="
                        setDiscordHideInvite();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem label="プロフィールURLを表示" toggle>
                <Switch
                    :model-value="discordJoinButton"
                    :disabled="!discordActive"
                    ariaLabel="プロフィールURLを表示"
                    @update:modelValue="
                        setDiscordJoinButton();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.discord_presence.discord_presence.show_images')" toggle>
                <Switch
                    :model-value="!discordHideImage"
                    :disabled="!discordActive"
                    :ariaLabel="t('view.settings.discord_presence.discord_presence.show_images')"
                    @update:modelValue="
                        setDiscordHideImage();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem
                :label="t('view.settings.discord_presence.discord_presence.display_world_name_as_discord_status')"
                toggle>
                <Switch
                    :model-value="discordWorldNameAsDiscordStatus"
                    :disabled="!discordActive"
                    :ariaLabel="
                        t('view.settings.discord_presence.discord_presence.display_world_name_as_discord_status')
                    "
                    @update:modelValue="
                        setDiscordWorldNameAsDiscordStatus();
                        saveDiscordOption();
                    " />
            </SettingsItem>

            <SettingsItem label="プレイ時間を延長（時間）">
                <NumberField
                    :model-value="discordTimeOffsetHours"
                    :min="0"
                    :step="1"
                    :disabled="!discordActive"
                    class="w-28"
                    @update:modelValue="
                        setDiscordTimeOffsetHours($event);
                        saveDiscordOption();
                    ">
                    <NumberFieldContent>
                        <NumberFieldDecrement />
                        <NumberFieldInput />
                        <NumberFieldIncrement />
                    </NumberFieldContent>
                </NumberField>
            </SettingsItem>
        </SettingsGroup>

        <!-- Translation API -->
        <SettingsGroup :title="t('view.settings.advanced.advanced.translation_api.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.translation_api.enable')"
                :description="t('view.settings.advanced.advanced.translation_api.enable_tooltip')"
                toggle>
                <Switch
                    :model-value="translationApi"
                    :ariaLabel="t('view.settings.advanced.advanced.translation_api.enable')"
                    @update:modelValue="changeTranslationAPI('VRCX_translationAPI')" />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.advanced.advanced.translation_api.translation_api_key')">
                <Button size="sm" variant="outline" @click="showTranslationApiDialog">
                    <Languages class="h-4 w-4 mr-1.5" />
                    {{ t('view.settings.advanced.advanced.translation_api.translation_api_key') }}
                </Button>
            </SettingsItem>
        </SettingsGroup>

        <!-- YouTube API -->
        <SettingsGroup :title="t('view.settings.advanced.advanced.youtube_api.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.youtube_api.enable')"
                :description="t('view.settings.advanced.advanced.youtube_api.enable_tooltip')"
                toggle>
                <Switch
                    :model-value="youTubeApi"
                    :ariaLabel="t('view.settings.advanced.advanced.youtube_api.enable')"
                    @update:modelValue="changeYouTubeApi('VRCX_youtubeAPI')" />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.advanced.advanced.youtube_api.youtube_api_key')">
                <Button size="sm" variant="outline" @click="showYouTubeApiDialog">{{
                    t('view.settings.advanced.advanced.youtube_api.youtube_api_key')
                }}</Button>
            </SettingsItem>
        </SettingsGroup>

        <!-- Remote Database -->
        <SettingsGroup :title="t('view.settings.advanced.advanced.remote_database.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.remote_database.enable')"
                :description="t('view.settings.advanced.advanced.remote_database.enable_description')"
                toggle>
                <Switch
                    :model-value="avatarRemoteDatabase"
                    :ariaLabel="t('view.settings.advanced.advanced.remote_database.enable')"
                    @update:modelValue="setAvatarRemoteDatabase(!avatarRemoteDatabase)" />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.advanced.advanced.remote_database.avatar_database_provider')">
                <Button size="sm" variant="outline" @click="showAvatarProviderDialog">{{
                    t('view.settings.advanced.advanced.remote_database.avatar_database_provider')
                }}</Button>
            </SettingsItem>
        </SettingsGroup>

        <SettingsGroup v-if="!BROWSER" title="Google Drive バックアップ">
            <template #description>
                <p class="m-0">データベース (VRCX.sqlite3) を Google Drive のアプリ専用領域に保存・復元します。</p>
            </template>

            <SettingsItem label="Google アカウント" :description="googleDriveAccountText">
                <Button
                    v-if="googleDrive.status.signedIn"
                    size="sm"
                    variant="outline"
                    :disabled="googleDrive.busy"
                    @click="signOutGoogleDrive">
                    ログアウト
                </Button>
                <Button
                    v-else-if="googleDrive.action === 'signIn'"
                    size="sm"
                    variant="outline"
                    @click="cancelGoogleDriveSignIn">
                    キャンセル
                </Button>
                <Button
                    v-else
                    size="sm"
                    variant="outline"
                    :disabled="googleDrive.busy || !googleDrive.status.configured"
                    @click="signInGoogleDrive">
                    ログイン
                </Button>
            </SettingsItem>

            <SettingsItem label="バックアップ" :description="googleDriveBackupText">
                <Button
                    size="sm"
                    variant="outline"
                    :disabled="googleDrive.busy || !googleDrive.status.signedIn"
                    @click="backupGoogleDrive">
                    {{ googleDrive.action === 'backup' ? 'アップロード中...' : '今すぐバックアップ' }}
                </Button>
            </SettingsItem>

            <SettingsItem
                label="復元"
                description="Google Drive のバックアップで現在のデータベースを置き換え、アプリを再起動します。">
                <Button
                    size="sm"
                    variant="outline"
                    :disabled="googleDrive.busy || !googleDrive.status.backup"
                    @click="restoreGoogleDrive">
                    {{ googleDrive.action === 'restore' ? '復元中...' : '復元' }}
                </Button>
            </SettingsItem>
        </SettingsGroup>

        <TranslationApiDialog v-model:isTranslationApiDialogVisible="isTranslationApiDialogVisible" />
        <YouTubeApiDialog v-model:isYouTubeApiDialogVisible="isYouTubeApiDialogVisible" />
        <AvatarProviderDialog v-model:isAvatarProviderDialogVisible="isAvatarProviderDialogVisible" />
    </div>
</template>

<script setup>
    import { computed, onMounted, reactive, ref } from 'vue';
    import { Languages } from 'lucide-vue-next';
    import { Button } from '@/components/ui/button';
    import {
        NumberField,
        NumberFieldContent,
        NumberFieldDecrement,
        NumberFieldIncrement,
        NumberFieldInput
    } from '@/components/ui/number-field';
    import { Switch } from '@/components/ui/switch';
    import { storeToRefs } from 'pinia';
    import { toast } from 'vue-sonner';
    import { useI18n } from 'vue-i18n';

    import { formatDateFilter, formatFileSize } from '@/shared/utils';

    import {
        useAdvancedSettingsStore,
        useAvatarProviderStore,
        useDiscordPresenceSettingsStore,
        useModalStore,
        useVrStore
    } from '@/stores';

    import AvatarProviderDialog from '../../dialogs/AvatarProviderDialog.vue';
    import TranslationApiDialog from '../../dialogs/TranslationApiDialog.vue';
    import YouTubeApiDialog from '../../dialogs/YouTubeApiDialog.vue';
    import SettingsGroup from '../SettingsGroup.vue';
    import SettingsItem from '../SettingsItem.vue';

    const { t } = useI18n();

    const advancedSettingsStore = useAdvancedSettingsStore();
    const { updateVRLastLocation, updateOpenVR } = useVrStore();

    const {
        setDiscordActive,
        setDiscordInstance,
        setDiscordHideInvite,
        setDiscordJoinButton,
        setDiscordHideImage,
        setDiscordShowPlatform,
        setDiscordWorldIntegration,
        setDiscordWorldNameAsDiscordStatus,
        setDiscordTimeOffsetHours,
        saveDiscordOption
    } = useDiscordPresenceSettingsStore();

    const {
        discordActive,
        discordInstance,
        discordHideInvite,
        discordJoinButton,
        discordHideImage,
        discordShowPlatform,
        discordWorldIntegration,
        discordWorldNameAsDiscordStatus,
        discordTimeOffsetHours
    } = storeToRefs(useDiscordPresenceSettingsStore());

    const { showVRChatConfig } = advancedSettingsStore;

    const { avatarRemoteDatabase, youTubeApi, translationApi } = storeToRefs(advancedSettingsStore);

    const { setAvatarRemoteDatabase } = advancedSettingsStore;

    const { isAvatarProviderDialogVisible } = storeToRefs(useAvatarProviderStore());
    const { showAvatarProviderDialog } = useAvatarProviderStore();

    const isYouTubeApiDialogVisible = ref(false);
    const isTranslationApiDialogVisible = ref(false);

    function showYouTubeApiDialog() {
        isYouTubeApiDialogVisible.value = true;
    }

    function showTranslationApiDialog() {
        isTranslationApiDialogVisible.value = true;
    }

    /**
     * @param configKey
     */
    async function changeYouTubeApi(configKey = '') {
        if (configKey === 'VRCX_youtubeAPI') {
            advancedSettingsStore.setYouTubeApi();
        }
        updateVRLastLocation();
        updateOpenVR();
    }

    /**
     * @param configKey
     */
    async function changeTranslationAPI(configKey = '') {
        if (configKey === 'VRCX_translationAPI') {
            advancedSettingsStore.setTranslationApi();
        }
    }

    const modalStore = useModalStore();

    const googleDrive = reactive({
        status: { configured: false, signedIn: false, email: '', backup: null, error: null },
        busy: false,
        action: '',
        signInCancelled: false
    });

    const googleDriveAccountText = computed(() => {
        if (!googleDrive.status.configured) {
            return 'このビルドでは Google Drive 連携が設定されていません。';
        }
        if (googleDrive.action === 'signIn') {
            return 'ブラウザで Google の認証を完了してください。';
        }
        if (!googleDrive.status.signedIn) {
            return '未ログイン';
        }
        return googleDrive.status.email || 'ログイン済み';
    });

    const googleDriveBackupText = computed(() => {
        if (googleDrive.status.error) {
            return `状態の取得に失敗しました: ${googleDrive.status.error}`;
        }
        const backup = googleDrive.status.backup;
        if (!backup) {
            return 'Google Drive にバックアップはありません。';
        }
        return `最終バックアップ: ${formatDateFilter(backup.modifiedTime, 'long')} (${formatFileSize(Number(backup.size))})`;
    });

    function applyGoogleDriveStatus(json) {
        Object.assign(googleDrive.status, JSON.parse(json));
    }

    async function runGoogleDriveAction(action, task) {
        if (googleDrive.busy) {
            return;
        }
        googleDrive.busy = true;
        googleDrive.action = action;
        try {
            await task();
        } catch (err) {
            if (!googleDrive.signInCancelled) {
                toast.error(`Google Drive: ${err?.message ?? err}`);
            }
            await refreshGoogleDriveStatus();
        } finally {
            googleDrive.busy = false;
            googleDrive.action = '';
        }
    }

    async function refreshGoogleDriveStatus() {
        try {
            applyGoogleDriveStatus(await AppApi.GoogleDriveGetStatus());
        } catch (err) {
            console.error('Failed to get Google Drive status', err);
        }
    }

    function signInGoogleDrive() {
        googleDrive.signInCancelled = false;
        return runGoogleDriveAction('signIn', async () => {
            applyGoogleDriveStatus(await AppApi.GoogleDriveSignIn());
            toast.success('Google Drive にログインしました。');
        });
    }

    function cancelGoogleDriveSignIn() {
        googleDrive.signInCancelled = true;
        AppApi.GoogleDriveCancelSignIn();
    }

    function signOutGoogleDrive() {
        return runGoogleDriveAction('signOut', async () => {
            await AppApi.GoogleDriveSignOut();
            await refreshGoogleDriveStatus();
        });
    }

    async function backupGoogleDrive() {
        const { ok } = await modalStore.confirm({
            title: 'Google Drive にバックアップ',
            description:
                'Google Drive 上の既存のバックアップは削除され、現在のデータベースで置き換えられます。削除したバックアップは元に戻せません。続行しますか？',
            confirmText: 'バックアップ',
            destructive: true
        });
        if (!ok) {
            return;
        }
        await runGoogleDriveAction('backup', async () => {
            applyGoogleDriveStatus(await AppApi.GoogleDriveBackup());
            toast.success('Google Drive にバックアップしました。');
        });
    }

    async function restoreGoogleDrive() {
        const { ok } = await modalStore.confirm({
            title: 'Google Drive から復元',
            description: '現在のデータベースはバックアップの内容で上書きされ、アプリが再起動します。続行しますか？',
            confirmText: '復元',
            destructive: true
        });
        if (!ok) {
            return;
        }
        await runGoogleDriveAction('restore', async () => {
            const restored = await AppApi.GoogleDriveRestore();
            if (!restored) {
                throw new Error('バックアップが有効な SQLite データベースではないか、置き換えに失敗しました。');
            }
            if (LINUX) {
                window.electron.restartApp();
            }
        });
    }

    onMounted(() => {
        if (!BROWSER) {
            refreshGoogleDriveStatus();
        }
    });
</script>
