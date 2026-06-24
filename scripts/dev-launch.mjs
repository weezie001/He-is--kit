// Cross-platform dev launcher used by .claude/launch.json (preview server).
// Sets NODE_ENV and boots the tsx-compiled server entry.
process.env.NODE_ENV = process.env.NODE_ENV || "development";
await import("../server/_core/index.ts");
