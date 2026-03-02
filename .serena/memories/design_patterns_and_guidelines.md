# Design Patterns and Guidelines

## Architecture Patterns

### 1. Layered Architecture

```
Presentation Layer (Vue Components)
    ↓
Service Layer (src/service/)
    ↓
Data Layer (SQLite, VRChat API)
```

### 2. Store Pattern (Pinia)

- Use Pinia for global state management.
- Stores are divided by functionality (`auth`, `user`, `friend`, `notification`, etc.).
- All stores are initialized in `createGlobalStores()` and saved in `window.$pinia`.

### 3. Repository Pattern

- `ConfigRepository` (`src/service/config.js`): Persistence of settings.
- `database.js`: Centralization of database operations.

### 4. Service Pattern

- `webApiService`: Wrapper for VRChat API calls.
- `websocket`: WebSocket connection management.
- `request`: HTTP request management.

## Vue Component Patterns

### 1. Composition API + `<script setup>`

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const count = ref(0);
const doubleCount = computed(() => count.value * 2);

onMounted(() => {
    // Initialization logic
});
</script>
```

### 2. Composables

Extract reusable logic into Composables:
- Place in `src/composables/`.
- Use the `use` prefix (e.g., `useAuth`, `useUser`).

### 3. Props and Emits

```vue
<script setup>
const props = defineProps({
    title: String,
    count: Number
});

const emit = defineEmits(['update', 'delete']);

const handleUpdate = () => {
    emit('update', props.count + 1);
};
</script>
```

## State Management Patterns

### 1. Local State vs Global State

- **Local State**: `ref`/`reactive` within a component.
- **Global State**: Pinia Store.

### 2. Computed Properties

- Use `computed` for derived state.
- Utilize `computed` within Stores as well.

### 3. Watchers

```javascript
import { watch } from 'vue';

watch(() => authStore.isLoggedIn, (newVal) => {
    if (!newVal) {
        router.push('/login');
    }
});
```

## Asynchronous Patterns

### 1. async/await

```javascript
const fetchUser = async (userId) => {
    try {
        const response = await request(`users/${userId}`);
        return response;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw error;
    }
};
```

### 2. Promise Chains

Use when necessary, but prioritize async/await by default.

### 3. Error Handling

```javascript
try {
    await someAsyncOperation();
} catch (error) {
    // Send error to Sentry
    console.error(error);
    // Notify user
    showNotification('An error occurred');
}
```

## API Call Patterns

### 1. request service

```javascript
import { request } from '@/service/request';

// GET
const user = await request('users/usr_12345678-1234-1234-1234-123456789012');

// POST
const result = await request('auth/user/login', {
    method: 'POST',
    body: { username, password }
});
```

### 2. GET Request Deduplication

- Duplicate requests within 10 seconds are automatically deduplicated.
- 404/403 errors are cached for 15 minutes.

### 3. Bulk Processing

```javascript
import { processBulk } from '@/service/request';

// Automatic pagination processing
const allItems = await processBulk('endpoint', {
    params: { n: 100 }
});
```

## WebSocket Patterns

### 1. Connection Management

```javascript
import { websocket } from '@/service/websocket';

// Register event listeners
websocket.on('friend-online', (data) => {
    console.log('Friend online:', data);
});

// Auto-reconnect (5-second interval)
```

### 2. Use of worker-timers

Use `worker-timers` to ensure timers operate even in background tabs.

## Database Patterns

### 1. Transactions

```javascript
import { database } from '@/service/database';

await database.begin();
try {
    await SQLite.ExecuteNonQuery('INSERT INTO ...');
    await SQLite.ExecuteNonQuery('UPDATE ...');
    await database.commit();
} catch (error) {
    // Automatically roll back on error
    throw error;
}
```

### 2. Query Execution

```javascript
// SELECT
const result = await SQLite.Execute('SELECT * FROM users WHERE id = ?', [userId]);

// INSERT/UPDATE/DELETE
await SQLite.ExecuteNonQuery('INSERT INTO users (id, name) VALUES (?, ?)', [userId, name]);
```

## Cross-Platform Patterns

### 1. Platform Branching

```javascript
if (WINDOWS) {
    // Windows (CEF) specific code
    await CefSharp.BindObjectAsync('AppApi');
} else {
    // macOS/Linux (Electron) specific code
    await window.interopApi.callDotNetMethod('AppApi', 'MethodName', [args]);
}
```

### 2. .NET Interop

```javascript
// Windows
const result = await AppApi.SomeMethod(arg1, arg2);

