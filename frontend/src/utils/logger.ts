const isDevelopment = process.env.NODE_ENV === "development";

// 기본 로그 타입 정의
type BasicLogValue = string | number | boolean | null | undefined;
type LogObject = {
    [key: string]: BasicLogValue | Error | LogObject | Array<BasicLogValue | LogObject>;
    error?: string;
    message?: string;
};
type LogArgs = BasicLogValue | Error | LogObject;

export const logger = {
    debug: (...args: LogArgs[]) => {
        if (isDevelopment) {
            // eslint-disable-next-line no-console
            console.log("[DEBUG]", ...args);
        }
    },
    info: (...args: LogArgs[]) => {
        if (isDevelopment) {
            // eslint-disable-next-line no-console
            console.info("[INFO]", ...args);
        }
    },
    warn: (...args: LogArgs[]) => {
        console.warn("[WARN]", ...args);
    },
    error: (...args: LogArgs[]) => {
        console.error("[ERROR]", ...args);
    },
};
