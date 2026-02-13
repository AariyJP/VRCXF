# デザインパターンとガイドライン

## アーキテクチャパターン

### 1. レイヤードアーキテクチャ

```
Presentation Layer (Vue Components)
    ↓
Service Layer (src/service/)
    ↓
Data Layer (SQLite, VRChat API)
```

### 2. Store パターン (Pinia)

- グローバル状態管理に Pinia を使用
- Store は機能ごとに分割 (`auth`, `user`, `friend`, `notification`, etc.)
- `createGlobalStores()` で全 Store を初期化し `window.$pinia` に保存

### 3. Repository パターン

- `ConfigRepository` (`src/service/config.js`): 設定の永続化
- `database.js`: データベース操作の集約

### 4. Service パターン

- `webApiService`: VRChat API呼び出しのラッパー
- `websocket`: WebSocket接続管理
- `request`: HTTP リクエスト管理

## Vue コンポーネントパターン

### 1. Composition API + `<script setup>`

```vue
<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const count = ref(0);
const doubleCount = computed(() => count.value * 2);

onMounted(() => {
    // 初期化処理
});
</script>
```

### 2. Composables

再利用可能なロジックは Composables に抽出:
- `src/composables/` に配置
- `use` プレフィックスを使用 (例: `useAuth`, `useUser`)

### 3. Props と Emits

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

## 状態管理パターン

### 1. ローカル状態 vs グローバル状態

- **ローカル状態**: コンポーネント内の `ref`/`reactive`
- **グローバル状態**: Pinia Store

### 2. 算出プロパティ

- 派生状態は `computed` を使用
- Store 内でも `computed` を活用

### 3. Watchers

```javascript
import { watch } from 'vue';

watch(() => authStore.isLoggedIn, (newVal) => {
    if (!newVal) {
        router.push('/login');
    }
});
```

## 非同期処理パターン

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

### 2. Promise チェーン

必要に応じて使用するが、基本的には async/await を優先

### 3. エラーハンドリング

```javascript
try {
    await someAsyncOperation();
} catch (error) {
    // Sentry にエラーを送信
    console.error(error);
    // ユーザーに通知
    showNotification('エラーが発生しました');
}
```

## API 呼び出しパターン

### 1. request サービス

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

### 2. GET リクエストの重複排除

- 10秒間の重複リクエストは自動的に排除
- 404/403 エラーは 15分間キャッシュ

### 3. バルク処理

```javascript
import { processBulk } from '@/service/request';

// ページネーション自動処理
const allItems = await processBulk('endpoint', {
    params: { n: 100 }
});
```

## WebSocket パターン

### 1. 接続管理

```javascript
import { websocket } from '@/service/websocket';

// イベントリスナー登録
websocket.on('friend-online', (data) => {
    console.log('Friend online:', data);
});

// 自動再接続 (5秒間隔)
```

### 2. worker-timers の使用

バックグラウンドタブでもタイマーが動作するように `worker-timers` を使用

## データベースパターン

### 1. トランザクション

```javascript
import { database } from '@/service/database';

await database.begin();
try {
    await SQLite.ExecuteNonQuery('INSERT INTO ...');
    await SQLite.ExecuteNonQuery('UPDATE ...');
    await database.commit();
} catch (error) {
    // エラー時は自動的にロールバック
    throw error;
}
```

### 2. クエリ実行

```javascript
// SELECT
const result = await SQLite.Execute('SELECT * FROM users WHERE id = ?', [userId]);

// INSERT/UPDATE/DELETE
await SQLite.ExecuteNonQuery('INSERT INTO users (id, name) VALUES (?, ?)', [userId, name]);
```

## クロスプラットフォームパターン

### 1. プラットフォーム分岐

```javascript
if (WINDOWS) {
    // Windows (CEF) 専用コード
    await CefSharp.BindObjectAsync('AppApi');
} else {
    // macOS/Linux (Electron) 専用コード
    await window.interopApi.getDotNetObject('AppApi');
}
```

### 2. .NET Interop

