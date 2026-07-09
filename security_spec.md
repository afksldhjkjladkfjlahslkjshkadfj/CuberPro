# Security Specification & "Dirty Dozen" Threat Model

This document outlines the security invariants and threat model for the CuberPro database (Firestore).

## 1. Data Invariants

1. **User Ownership**: A user can only write to their own profile (`/users/{userId}`) where `userId == request.auth.uid`.
2. **Progress Boundaries**: A user can only write to progress documents (`/user_progress/{progressId}`) where the document's `userId` matches `request.auth.uid`.
3. **Data Completeness**: Creating progress entries must include necessary fields (`userId`, `caseId`, `puzzle`, `subset`, `status`).
4. **Streak Integrity**: Users cannot manually update their streak to arbitrary high values unless verified or kept within sequential increments.
5. **No Anonymous Exploits**: Verification of emails is required for non-anonymous accounts.

---

## 2. The "Dirty Dozen" Malicious Payloads

Here are 12 malicious payloads designed to bypass the rules, and why they must be denied:

1. **Spoofed User Creation**
   - *Target*: `/users/some_other_uid`
   - *Payload*: `{"uid": "some_other_uid", "displayName": "Attacker"}`
   - *Result*: DENIED (UID mismatch with `request.auth.uid`).

2. **Privilege Escalation via Streak Manipulation**
   - *Target*: `/users/{my_uid}`
   - *Payload*: `{"streak": 99999, "longestStreak": 99999}` (Attempting to write huge values without performing reviews)
   - *Result*: DENIED (Enforce range limits or sequential updates).

3. **Orphaned Progress Hijack**
   - *Target*: `/user_progress/attacker_hijack`
   - *Payload*: `{"userId": "victim_uid", "caseId": "T-Perm", "status": "mastered"}`
   - *Result*: DENIED (Document `userId` must equal `request.auth.uid`).

4. **Shadow Field Injection**
   - *Target*: `/user_progress/{my_uid}_3x3_PLL_T-Perm`
   - *Payload*: `{"userId": "my_uid", "caseId": "T-Perm", "status": "mastered", "unauthorizedGhostField": "malicious_payload"}`
   - *Result*: DENIED (Enforce exact fields or size limits on creation, and `affectedKeys().hasOnly()` on update).

5. **Blanket Query Scraping**
   - *Operation*: Listing all documents in `user_progress` without a filter.
   - *Query*: `db.collection('user_progress').get()`
   - *Result*: DENIED (Rules require query filters restricting `userId == request.auth.uid`).

6. **Status Shortcutting to Mastered**
   - *Target*: `/user_progress/{id}`
   - *Payload*: `{"status": "mastered"}` (Without SRS fields or initial "learning" status)
   - *Result*: DENIED (Transition logic controls progress update fields).

7. **Immortal Field Modification**
   - *Target*: `/user_progress/{id}`
   - *Payload*: `{"userId": "new_uid", "caseId": "new_case"}` (Attempting to reassign a progress item to someone else or change its identifying keys)
   - *Result*: DENIED (Immutability of `userId`, `caseId`, `puzzle`, `subset`).

8. **Temporal Integrity Spoofing**
   - *Target*: `/user_progress/{id}`
   - *Payload*: `{"lastReviewed": "2030-01-01T00:00:00Z"}` (Providing a future client-generated review timestamp)
   - *Result*: DENIED (Must match `request.time` on write).

9. **Excessive String Payload Attack**
   - *Target*: `/user_progress/{id}`
   - *Payload*: `{"notes": "A" * 1000000}` (Attempting to crash/bloat storage using extremely long notes)
   - *Result*: DENIED (Size checks on `notes.size() <= 2000`).

10. **Malicious ID Poisoning**
    - *Target*: `/user_progress/some%2Fmalicious%2Fid`
    - *Payload*: `{"userId": "my_uid", "caseId": "T-Perm", "status": "learning"}`
    - *Result*: DENIED (Document ID must match ID validation format).

11. **Spoofed Email / Fake Verification**
    - *Target*: `/users/{my_uid}`
    - *Payload*: Auth claims spoofed, but `email_verified` is false in security rules context.
    - *Result*: DENIED (Verification enforced).

12. **Anonymous Progress Preservation bypass**
    - *Target*: Trying to read private user profiles as an unauthenticated guest.
    - *Result*: DENIED.

---

## 3. Test Assertions

Our firestore rules will strictly validate these conditions in `firestore.rules`.
