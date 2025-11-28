// DEPRECATED: daily.ts
// The previous Daily.co integration was removed per request to build an in-app video/chat solution.
// Keep a lightweight deprecation stub here so imports don't break during the migration.

export function deprecatedDailyService() {
  throw new Error('daily.ts has been removed. Please use the new video services in src/services/video or see VIDEO_CALL_ARCHITECTURE.md')
}

export default deprecatedDailyService