// Linux (via Proxy)
const result = await window.interopApi.callDotNetMethod('AppApi', 'SomeMethod', [arg1, arg2]);
```

### 3. WebApi Execution

```javascript
import { webApiService } from '@/service/webapi';

// Automatically branch based on platform
const result = await webApiService.execute({
    url: 'https://api.vrchat.cloud/api/1/users/usr_12345678-1234-1234-1234-123456789012',
    method: 'GET'
});
```

## UI/UX Patterns

### 1. shadcn-vue Components

```vue
<script setup>
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
</script>

<template>
    <Dialog>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Title</DialogTitle>
            </DialogHeader>
            <Input v-model="value" />
            <Button @click="handleSubmit">Submit</Button>
        </DialogContent>
    </Dialog>
</template>
```

### 2. Notifications

```javascript
import { toast } from 'vue-sonner';

// Success notification
toast.success('Saved');

// Error notification
toast.error('An error occurred');

// Info notification
toast.info('Information message');
```

### 3. Modal Management

```javascript
import { useModalStore } from '@/stores/modal';

const modalStore = useModalStore();

// Open modal
modalStore.openModal('user-detail', { userId: 'usr_12345678-1234-1234-1234-123456789012' });

// Close modal
modalStore.closeModal();
```

## Routing Patterns

### 1. Authentication Guard

```javascript
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !watchState.isLoggedIn) {
        next('/login');
    } else {
        next();
    }
});
```

### 2. Lazy Loading

```javascript
const Charts = () => import('@/views/Charts/Charts.vue');

const routes = [
    {
        path: '/charts',
        component: Charts,
        meta: { requiresAuth: true }
    }
];
```

## Performance Optimization Patterns

### 1. Virtual Scrolling

```vue
<script setup>
import { useVirtualizer } from '@tanstack/vue-virtual';

const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement.value,
    estimateSize: () => 50
});
</script>
```

### 2. Memoization

```javascript
import { computed } from 'vue';

const expensiveComputation = computed(() => {
    // Expensive calculation
    return items.value.filter(/* ... */).map(/* ... */);
});
```

### 3. Debounce/Throttle

```javascript
import { useDebounceFn, useThrottleFn } from '@vueuse/core';

const debouncedSearch = useDebounceFn((query) => {
    // Search processing
}, 300);

const throttledScroll = useThrottleFn(() => {
    // Scroll processing
}, 100);
```

## Error Handling Patterns

### 1. Global Error Handler

```javascript
app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err, info);
    // Send to Sentry
};
```

### 2. API Error Handling

```javascript
try {
    const result = await request('endpoint');
} catch (error) {
    if (error.status === 401) {
        // Authentication error
        router.push('/login');
    } else if (error.status === 404) {
        // Not Found
        toast.error('Resource not found');
    } else {
        // Other errors
        toast.error('An error occurred');
    }
}
```

## Testing Patterns (Vitest)

### 1. Unit Testing

```javascript
import { describe, it, expect } from 'vitest';
import { someFunction } from '@/shared/utils/common';

describe('someFunction', () => {
    it('should return expected value', () => {
        const result = someFunction(input);
        expect(result).toBe(expectedOutput);
    });
});
```

### 2. Mocking

```javascript
import { vi } from 'vitest';

vi.mock('@/service/request', () => ({
    request: vi.fn()
}));
```

## Security Patterns

### 1. XSS Prevention

```vue
<!-- Safe -->
<div>{{ userInput }}</div>

<!-- Dangerous (use only when necessary) -->
<div v-html="sanitizedHtml"></div>
```

### 2. CSRF Prevention

As VRChat API uses cookie-based authentication, proper cookie management is critical.

### 3. Authentication Token Management

```javascript
// Save in VRCXStorage
await VRCXStorage.Set('authToken', token);

// Retrieve
const token = await VRCXStorage.Get('authToken');
```

## Internationalization (i18n) Patterns

### 1. Text Translation

```vue
<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
    <h1>{{ t('common.welcome') }}</h1>
</template>
```

### 2. Dynamic Translation

```javascript
const message = t('user.greeting', { name: userName });
```

### 3. Pluralization

```javascript
const message = t('item.count', itemCount, { count: itemCount });
```
