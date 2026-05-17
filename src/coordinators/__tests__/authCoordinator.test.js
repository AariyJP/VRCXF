import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockWatchState = {
    isLoggedIn: false,
    isFriendsLoaded: false,
    isFavoritesLoaded: false
};

const mocks = vi.hoisted(() => ({
    closeWebSocket: vi.fn(),
    initWebsocket: vi.fn(),
    configRepository: {
        remove: vi.fn().mockResolvedValue(undefined)
    },
    notificationStore: {
        setNotificationInitStatus: vi.fn()
    },
    notyShow: vi.fn(),
    queryClient: {
        clear: vi.fn()
    },
    updateLoopStore: {
        setNextCurrentUserRefresh: vi.fn()
    },
    userStore: {
        currentUser: {
            id: 'usr_me',
            displayName: 'Tester'
        },
        setUserDialogVisible: vi.fn()
    },
    authStore: {
        updateStoredUser: vi.fn().mockResolvedValue(undefined),
        loginForm: {
            lastUserLoggedIn: 'usr_me'
        },
        setAttemptingAutoLogin: vi.fn(),
        autoLoginAttempts: new Set(['usr_me']),
        state: {
            autoLoginAttempts: new Set(['usr_me'])
        }
    },
    webApiService: {
        clearCookies: vi.fn().mockResolvedValue(undefined)
    }
}));

vi.mock('noty', () => ({
    default: vi.fn().mockImplementation(function NotyMock() {
        this.show = (...args) => mocks.notyShow(...args);
    })
}));

vi.mock('../../plugins/i18n', () => ({
    i18n: {
        global: {
            t: (key) => key
        }
    }
}));

vi.mock('../../services/watchState', () => ({
    watchState: mockWatchState
}));

vi.mock('../../services/config', () => ({
    default: mocks.configRepository
}));

vi.mock('../../services/webapi', () => ({
    default: mocks.webApiService
}));

vi.mock('../../services/websocket', () => ({
    closeWebSocket: mocks.closeWebSocket,
    initWebsocket: mocks.initWebsocket
}));

vi.mock('../../shared/utils', () => ({
    escapeTag: (value) => value
}));

vi.mock('../../queries', () => ({
    queryClient: mocks.queryClient
}));

vi.mock('../../stores/auth', () => ({
    useAuthStore: () => mocks.authStore
}));

vi.mock('../../stores/notification', () => ({
    useNotificationStore: () => mocks.notificationStore
}));

vi.mock('../../stores/updateLoop', () => ({
    useUpdateLoopStore: () => mocks.updateLoopStore
}));

vi.mock('../../stores/user', () => ({
    useUserStore: () => mocks.userStore
}));

vi.mock('../userCoordinator', () => ({
    applyCurrentUser: vi.fn()
}));

function createDeferred() {
    let resolve;
    const promise = new Promise((res) => {
        resolve = res;
    });
    return { promise, resolve };
}

describe('runLogoutFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWatchState.isLoggedIn = false;
        mockWatchState.isFriendsLoaded = false;
        mockWatchState.isFavoritesLoaded = false;
        mocks.authStore.loginForm.lastUserLoggedIn = 'usr_me';
        mocks.authStore.autoLoginAttempts = new Set(['usr_me']);
        mocks.authStore.state.autoLoginAttempts = new Set(['usr_me']);
    });

    test('waits for cookie clearing before finishing logout cleanup', async () => {
        const { runLogoutFlow } = await import('../authCoordinator');
        const deferred = createDeferred();
        mocks.webApiService.clearCookies.mockReturnValueOnce(deferred.promise);

        const flow = runLogoutFlow();
        await Promise.resolve();

        expect(mocks.webApiService.clearCookies).toHaveBeenCalledTimes(1);
        expect(mocks.configRepository.remove).not.toHaveBeenCalled();
        expect(mocks.closeWebSocket).not.toHaveBeenCalled();

        deferred.resolve();
        await flow;

        expect(mocks.authStore.updateStoredUser).toHaveBeenCalledWith(
            mocks.userStore.currentUser
        );
        expect(mocks.configRepository.remove).toHaveBeenCalledWith(
            'lastUserLoggedIn'
        );
        expect(mocks.authStore.loginForm.lastUserLoggedIn).toBe('');
        expect(mocks.authStore.setAttemptingAutoLogin).toHaveBeenCalledWith(
            false
        );
        expect(mocks.closeWebSocket).toHaveBeenCalledTimes(1);
        expect(mocks.queryClient.clear).toHaveBeenCalledTimes(1);
    });
});
