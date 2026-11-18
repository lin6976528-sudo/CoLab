# Security Specification: CoLab Firestore Security

## 1. Data Invariants
- **Users**: A user document is identified by the Firebase Auth UID. No user may read, write, update, or delete another user's profile metadata.
- **History**: History entries are private to the user who generated them. One user cannot view another's generation logs.
- **Chats**: Conversations are confidential and user-specific. No cross-user session scraping or reads are permitted.
- **Feedback**: Feedback reports representing AI model ratings must be securely authored. A user cannot create a feedback entry under someone else's UID, masquerade as another agent, or perform un-throttled spam injections.
- **Scenes 3D (`scenes_3d`)**: Saved 3D studio scene presets belong strictly to `userId` (`request.auth.uid`), require verified auth and strict schema key/type/bounds enforcement (`sceneType`, `materialFinish`, `lightingPreset`, `explodeAmount` 0..1, 3-element coordinate tuples, server timestamps).

## 2. The "Dirty Dozen" Spoofing and Poisoning Payloads
Here are the critical threat payloads mapped to their respective security outcomes (`PERMISSION_DENIED` enforced):

1. **User Identity Spoofing (Create)**: Set `uid` in `users` to another user's ID.
2. **User Creation Shadow-Field Injection**: Creating a user with arbitrary `isAdmin: true` flag.
3. **History User-ID Masquerade**: Write a history items with `userId` representing a different registered user.
4. **History Entry Poisoning**: Inject high payload data (e.g., 2MB strings in prompt) to stress systems.
5. **Chat Session Hijack**: Attempt to read/query chat sessions belonging to other authorization entities.
6. **Chat Session Message tampering**: Update an existing chat's messages set with empty arrays or malicious scripts.
7. **Cross-User Feedback Creation**: Submit a thumbs-up rating for a tool using someone else's UID in `userId`.
8. **Feedback Injection Value Poisoning**: Author a feedback containing non-whitelisted ratings like `rating: 'excellent'`.
9. **Feedback System Field Pollution**: Attempt to update immutable fields such as `createdAt` or change the `userId` in general updates.
10. **Feedback Field Size Inundation**: Attempt to load extremely long strings into `comment`, `prompt`, or `response` in the `feedback` collection document.
11. **Anonymized Action Bypass**: Attempting writes to history, chat, feedback, or scenes_3d when unauthenticated.
12. **Blanket Query Scraping**: Issuing unbounded lists or collection group sweeps on `feedback` or `scenes_3d` without matching auth filters.

## 3. Test Runner (Target Rules Test Structure)
The `firestore.rules` enforces that all of the above payloads fail with proper permission errors by combining `isAuthenticated()`, `isOwner()`, `isDocOwner()`, `hasRequiredFields()`, `isValidId()`, and collection-specific validation schemas.
