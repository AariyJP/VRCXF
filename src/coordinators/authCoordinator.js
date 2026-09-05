import { closeWebSocket, initWebsocket } from '../services/websocket';
import { queryClient } from '../queries';
import { useAuthStore } from '../stores/auth';
import { useNotificationStore } from '../stores/notification';
import { useUpdateLoopStore } from '../stores/updateLoop';
import { useUserStore } from '../stores/user';
import { applyCurrentUser } from './userCoordinator';
import { watchState } from '../services/watchState';

import configRepository from '../services/config';
import webApiService from '../services/webapi';

/**
 * Runs the shared logout side effects.
 */
export async function runLogoutFlow() {
    const authStore = useAuthStore();
    const userStore = useUserStore();
    const notificationStore = useNotificationStore();

    userStore.setUserDialogVisible(false);
    watchState.isLoggedIn = false;
    watchState.isFriendsLoaded = false;
    watchState.isFavoritesLoaded = false;
    notificationStore.setNotificationInitStatus(false);
    await authStore.updateStoredUser(userStore.currentUser);
    await webApiService.clearCookies();
    authStore.loginForm.lastUserLoggedIn = '';
    await configRepository.remove('lastUserLoggedIn');
    authStore.setAttemptingAutoLogin(false);
    authStore.autoLoginAttempts.clear();
    closeWebSocket();
    queryClient.clear();
}

/**
 * Runs post-login side effects after a successful auth response.
 * @param {object} json Current user payload from auth API.
 */
export function runLoginSuccessFlow(json) {
    const updateLoopStore = useUpdateLoopStore();

    updateLoopStore.setNextCurrentUserRefresh(420); // 7mins
    applyCurrentUser(json);
    initWebsocket();
}
