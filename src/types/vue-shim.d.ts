declare module '*.vue' {
    import type { DefineComponent } from 'vue';

    const component: DefineComponent<{}, {}, any>;
    export default component;
}

declare module 'vue' {
    interface ComponentCustomProperties {
        BROWSER: boolean;
        WINDOWS: boolean;
        LINUX: boolean;
        NIGHTLY: boolean;
        VERSION: string;
    }
}
