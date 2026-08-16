<template>
    <div class="flex flex-col gap-10 py-2">
        <SettingsGroup v-if="!BROWSER" :title="t('view.settings.advanced.advanced.vrchat_settings.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.relaunch_vrchat.header')"
                :description="t('view.settings.advanced.advanced.relaunch_vrchat.description')">
                <Switch
                    :model-value="relaunchVRChatAfterCrash"
                    :ariaLabel="t('view.settings.advanced.advanced.relaunch_vrchat.header')"
                    @update:modelValue="setRelaunchVRChatAfterCrash" />
            </SettingsItem>

            <SettingsItem
                :label="t('view.settings.advanced.advanced.vrchat_quit_fix.header')"
                :description="t('view.settings.advanced.advanced.vrchat_quit_fix.description')">
                <Switch
                    :model-value="vrcQuitFix"
                    :ariaLabel="t('view.settings.advanced.advanced.vrchat_quit_fix.header')"
                    @update:modelValue="setVrcQuitFix" />
            </SettingsItem>

            <SettingsItem
                :label="t('view.settings.advanced.advanced.auto_cache_management.header')"
                :description="t('view.settings.advanced.advanced.auto_cache_management.description')">
                <Switch
                    :model-value="autoSweepVRChatCache"
                    :ariaLabel="t('view.settings.advanced.advanced.auto_cache_management.header')"
                    @update:modelValue="setAutoSweepVRChatCache" />
            </SettingsItem>

            <SettingsItem
                :label="t('view.settings.advanced.advanced.self_invite.header')"
                :description="t('view.settings.advanced.advanced.self_invite.description')">
                <Switch
                    :model-value="selfInviteOverride"
                    :ariaLabel="t('view.settings.advanced.advanced.self_invite.header')"
                    @update:modelValue="setSelfInviteOverride" />
            </SettingsItem>
        </SettingsGroup>

        <SettingsGroup title="WebSocket">
            <SettingsItem
                label="WebSocketに自動接続する"
                description="WebSocketに接続すると、VRChatでアクティブとして表示されます。">
                <Switch
                    :model-value="webSocketAutoConnectEnabled"
                    @update:modelValue="setWebSocketAutoConnectEnabled" />
            </SettingsItem>
        </SettingsGroup>

        <SettingsGroup :title="t('view.settings.advanced_groups.security.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.primary_password.header')"
                :description="t('view.settings.advanced.advanced.primary_password.description')">
                <Switch
                    :model-value="enablePrimaryPassword"
                    :disabled="!enablePrimaryPassword"
                    :ariaLabel="t('view.settings.advanced.advanced.primary_password.header')"
                    @update:modelValue="enablePrimaryPasswordChange" />
            </SettingsItem>
        </SettingsGroup>

        <SettingsGroup v-if="!BROWSER" :title="t('view.settings.general.logging.header')">
            <SettingsItem :label="t('view.settings.advanced.advanced.cache_debug.udon_exception_logging')">
                <Switch
                    :model-value="udonExceptionLogging"
                    :ariaLabel="t('view.settings.advanced.advanced.cache_debug.udon_exception_logging')"
                    @update:modelValue="setUdonExceptionLogging" />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.general.logging.resource_load')">
                <Switch
                    :model-value="logResourceLoad"
                    :ariaLabel="t('view.settings.general.logging.resource_load')"
                    @update:modelValue="setLogResourceLoad" />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.general.logging.empty_avatar')">
                <Switch
                    :model-value="logEmptyAvatars"
                    :ariaLabel="t('view.settings.general.logging.empty_avatar')"
                    @update:modelValue="setLogEmptyAvatars" />
            </SettingsItem>

            <SettingsItem :label="t('view.settings.general.logging.auto_login_delay')">
                <Switch
                    :model-value="autoLoginDelayEnabled"
                    :ariaLabel="t('view.settings.general.logging.auto_login_delay')"
                    @update:modelValue="setAutoLoginDelayEnabled" />
            </SettingsItem>

            <SettingsItem
                v-if="autoLoginDelayEnabled"
                :label="t('view.settings.general.logging.auto_login_delay_button')">
                <Button size="sm" variant="outline" @click="promptAutoLoginDelaySeconds">
                    {{ t('view.settings.general.logging.auto_login_delay_button') }}
                </Button>
            </SettingsItem>
        </SettingsGroup>

        <template v-if="!isLinux && !BROWSER">
            <SettingsGroup :title="t('view.settings.advanced.advanced.app_launcher.header')">
                <SettingsItem :label="t('view.settings.advanced.advanced.app_launcher.folder')">
                    <Button size="sm" variant="outline" @click="openShortcutFolder()">{{
                        t('view.settings.advanced.advanced.app_launcher.folder')
                    }}</Button>
                </SettingsItem>

                <SettingsItem
                    :label="t('view.settings.advanced.advanced.remote_database.enable')"
                    :description="t('view.settings.advanced.advanced.app_launcher.folder_tooltip')">
                    <Switch
                        :model-value="enableAppLauncher"
                        :ariaLabel="t('view.settings.advanced.advanced.remote_database.enable')"
                        @update:modelValue="setEnableAppLauncher" />
                </SettingsItem>

                <SettingsItem :label="t('view.settings.advanced.advanced.app_launcher.auto_close')">
                    <Switch
                        :model-value="enableAppLauncherAutoClose"
                        :ariaLabel="t('view.settings.advanced.advanced.app_launcher.auto_close')"
                        @update:modelValue="setEnableAppLauncherAutoClose" />
                </SettingsItem>

                <SettingsItem :label="t('view.settings.advanced.advanced.app_launcher.run_process_once')">
                    <Switch
                        :model-value="enableAppLauncherRunProcessOnce"
                        :ariaLabel="t('view.settings.advanced.advanced.app_launcher.run_process_once')"
                        @update:modelValue="setEnableAppLauncherRunProcessOnce" />
                </SettingsItem>
            </SettingsGroup>
        </template>

        <SettingsGroup :title="t('view.settings.advanced.advanced.launch_commands.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.launch_commands.show_confirmation_on_switch_avatar_enable')"
                :description="
                    t('view.settings.advanced.advanced.launch_commands.show_confirmation_on_switch_avatar_tooltip')
                ">
                <Switch
                    :model-value="showConfirmationOnSwitchAvatar"
                    :ariaLabel="
                        t('view.settings.advanced.advanced.launch_commands.show_confirmation_on_switch_avatar_enable')
                    "
                    @update:modelValue="setShowConfirmationOnSwitchAvatar" />
            </SettingsItem>

            <div class="flex gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    @click="openExternalLink('https://github.com/vrcx-team/VRCX/wiki/Launch-parameters-&-VRCX.json')"
                    >{{ t('view.settings.advanced.advanced.launch_commands.docs') }}</Button
                >
                <Button
                    size="sm"
                    variant="outline"
                    @click="openExternalLink('https://github.com/Myrkie/open-in-vrcx')"
                    >{{ t('view.settings.advanced.advanced.launch_commands.website_userscript') }}</Button
                >
            </div>
        </SettingsGroup>

        <SettingsGroup :title="t('view.settings.advanced.advanced.cache_debug.header')">
            <div class="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" @click="clearVRCXCache">{{
                    t('view.settings.advanced.advanced.cache_debug.clear_cache')
                }}</Button>
                <Button size="sm" variant="outline" @click="promptAutoClearVRCXCacheFrequency">{{
                    t('view.settings.advanced.advanced.cache_debug.auto_clear_cache')
                }}</Button>
                <Button size="sm" variant="outline" @click="refreshCacheSize">{{
                    t('view.settings.advanced.advanced.cache_debug.refresh_cache')
                }}</Button>
            </div>

            <SettingsItem
                :label="`${t('view.settings.advanced.advanced.cache_debug.disable_gamelog')} ${t('view.settings.advanced.advanced.cache_debug.disable_gamelog_notice')}`">
                <Switch
                    :model-value="gameLogDisabled"
                    :ariaLabel="t('view.settings.advanced.advanced.cache_debug.disable_gamelog')"
                    @update:modelValue="disableGameLogDialog()" />
            </SettingsItem>

            <div class="flex flex-col gap-1 text-sm">
                <span
                    >{{ t('view.settings.advanced.advanced.cache_debug.user_cache') }}
                    <span v-text="cacheSize.cachedUsers"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.cache_debug.world_cache') }}
                    <span v-text="cacheSize.cachedWorlds"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.cache_debug.avatar_cache') }}
                    <span v-text="cacheSize.cachedAvatars"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.cache_debug.group_cache') }}
                    <span v-text="cacheSize.cachedGroups"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.cache_debug.avatar_name_cache') }}
                    <span v-text="cacheSize.cachedAvatarNames"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.cache_debug.instance_cache') }}
                    <span v-text="cacheSize.cachedInstances"></span
                ></span>
            </div>

            <SettingsItem v-if="!BROWSER" :label="t('view.settings.advanced.advanced.cache_debug.show_console')">
                <Button size="sm" variant="outline" @click="showConsole">{{
                    t('view.settings.advanced.advanced.cache_debug.show_console')
                }}</Button>
            </SettingsItem>
        </SettingsGroup>

        <SettingsGroup :title="t('view.settings.advanced_groups.database.header')">
            <SettingsItem :label="t('view.settings.advanced.advanced.sqlite_table_size.refresh')">
                <Button size="sm" variant="outline" @click="getSqliteTableSizes">{{
                    t('view.settings.advanced.advanced.sqlite_table_size.refresh')
                }}</Button>
            </SettingsItem>

            <div class="flex flex-col gap-1 text-sm">
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.gps') }}
                    <span v-text="sqliteTableSizes.gps"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.status') }}
                    <span v-text="sqliteTableSizes.status"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.bio') }}
                    <span v-text="sqliteTableSizes.bio"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.avatar') }}
                    <span v-text="sqliteTableSizes.avatar"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.online_offline') }}
                    <span v-text="sqliteTableSizes.onlineOffline"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.friend_log_history') }}
                    <span v-text="sqliteTableSizes.friendLogHistory"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.notification') }}
                    <span v-text="sqliteTableSizes.notification"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.location') }}
                    <span v-text="sqliteTableSizes.location"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.join_leave') }}
                    <span v-text="sqliteTableSizes.joinLeave"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.portal_spawn') }}
                    <span v-text="sqliteTableSizes.portalSpawn"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.video_play') }}
                    <span v-text="sqliteTableSizes.videoPlay"></span
                ></span>
                <span
                    >{{ t('view.settings.advanced.advanced.sqlite_table_size.event') }}
                    <span v-text="sqliteTableSizes.event"></span
                ></span>
            </div>

            <Separator class="my-2" />
            <SettingsItem label="データベースをインポート">
                <Button size="sm" variant="outline" :disabled="dbImport.loading" @click="triggerDbImport">
                    {{ dbImport.loading ? 'インポート中...' : 'ファイルを選択' }}
                </Button>
            </SettingsItem>
            <input
                v-if="BROWSER"
                ref="dbFileInputRef"
                type="file"
                accept=".db,.sqlite,.sqlite3"
                class="hidden"
                @change="handleDbFileImport" />
        </SettingsGroup>

        <SettingsGroup :title="t('view.settings.advanced.advanced.database_cleanup.header')">
            <SettingsItem
                :label="t('view.settings.advanced.advanced.database_cleanup.auto_cleanup')"
                :description="t('view.settings.advanced.advanced.database_cleanup.auto_cleanup_description')">
                <Select :model-value="avatarAutoCleanup" @update:modelValue="setAvatarAutoCleanup">
                    <SelectTrigger class="w-36">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectItem value="Off">{{
                                t('view.settings.advanced.advanced.database_cleanup.auto_cleanup_off')
                            }}</SelectItem>
                            <SelectItem value="30">{{
                                t('view.settings.advanced.advanced.database_cleanup.auto_cleanup_30')
                            }}</SelectItem>
                            <SelectItem value="90">{{
                                t('view.settings.advanced.advanced.database_cleanup.auto_cleanup_90')
                            }}</SelectItem>
                            <SelectItem value="180">{{
                                t('view.settings.advanced.advanced.database_cleanup.auto_cleanup_180')
                            }}</SelectItem>
                            <SelectItem value="365">{{
                                t('view.settings.advanced.advanced.database_cleanup.auto_cleanup_365')
                            }}</SelectItem>
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </SettingsItem>

            <SettingsItem :label="t('view.settings.advanced.advanced.database_cleanup.purge_button')">
                <Button size="sm" variant="outline" @click="isPurgeDialogVisible = true">
                    <Trash2 class="h-4 w-4 mr-1" />
                    {{ t('view.settings.advanced.advanced.database_cleanup.purge') }}
                </Button>
            </SettingsItem>
        </SettingsGroup>

        <Dialog
            :open="isPurgeDialogVisible"
            @update:open="
                (open) => {
                    if (!open) isPurgeDialogVisible = false;
                }
            ">
            <DialogContent class="x-dialog sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{{
                        t('view.settings.advanced.advanced.database_cleanup.purge_confirm_title')
                    }}</DialogTitle>
                </DialogHeader>

                <Alert variant="warning" class="mb-3">
                    <TriangleAlert />
                    <AlertDescription>
                        {{ t('view.settings.advanced.advanced.database_cleanup.purge_confirm_alert') }}
                    </AlertDescription>
                </Alert>

                <div class="flex flex-col gap-1 text-sm text-muted-foreground mb-3">
                    <p>{{ t('view.settings.advanced.advanced.database_cleanup.purge_confirm_description_1') }}</p>
                    <p>{{ t('view.settings.advanced.advanced.database_cleanup.purge_confirm_description_2') }}</p>
                    <p>{{ t('view.settings.advanced.advanced.database_cleanup.purge_confirm_description_3') }}</p>
                </div>

                <SettingsItem :label="t('view.settings.advanced.advanced.database_cleanup.purge_older_than')">
                    <Select v-model="selectedPurgePeriod">
                        <SelectTrigger class="w-36">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="180">{{
                                    t('view.settings.advanced.advanced.database_cleanup.purge_option_180')
                                }}</SelectItem>
                                <SelectItem value="365">{{
                                    t('view.settings.advanced.advanced.database_cleanup.purge_option_365')
                                }}</SelectItem>
                                <SelectItem value="730">{{
                                    t('view.settings.advanced.advanced.database_cleanup.purge_option_730')
                                }}</SelectItem>
                                <SelectItem value="all">{{
                                    t('view.settings.advanced.advanced.database_cleanup.purge_option_all')
                                }}</SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </SettingsItem>

                <DialogFooter>
                    <Button variant="outline" size="sm" @click="isPurgeDialogVisible = false">
                        {{ t('confirm.cancel_button') }}
                    </Button>
                    <Button size="sm" variant="destructive" :disabled="purgeInProgress" @click="handlePurge">
                        <Trash2 class="h-4 w-4 mr-1" />
                        {{ t('view.settings.advanced.advanced.database_cleanup.purge_confirm_button') }}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <SettingsGroup :title="t('view.settings.advanced_groups.diagnostics.header')">
            <SettingsItem :label="t('view.profile.game_info.online_users')">
                <div class="flex items-center gap-2">
                    <span v-if="visits !== null" class="text-sm text-muted-foreground">{{
                        t('view.profile.game_info.user_online', { count: visits })
                    }}</span>
                    <Button size="sm" variant="outline" @click="getVisits">{{ t('common.actions.refresh') }}</Button>
                </div>
            </SettingsItem>

            <SettingsItem :label="t('view.profile.config_json')">
                <div class="flex items-center gap-2">
                    <Button size="sm" variant="outline" @click="refreshConfigTreeData()">{{
                        t('common.actions.refresh')
                    }}</Button>
                    <Button
                        v-if="Object.keys(configTreeData).length > 0"
                        size="sm"
                        variant="outline"
                        @click="configTreeData = {}"
                        >{{ t('common.actions.clear') }}</Button
                    >
                </div>
            </SettingsItem>
            <vue-json-pretty
                v-if="Object.keys(configTreeData).length > 0"
                :data="configTreeData"
                :deep="2"
                :theme="isDarkMode ? 'dark' : 'light'"
                :height="800"
                :dynamic-height="false"
                virtual
                show-icon />

            <div class="mt-2 border-t pt-3">
                <div
                    class="overflow-hidden rounded-md border bg-zinc-50 font-[monospace,var(--font-primary-cjk)] text-xs dark:bg-zinc-900">
                    <div class="flex items-center gap-2 bg-zinc-100 p-1.5 dark:bg-zinc-800">
                        <span class="shrink-0 px-1 font-sans text-sm font-medium">DevTools Console</span>
                        <InputGroupSearch
                            v-model="browserConsoleFilter"
                            class="h-7 min-w-0 flex-1 bg-zinc-50 font-sans shadow-none dark:bg-zinc-900"
                            input-class="font-sans text-xs"
                            placeholder="Filter" />
                        <DropdownMenu>
                            <DropdownMenuTrigger as-child>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    class="h-7 w-36 justify-between bg-zinc-50 px-2 font-sans text-xs dark:bg-zinc-900">
                                    <span class="flex items-center gap-1.5">
                                        <ListFilter class="size-3.5 text-cyan-500" />
                                        {{ browserConsoleLevelLabel }}
                                    </span>
                                    <ChevronDown class="size-3.5 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" class="w-44 bg-zinc-50 dark:bg-zinc-900">
                                <DropdownMenuItem @select="resetBrowserConsoleLevels">
                                    <ListFilter class="size-4 text-cyan-500" />
                                    <span class="text-cyan-500">Default</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                    v-for="option in browserConsoleLevelOptions"
                                    :key="option.value"
                                    :model-value="isBrowserConsoleLevelEnabled(option.value)"
                                    @select.prevent
                                    @update:modelValue="setBrowserConsoleLevel(option.value, $event)">
                                    <component :is="option.icon" class="size-4" :class="option.class" />
                                    <span :class="option.class">{{ option.label }}</span>
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <TooltipWrapper content="Scroll to bottom" side="top">
                            <Button size="icon-sm" variant="ghost" @click="scrollBrowserConsoleToBottom">
                                <ArrowDownToLine class="size-4" />
                            </Button>
                        </TooltipWrapper>
                        <TooltipWrapper content="Clear console" side="top">
                            <Button size="icon-sm" variant="ghost" @click="clearBrowserConsoleLogs">
                                <Trash2 class="size-4" />
                            </Button>
                        </TooltipWrapper>
                    </div>
                    <Separator />
                    <div :style="{ height: `${browserConsoleHeight}px` }">
                        <ScrollArea ref="browserConsoleOutputRef" class="h-full">
                            <template v-for="(entry, index) in filteredBrowserConsoleLogs" :key="entry.id">
                                <div
                                    class="flex min-w-0 gap-2 px-2 py-1"
                                    :class="getBrowserConsoleEntryClass(entry.level)">
                                    <span class="flex w-4 shrink-0 justify-center pt-0.5">
                                        <Info v-if="entry.level === 'info'" class="size-3.5 text-blue-500" />
                                        <TriangleAlert
                                            v-else-if="entry.level === 'warn'"
                                            class="size-3.5 text-amber-500" />
                                        <CircleX
                                            v-else-if="entry.level === 'error'"
                                            class="size-3.5 text-red-700 dark:text-red-300" />
                                        <span v-else-if="entry.level === 'command'" class="text-blue-500">&gt;</span>
                                        <span v-else-if="entry.level === 'result'" class="text-blue-500">&lt;</span>
                                    </span>
                                    <span class="min-w-0 flex-1 whitespace-pre-wrap break-all">{{
                                        entry.message
                                    }}</span>
                                    <span class="shrink-0 pr-3 text-muted-foreground">{{
                                        formatBrowserConsoleTime(entry.time)
                                    }}</span>
                                </div>
                                <Separator v-if="index < filteredBrowserConsoleLogs.length - 1" />
                            </template>
                            <div
                                v-if="filteredBrowserConsoleLogs.length === 0"
                                class="px-3 py-4 text-center text-muted-foreground">
                                ログはありません。
                            </div>
                        </ScrollArea>
                    </div>
                    <div
                        role="separator"
                        tabindex="0"
                        aria-label="Resize console"
                        aria-orientation="horizontal"
                        :aria-valuemin="browserConsoleMinHeight"
                        :aria-valuemax="browserConsoleMaxHeight"
                        :aria-valuenow="browserConsoleHeight"
                        class="group flex h-4 touch-none cursor-ns-resize items-center justify-center border-y bg-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-800"
                        @pointerdown="startBrowserConsoleResize"
                        @keydown="handleBrowserConsoleResizeKeydown">
                        <span
                            class="h-1 w-12 rounded-full bg-zinc-400 transition-colors group-hover:bg-primary group-focus-visible:bg-primary dark:bg-zinc-500" />
                    </div>
                    <form @submit.prevent="executeBrowserConsole">
                        <InputGroup class="rounded-none border-0 bg-zinc-50 shadow-none dark:bg-zinc-900">
                            <InputGroupAddon class="pl-2 text-blue-500">&gt;</InputGroupAddon>
                            <InputGroupInput
                                v-model="browserConsoleCommand"
                                class="h-9 px-2 text-xs"
                                autocomplete="off"
                                aria-label="Console command"
                                @keydown="handleBrowserConsoleKeydown" />
                        </InputGroup>
                    </form>
                </div>
            </div>
        </SettingsGroup>

        <template v-if="branch === 'Nightly'">
            <SettingsGroup :title="t('view.settings.advanced_groups.nightly.header')">
                <SettingsItem
                    :label="t('view.settings.advanced.advanced.anonymous_error_reporting.header')"
                    :description="t('view.settings.advanced.advanced.anonymous_error_reporting.description')">
                    <Switch :model-value="sentryErrorReporting" @update:modelValue="setSentryErrorReporting()" />
                </SettingsItem>
            </SettingsGroup>
        </template>

        <RegistryBackupDialog />
        <PhotonSettings v-if="photonLoggingEnabled" />
    </div>
