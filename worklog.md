---
Task ID: 1
Agent: Main Agent
Task: Complete fix and implementation of the Sofa PaaS Panel frontend

Work Log:
- Cloned repository from https://github.com/fahimahamedwork/sofa.git
- Performed deep analysis identifying 50+ bugs, mismatches, and missing features
- Fixed CSS/UI issues: replaced tailwindcss-animate with custom CSS keyframes for Dialog, fixed index.html title, added Firefox scrollbar support, added overlay animation
- Fixed API layer: added camelToSnake converter, added request interceptor for snake_case conversion, added response interceptor for snake_case unwrapping, fixed PATCH vs PUT mismatches, fixed endpoint URLs to match backend routes, fixed ProvisionDBRequest shape, fixed Settings update to wrap in {settings: ...}, added changePassword and updateIPWhitelist API methods
- Fixed WebSocket: completely replaced Socket.IO client with native WebSocket client that matches the backend's raw WebSocket protocol, added reconnection logic, room management, and proper message parsing
- Fixed all pages to use numeric IDs instead of slugs (matching backend route :id pattern)
- Updated TypeScript types to match backend data model fields (buildCmd instead of buildCommand, domain instead of hostname, sslEnabled instead of sslStatus, etc.)
- Fixed all page components: app-detail, app-deployments, app-env, app-domains, app-logs, app-terminal, app-settings, domains, databases, settings, dashboard, apps, login
- Implemented password change functionality (previously no-op)
- Implemented IP whitelist save functionality (previously no-op)
- Added proper 404 NotFound page
- Fixed env-var-row to handle backend's masked values
- Fixed web-terminal to use raw WebSocket protocol
- Fixed log-viewer to use raw WebSocket protocol
- Fixed deploy wizard to navigate using numeric ID from backend
- Fixed domain-card component for new Domain type
- All TypeScript compilation passes with zero errors
- Production build succeeds

Stage Summary:
- 20+ files modified across the entire frontend
- All critical frontend-backend API mismatches resolved
- WebSocket protocol mismatch resolved (Socket.IO → raw WebSocket)
- CSS animations fixed (Dialog fade/zoom)
- All no-op implementations replaced with working API calls
- Project builds successfully
