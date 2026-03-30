export declare class AppController {
    root(): {
        message: string;
        version: string;
        status: string;
        apiBaseUrl: string;
        documentation: string;
        endpoints: {
            welcome: string;
            health: string;
            homeFeed: string;
            banners: string;
        };
    };
    getAppVersion(): {
        versionCode: number;
        versionName: string;
        forceUpdate: boolean;
        apkUrl: string;
        releaseNotes: string;
    };
}
