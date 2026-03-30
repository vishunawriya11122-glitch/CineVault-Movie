export declare class HealthController {
    check(): {
        status: string;
        timestamp: string;
        uptime: number;
    };
    welcome(): {
        message: string;
        version: string;
        status: string;
        endpoints: {
            health: string;
            homeFeed: string;
            banners: string;
            movies: string;
            docs: string;
        };
        timestamp: string;
    };
}
