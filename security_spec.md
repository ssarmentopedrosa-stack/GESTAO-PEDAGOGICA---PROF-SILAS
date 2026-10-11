# Gestão Escolar PRO - Security Specification & Access Control

## 1. Data Invariants

1. **Teacher Isolation (Multi-Tenant Zero-Trust):** All student records, assessments, grades, qualitative records, and attendance documents belong to an authenticated teacher identified by `teacherUid == request.auth.uid`. A teacher cannot read, list, create, edit, or delete data belonging to another teacher.
2. **Student Grade Integrity:** Grades cannot be submitted or altered with out-of-bounds values (`value < 0` or `value > maxGrade`). Unassigned status changes must be valid (`graded`, `pending`, `absent`, `excused`, `not_applicable`).
3. **Identity Immutability:** Fields like `teacherUid`, `studentId`, `assessmentId`, and `createdAt` are immutable once created.
4. **Relational Consistency:** Grades cannot exist without a valid student and assessment reference. Path variables must pass `isValidId` checks to avoid poisoning.
5. **No Blanket Reads:** Listing students, assessments, or grades requires an authenticated user filtering by their own `teacherUid` matching `request.auth.uid`.
6. **Student PII Protection:** Student records and qualitative behavioral comments are private to the authorized educator and admin, never publicly queryable or visible without valid credentials.

---

## 2. The "Dirty Dozen" Malicious Payloads (Should All Yield PERMISSION_DENIED)

1. **Payload 1: Unauthenticated Read/Write**
   - Attempting to query `/students` or `/grades` with `request.auth == null`.
2. **Payload 2: Tenant Impersonation (Spoofed teacherUid on Create)**
   - Creating a Student with `teacherUid: "other_teacher_123"` when `auth.uid == "user_abc"`.
3. **Payload 3: Cross-Tenant Data Hijack (Update)**
   - Updating another teacher's student document to assign it to self or modify grades.
4. **Payload 4: Negative or Overflow Grade Poisoning**
   - Saving a Grade with `value: -5.0` or `value: 999.0` when `maxGrade: 10.0`.
5. **Payload 5: Invalid Status Injection**
   - Saving a Grade with `status: "hacked_status"` instead of allowed enums.
6. **Payload 6: Document ID Buffer Overflow**
   - Requesting or writing to a path with an ID of 2,000 junk characters.
7. **Payload 7: Qualitative Record Tampering**
   - Updating another teacher's qualitative pedagogical comments.
8. **Payload 8: Shadow Field Injection**
   - Injecting rogue admin privilege flags like `{ "role": "superadmin", "isAdmin": true }` into an ordinary document update.
9. **Payload 9: Attendance Forgery**
   - Injecting falsified attendance records under another teacher's class ID.
10. **Payload 10: Deleting Another Teacher's Class**
   - Issuing a delete request on `/classes/cls_other` where `resource.data.teacherUid != auth.uid`.
11. **Payload 11: Immutable Field Mutation**
   - Updating an Assessment and attempting to change the underlying `teacherUid` or original `id`.
12. **Payload 12: Blanket List Scraping**
   - Querying the global collection without constraining to authenticated user's `teacherUid`.

---

## 3. Test Runner Design

All operations are guarded at the security rules level. In tests, unauthorized operations throw permission errors, which Gestão Escolar PRO catches using `handleFirestoreError` conforming to `FirestoreErrorInfo`.