</template>

<script setup>
    import {
        ArrowDownToLine,
        Bug,
        ChevronDown,
        CircleX,
        Info,
        ListFilter,
        Trash2,
        TriangleAlert
    } from 'lucide-vue-next';
    import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
    import { Button } from '@/components/ui/button';
    import {
        DropdownMenu,
        DropdownMenuCheckboxItem,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger
    } from '@/components/ui/dropdown-menu';
    import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupSearch } from '@/components/ui/input-group';
    import { ScrollArea } from '@/components/ui/scroll-area';
    import { Separator } from '@/components/ui/separator';
    import { Switch } from '@/components/ui/switch';
    import { TooltipWrapper } from '@/components/ui/tooltip';
    import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
    import { Alert, AlertDescription } from '@/components/ui/alert';
    import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
    import { storeToRefs } from 'pinia';
    import { useI18n } from 'vue-i18n';
    import { toast } from 'vue-sonner';

    import VueJsonPretty from 'vue-json-pretty';

    import {
        useAdvancedSettingsStore,
        useAppearanceSettingsStore,
        useAuthStore,
        useAvatarStore,
        useGeneralSettingsStore,
        useGroupStore,
        useInstanceStore,
        usePhotonStore,
        useUiStore,
        useUserStore,
        useVRCXUpdaterStore,
        useWorldStore
    } from '@/stores';
    import { authRequest, queryRequest } from '@/api';
    import { disableGameLogDialog } from '@/coordinators/gameLogCoordinator';
    import { clearVRCXCache } from '@/coordinators/vrcxCoordinator';
    import {
        browserConsoleLogs,
        clearBrowserConsoleLogs,
        executeBrowserConsoleCommand
    } from '@/services/browserConsoleLog';
    import { openExternalLink } from '@/shared/utils';

    import PhotonSettings from '../PhotonSettings.vue';
    import RegistryBackupDialog from '../../../Tools/dialogs/RegistryBackupDialog.vue';
    import SettingsGroup from '../SettingsGroup.vue';
    import SettingsItem from '../SettingsItem.vue';

    const { t } = useI18n();

    const advancedSettingsStore = useAdvancedSettingsStore();
    const { enablePrimaryPasswordChange } = useAuthStore();
    const { cachedConfig } = storeToRefs(useAuthStore());
    const { showConsole } = useUiStore();

    const generalSettingsStore = useGeneralSettingsStore();
    const { udonExceptionLogging, logResourceLoad, logEmptyAvatars, autoLoginDelayEnabled } =
        storeToRefs(generalSettingsStore);
    const {
        setUdonExceptionLogging,
        setLogResourceLoad,
        setLogEmptyAvatars,
        setAutoLoginDelayEnabled,
        promptAutoLoginDelaySeconds
    } = generalSettingsStore;

    const { cachedUsers } = useUserStore();
    const { cachedWorlds } = useWorldStore();
    const { cachedAvatars, cachedAvatarNames } = useAvatarStore();
    const { cachedGroups } = useGroupStore();
    const { cachedInstances } = useInstanceStore();

    const { photonLoggingEnabled } = storeToRefs(usePhotonStore());
    const { branch } = storeToRefs(useVRCXUpdaterStore());

    const { isDarkMode } = storeToRefs(useAppearanceSettingsStore());

    const {
        enablePrimaryPassword,
        relaunchVRChatAfterCrash,
        vrcQuitFix,
        autoSweepVRChatCache,
        selfInviteOverride,
        webSocketAutoConnectEnabled,
        enableAppLauncher,
        enableAppLauncherAutoClose,
        enableAppLauncherRunProcessOnce,
        showConfirmationOnSwitchAvatar,
        gameLogDisabled,
        sqliteTableSizes,
        avatarAutoCleanup,
        purgeInProgress,
        sentryErrorReporting
    } = storeToRefs(advancedSettingsStore);

    const {
        setRelaunchVRChatAfterCrash,
        setVrcQuitFix,
        setAutoSweepVRChatCache,
        setSelfInviteOverride,
        setWebSocketAutoConnectEnabled,
        setEnableAppLauncher,
        setEnableAppLauncherAutoClose,
        setEnableAppLauncherRunProcessOnce,
        setShowConfirmationOnSwitchAvatar,
        getSqliteTableSizes,
        setAvatarAutoCleanup,
        purgeAvatarFeedData,
        promptAutoClearVRCXCacheFrequency,
        setSentryErrorReporting
    } = advancedSettingsStore;

    const configTreeData = ref({});
    const visits = ref(null);
    const selectedPurgePeriod = ref('180');
    const isPurgeDialogVisible = ref(false);
    const dbFileInputRef = ref(null);
    const dbImport = reactive({ loading: false });
    const browserConsoleCommand = ref('');
    const browserConsoleFilter = ref('');
    const browserConsoleMinHeight = 160;
    const browserConsoleMaxHeight = 720;
    const browserConsoleHeight = ref(320);
    const browserConsoleLevelOptions = [
        { value: 'debug', label: 'Verbose', icon: Bug, class: 'text-violet-500' },
        { value: 'info', label: 'Info', icon: Info, class: 'text-blue-500' },
        { value: 'warn', label: 'Warnings', icon: TriangleAlert, class: 'text-amber-500' },
        { value: 'error', label: 'Errors', icon: CircleX, class: 'text-red-700 dark:text-red-300' }
    ];
    const defaultBrowserConsoleLevels = ['info', 'warn', 'error'];
    const browserConsoleLevels = ref([...defaultBrowserConsoleLevels]);
    const browserConsoleLevelLabel = computed(() => {
        const levels = browserConsoleLevels.value ?? defaultBrowserConsoleLevels;
        const isDefault =
            levels.length === defaultBrowserConsoleLevels.length &&
            defaultBrowserConsoleLevels.every((level) => levels.includes(level));
        if (isDefault) {
            return 'Default levels';
        }
        return levels.length === 0 ? 'No levels' : `${levels.length} levels`;
    });
    const browserConsoleOutputRef = ref(null);
    const browserConsoleHistory = [];
    let browserConsoleHistoryIndex = 0;
    let browserConsoleDraft = '';
    let stopBrowserConsoleResize;
    const filteredBrowserConsoleLogs = computed(() => {
        const filter = browserConsoleFilter.value.trim().toLocaleLowerCase();
        const levels = browserConsoleLevels.value ?? defaultBrowserConsoleLevels;
        return browserConsoleLogs.value.filter((entry) => {
            const isCommand = entry.level === 'command' || entry.level === 'result';
            const level = entry.level === 'log' ? 'info' : entry.level;
            const matchesLevel = isCommand || levels.includes(level);
            const matchesText = !filter || entry.message.toLocaleLowerCase().includes(filter);
            return matchesLevel && matchesText;
        });
    });

    const cacheSize = reactive({
        cachedUsers: 0,
        cachedWorlds: 0,
        cachedAvatars: 0,
        cachedGroups: 0,
        cachedAvatarNames: 0,
        cachedInstances: 0
    });

    const isLinux = computed(() => LINUX);

    async function executeBrowserConsole() {
        const command = browserConsoleCommand.value.trim();
        if (!command) {
            return;
        }

        browserConsoleHistory.push(command);
        browserConsoleHistoryIndex = browserConsoleHistory.length;
        browserConsoleDraft = '';
        browserConsoleCommand.value = '';
        await executeBrowserConsoleCommand(command);
    }

    function handleBrowserConsoleKeydown(event) {
        if (event.ctrlKey && event.key.toLocaleLowerCase() === 'l') {
            event.preventDefault();
            clearBrowserConsoleLogs();
            return;
        }
        if (event.key === 'ArrowUp') {
            if (browserConsoleHistory.length === 0) {
                return;
            }
            event.preventDefault();
            if (browserConsoleHistoryIndex === browserConsoleHistory.length) {
                browserConsoleDraft = browserConsoleCommand.value;
            }
            browserConsoleHistoryIndex = Math.max(0, browserConsoleHistoryIndex - 1);
            browserConsoleCommand.value = browserConsoleHistory[browserConsoleHistoryIndex];
            return;
        }
        if (event.key === 'ArrowDown') {
            if (browserConsoleHistoryIndex === browserConsoleHistory.length) {
                return;
            }
            event.preventDefault();
            browserConsoleHistoryIndex += 1;
            browserConsoleCommand.value =
                browserConsoleHistoryIndex === browserConsoleHistory.length
                    ? browserConsoleDraft
                    : browserConsoleHistory[browserConsoleHistoryIndex];
        }
    }

    function getBrowserConsoleEntryClass(level) {
        if (level === 'warn') {
            return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
        }
        if (level === 'error') {
            return 'bg-red-500/10 text-red-700 dark:bg-red-950/40 dark:text-red-300';
        }
        if (level === 'command' || level === 'result') {
            return 'text-blue-700 dark:text-blue-300';
        }
        return '';
    }

    function formatBrowserConsoleTime(time) {
        return new Date(time).toLocaleTimeString(undefined, { hour12: false });
    }

    function resetBrowserConsoleLevels() {
        browserConsoleLevels.value = [...defaultBrowserConsoleLevels];
    }

    function isBrowserConsoleLevelEnabled(level) {
        return browserConsoleLevels.value?.includes(level) ?? false;
    }

    function setBrowserConsoleLevel(level, enabled) {
        const levels = browserConsoleLevels.value ?? [];
        browserConsoleLevels.value = enabled
            ? [...new Set([...levels, level])]
            : levels.filter((value) => value !== level);
    }

    async function scrollBrowserConsoleToBottom() {
        await nextTick();
        const viewport = browserConsoleOutputRef.value?.viewportEl;
        const output = viewport?.value ?? viewport;
        if (output) {
            output.scrollTop = output.scrollHeight;
        }
    }

    function setBrowserConsoleHeight(height) {
        browserConsoleHeight.value = Math.min(browserConsoleMaxHeight, Math.max(browserConsoleMinHeight, height));
    }

    function startBrowserConsoleResize(event) {
        event.preventDefault();
        stopBrowserConsoleResize?.();
        const startY = event.clientY;
        const startHeight = browserConsoleHeight.value;
        const handlePointerMove = (pointerEvent) => {
            setBrowserConsoleHeight(startHeight + pointerEvent.clientY - startY);
        };
        const handlePointerUp = () => stopBrowserConsoleResize?.();
        stopBrowserConsoleResize = () => {
            globalThis.removeEventListener('pointermove', handlePointerMove);
            globalThis.removeEventListener('pointerup', handlePointerUp);
            stopBrowserConsoleResize = undefined;
        };
        globalThis.addEventListener('pointermove', handlePointerMove);
        globalThis.addEventListener('pointerup', handlePointerUp);
    }

    function handleBrowserConsoleResizeKeydown(event) {
        if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
            return;
        }
        event.preventDefault();
        setBrowserConsoleHeight(browserConsoleHeight.value + (event.key === 'ArrowDown' ? 20 : -20));
    }

    onBeforeUnmount(() => stopBrowserConsoleResize?.());

    watch(
        [() => browserConsoleLogs.value.at(-1)?.id, browserConsoleFilter, browserConsoleLevels],
        scrollBrowserConsoleToBottom,
        { immediate: true }
    );

    function handlePurge() {
        const days = selectedPurgePeriod.value === 'all' ? null : parseInt(selectedPurgePeriod.value, 10);
        isPurgeDialogVisible.value = false;
        purgeAvatarFeedData(days);
    }

    /**
     *
     */
    function openShortcutFolder() {
        AppApi.OpenShortcutFolder();
    }

    /**
     *
     */
    function refreshCacheSize() {
        cacheSize.cachedUsers = cachedUsers.size;
        cacheSize.cachedWorlds = cachedWorlds.size;
        cacheSize.cachedAvatars = cachedAvatars.size;
        cacheSize.cachedGroups = cachedGroups.size;
        cacheSize.cachedAvatarNames = cachedAvatarNames.size;
        cacheSize.cachedInstances = cachedInstances.size;
    }

    /**
     *
     */
    async function refreshConfigTreeData() {
        await authRequest.getConfig();
        configTreeData.value = cachedConfig.value;
    }

    function triggerDbImport() {
        if (BROWSER) {
            dbFileInputRef.value?.click();
            return;
        }
        importDesktopDatabase();
    }

    async function importDesktopDatabase() {
        let filePath;
        if (LINUX) {
            filePath = await window.electron.openFileDialog([
                { name: 'SQLite Database', extensions: ['sqlite3', 'sqlite', 'db'] }
            ]);
        } else {
            filePath = await AppApi.OpenFileSelectorDialog(
                null,
                '.sqlite3',
                'SQLite Database (*.sqlite3;*.sqlite;*.db)|*.sqlite3;*.sqlite;*.db'
            );
        }
        if (!filePath) {
            return;
        }

        dbImport.loading = true;
        try {
            const imported = await AppApi.ImportDatabase(filePath);
            if (!imported) {
                toast.error('有効な SQLite データベースファイルではないか、読み込みに失敗しました。');
            }
        } catch (err) {
            toast.error(`インポートに失敗しました: ${err?.message ?? err}`);
        } finally {
            dbImport.loading = false;
        }
    }

    async function handleDbFileImport(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        dbImport.loading = true;

        try {
            const buffer = await file.arrayBuffer();
            const imported = await AppApi.ImportDatabase(buffer);
            if (!imported) {
                toast.error('有効な SQLite データベースファイルではないか、読み込みに失敗しました。');
                return;
            }

            location.reload();
        } catch (err) {
            toast.error(`インポートに失敗しました: ${err?.message ?? err}`);
        } finally {
            dbImport.loading = false;
            event.target.value = '';
        }
    }

    /**
     *
     */
    function getVisits() {
        queryRequest.fetch('visits').then((args) => {
            visits.value = args.json;
        });
    }
</script>
