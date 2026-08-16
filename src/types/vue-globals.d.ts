import 'vue';

declare module 'vue' {
    interface ComponentCustomProperties {
        BROWSER: boolean;
        WINDOWS: boolean;
        LINUX: boolean;
        NIGHTLY: boolean;
        VERSION: string;
    }
}