```javascript
// Windows
const result = await AppApi.SomeMethod(arg1, arg2);

// Linux (Proxy経由)
const result = await window.interopApi.callDotNetMethod('AppApi', 'SomeMethod', [arg1, arg2]);
```

### 3. WebApi 実行

```javascript
import { webApiService } from '@/service/webapi';

// プラットフォームに応じて自動的に分岐
const result = await webApiService.execute({
    url: 'https://api.vrchat.cloud/api/1/users/usr_12345678-1234-1234-1234-123456789012',
    method: 'GET'
});
```

## UI/UXパターン

### 1. shadcn-vue コンポーネント

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
                <DialogTitle>タイトル</DialogTitle>
            </DialogHeader>
            <Input v-model="value" />
            <Button @click="handleSubmit">送信</Button>
        </DialogContent>
    </Dialog>
</template>
```

### 2. 通知

```javascript
import { toast } from 'vue-sonner';

// 成功通知
toast.success('保存しました');

// エラー通知
toast.error('エラーが発生しました');

// 情報通知
toast.info('情報メッセージ');
```

### 3. モーダル管理

```javascript
import { useModalStore } from '@/stores/modal';

const modalStore = useModalStore();

// モーダルを開く
modalStore.openModal('user-detail', { userId: 'usr_12345678-1234-1234-1234-123456789012' });

// モーダルを閉じる
modalStore.closeModal();
```

## ルーティングパターン

### 1. 認証ガード

```javascript
router.beforeEach((to, from, next) => {
    if (to.meta.requiresAuth && !watchState.isLoggedIn) {
        next('/login');
    } else {
        next();
    }
});
```

### 2. 遅延ロード

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

## パフォーマンス最適化パターン

### 1. 仮想スクロール

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

### 2. メモ化

```javascript
import { computed } from 'vue';

const expensiveComputation = computed(() => {
    // 重い計算
    return items.value.filter(/* ... */).map(/* ... */);
});
```

### 3. デバウンス/スロットル

```javascript
import { useDebounceFn, useThrottleFn } from '@vueuse/core';

const debouncedSearch = useDebounceFn((query) => {
    // 検索処理
}, 300);

const throttledScroll = useThrottleFn(() => {
    // スクロール処理
}, 100);
```

## エラーハンドリングパターン

### 1. グローバルエラーハンドラ

```javascript
app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err, info);
    // Sentry に送信
};
```

### 2. API エラーハンドリング

```javascript
try {
    const result = await request('endpoint');
} catch (error) {
    if (error.status === 401) {
        // 認証エラー
        router.push('/login');
    } else if (error.status === 404) {
        // Not Found
        toast.error('リソースが見つかりません');
    } else {
        // その他のエラー
        toast.error('エラーが発生しました');
    }
}
```

## テストパターン

### 1. ユニットテスト

```javascript
import { describe, it, expect } from '@jest/globals';
import { someFunction } from '@/shared/utils/common';

describe('someFunction', () => {
    it('should return expected value', () => {
        const result = someFunction(input);
        expect(result).toBe(expectedOutput);
    });
});
```

### 2. モック

```javascript
jest.mock('@/service/request', () => ({
    request: jest.fn()
}));
```

## セキュリティパターン

### 1. XSS 対策

```vue
<!-- 安全 -->
<div>{{ userInput }}</div>

<!-- 危険 (必要な場合のみ使用) -->
<div v-html="sanitizedHtml"></div>
```

### 2. CSRF 対策

VRChat API は Cookie ベースの認証を使用するため、適切な Cookie 管理が重要

### 3. 認証トークン管理

```javascript
// VRCXStorage に保存
await VRCXStorage.Set('authToken', token);

// 取得
const token = await VRCXStorage.Get('authToken');
```

## 国際化 (i18n) パターン

### 1. テキストの翻訳

```vue
<script setup>
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
    <h1>{{ t('common.welcome') }}</h1>
</template>
```

### 2. 動的な翻訳

```javascript
const message = t('user.greeting', { name: userName });
```

### 3. 複数形

```javascript
const message = t('item.count', itemCount, { count: itemCount });
```
