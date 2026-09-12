# Campus 360 — REST API Design (Spring Boot)

Base URL: `/api/v1`
Format: JSON, camelCase fields.
Auth: `Authorization: Bearer <JWT>` (Spring Security + JWT). Each account type
(student, club, authority, driver) authenticates separately but all get a JWT
carrying `sub` (account id), `accountType`, and `role` (for authority: `STAFF`
or `ADMIN`) claims. A single `@PreAuthorize` scheme can then gate endpoints by
`accountType`/`role`.

**Roles used below:** `STUDENT`, `CLUB`, `AUTHORITY_STAFF`, `AUTHORITY_ADMIN`, `DRIVER`, `PUBLIC` (no auth).

**Path variable `{postType}`** (used by the shared engagement endpoints) is one of:
`lost-found | announcement | event | complaint | marketplace | study-session | material-share`
— maps 1:1 to the polymorphic `post_type` enum in the DB.

---

## 0. Conventions

**Pagination** (all `GET` list endpoints):
`?page=0&size=20&sort=createdAt,desc`
```json
{
  "content": [ /* items */ ],
  "page": 0,
  "size": 20,
  "totalElements": 143,
  "totalPages": 8
}
```

**Error format** (Spring `@ControllerAdvice`):
```json
{
  "timestamp": "2026-08-31T10:00:00Z",
  "status": 404,
  "error": "NOT_FOUND",
  "message": "Complaint 42 not found",
  "path": "/api/v1/complaints/42"
}
```

**Standard status codes:** `200` OK, `201` Created (+`Location` header), `204` No Content
(deletes), `400` validation, `401` unauthenticated, `403` forbidden (wrong role/not owner),
`404` not found, `409` conflict (e.g. duplicate vendor profile, duplicate reaction).

---

## 1. Auth & Onboarding

Students self-register with just email/password, then complete onboarding separately —
matches the spec. Clubs self-register. Authority accounts are provisioned internally
(seeded, or created by an existing `ADMIN` via `/admin/authority-accounts`) — no public
self-register for authority. Drivers are created by authority and only get a login endpoint.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/students/register` | Public | `{ "email", "password" }` | `201` `{ "studentId", "token", "onboardingComplete": false }` |
| POST | `/auth/students/login` | Public | `{ "email", "password" }` | `200` `{ "token", "studentId", "onboardingComplete" }` |
| PUT | `/students/me/onboarding` | STUDENT | see below | `200` full `StudentProfile` |
| POST | `/auth/clubs/register` | Public | `{ "email", "password", "clubName", "description"? }` | `201` `{ "clubId", "token" }` |
| POST | `/auth/clubs/login` | Public | `{ "email", "password" }` | `200` `{ "token", "clubId" }` |
| POST | `/auth/authority/login` | Public | `{ "email", "password" }` | `200` `{ "token", "authorityId", "role" }` |
| POST | `/admin/authority-accounts` | AUTHORITY_ADMIN | `{ "email", "password", "fullName", "designation", "role": "STAFF"\|"ADMIN" }` | `201` |
| POST | `/admin/drivers` | AUTHORITY_ADMIN, AUTHORITY_STAFF | `{ "email", "password", "fullName", "phone", "licenseNo" }` | `201` `{ "driverId" }` |
| POST | `/auth/drivers/login` | Public | `{ "email", "password" }` | `200` `{ "token", "driverId" }` |
| POST | `/auth/refresh` | Any (refresh token) | `{ "refreshToken" }` | `200` `{ "token" }` |
| POST | `/auth/logout` | Any | — | `204` |

`PUT /students/me/onboarding` body:
```json
{
  "universityId": "20221-15-001",
  "fullName": "Alice Rahman",
  "departmentId": 3
}
```

---

## 2. Student Profile

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/students/me` | STUDENT | — | `StudentProfile` |
| PUT | `/students/me` | STUDENT | `{ "fullName"?, "gender"?, "departmentId"?, "profilePictureUrl"? }` | `StudentProfile` |
| GET | `/students/{id}` | Any authenticated | — | Public `StudentProfile` (limited fields) |
| GET | `/students/me/posts?type={postType}` | STUDENT | — | paginated posts owned by caller (all types if `type` omitted, unioned client-side per tab) |
| GET | `/students/me/bookmarks?type={postType}` | STUDENT | — | paginated bookmarked posts |

`StudentProfile`:
```json
{
  "id": 101,
  "email": "alice@uni.edu",
  "universityId": "20221-15-001",
  "fullName": "Alice Rahman",
  "department": { "id": 3, "name": "CSE" },
  "gender": "female",
  "profilePictureUrl": "https://.../alice.jpg",
  "onboardingComplete": true
}
```

---

## 3. Reference Data (dropdowns)

| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/departments` | Public | `[{ "id", "name", "code" }]` |
| GET | `/courses?departmentId=3` | Public | `[{ "id", "courseCode", "courseName", "departmentId" }]` |
| GET | `/trimesters` | Public | `[{ "id", "name", "startDate", "endDate" }]` |

---

## 4. Lost & Found

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/lost-found` | STUDENT | see below | `201` `LostFoundPost` |
| GET | `/lost-found?kind=lost&status=not_found` | Any | — | paginated `LostFoundPost` |
| GET | `/lost-found/{id}` | Any | — | `LostFoundPost` |
| PUT | `/lost-found/{id}` | STUDENT (owner), AUTHORITY_ADMIN | `{ "postKind", "description" }` | `LostFoundPost` |
| DELETE | `/lost-found/{id}` | STUDENT (owner), AUTHORITY_ADMIN | — | `204` |
| PATCH | `/lost-found/{id}/status` | STUDENT (owner), AUTHORITY_STAFF/ADMIN | `{ "status": "found"\|"not_found" }` | `LostFoundPost` |
| POST | `/lost-found/{id}/images` | STUDENT (owner) | `multipart/form-data` (`files[]`) | `[{ "id", "imageUrl" }]` |
| DELETE | `/lost-found/{id}/images/{imageId}` | STUDENT (owner) | — | `204` |

Create body:
```json
{
  "postKind": "lost",
  "description": "Black wallet lost near the library, has a student ID inside."
}
```

Feed item (`LostFoundPost`):
```json
{
  "id": 88,
  "postedBy": { "id": 101, "fullName": "Alice Rahman" },
  "createdAt": "2026-08-30T09:15:00Z",
  "description": "Black wallet lost near the library...",
  "postKind": "lost",
  "status": "not_found",
  "images": ["https://.../wallet1.jpg"]
}
```

---

## 5. Announcements

Owner can be a club or authority — determined from the JWT's `accountType`.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/announcements` | CLUB, AUTHORITY_STAFF/ADMIN | `{ "description" }` (+ optional images after create) | `201` `Announcement` |
| GET | `/announcements` | Any | — | paginated `Announcement` |
| GET | `/announcements/{id}` | Any | — | `Announcement` |
| PUT | `/announcements/{id}` | Owner (CLUB/AUTHORITY), AUTHORITY_ADMIN | `{ "description" }` | `Announcement` |
| DELETE | `/announcements/{id}` | Owner, AUTHORITY_ADMIN | — | `204` |
| POST | `/announcements/{id}/images` | Owner | `multipart/form-data` | `[{ "id", "imageUrl" }]` |

`Announcement`:
```json
{
  "id": 12,
  "postedBy": { "type": "club", "id": 4, "name": "Robotics Club" },
  "description": "Robotics workshop signups open this week.",
  "createdAt": "2026-08-29T12:00:00Z",
  "images": []
}
```

---

## 6. Events

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/events` | CLUB, AUTHORITY_STAFF/ADMIN | see below | `201` `Event` |
| GET | `/events?upcoming=true` | Any | — | paginated `Event` |
| GET | `/events/{id}` | Any | — | `Event` |
| PUT | `/events/{id}` | Owner, AUTHORITY_ADMIN | `{ "description", "registrationLink"?, "eventDate"? }` | `Event` |
| DELETE | `/events/{id}` | Owner, AUTHORITY_ADMIN | — | `204` |
| POST | `/events/{id}/images` | Owner | `multipart/form-data` | `[{ "id", "imageUrl" }]` |

Create body:
```json
{
  "description": "Annual tech fest — build your own sensor kit.",
  "registrationLink": "https://forms.gle/abc123",
  "eventDate": "2026-09-20T10:00:00Z"
}
```

---

## 7. Complaints

Voting reuses the shared reactions endpoint (`POST /posts/complaint/{id}/reactions`) —
a `like` counts as an upvote, `dislike` as a downvote. Crossing the configured
threshold auto-flips `not_approved → pending` (handled by a DB trigger; the API
just reflects the resulting status).

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/complaints` | STUDENT | `{ "description" }` | `201` `Complaint` |
| GET | `/complaints?status=pending` | Any | — | paginated `Complaint` |
| GET | `/complaints/{id}` | Any | — | `Complaint` |
| PUT | `/complaints/{id}` | STUDENT (owner, only while `not_approved`) | `{ "description" }` | `Complaint` |
| DELETE | `/complaints/{id}` | STUDENT (owner), AUTHORITY_ADMIN | — | `204` |
| PATCH | `/complaints/{id}/status` | AUTHORITY_STAFF/ADMIN | `{ "status": "processing"\|"handled"\|"denied" }` | `Complaint` |
| POST | `/complaints/{id}/images` | STUDENT (owner) | `multipart/form-data` | `[{ "id", "imageUrl" }]` |

Note: `PATCH .../status` rejects transitions out of `not_approved`/`pending` into
anything other than `processing → handled/denied`, enforced in the service layer
(`pending` is only reachable via the vote-threshold trigger, never set directly by authority).

`Complaint`:
```json
{
  "id": 205,
  "postedBy": { "id": 101, "fullName": "Alice Rahman" },
  "description": "AC broken in Library Room 3 for a week now.",
  "status": "pending",
  "upvotes": 14,
  "downvotes": 2,
  "handledBy": null,
  "createdAt": "2026-08-25T08:00:00Z"
}
```

---

## 8. Marketplace

One vendor profile per student, auto-created the first time they post a listing
(the `POST /marketplace/listings` handler creates it transparently if missing).

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/marketplace/vendors/{vendorId}` | Any | — | `VendorProfile` (public view) |
| PUT | `/marketplace/vendors/me` | STUDENT (vendor owner) | `{ "vendorName"?, "bio"? }` | `VendorProfile` |
| POST | `/marketplace/vendors/{vendorId}/reviews` | STUDENT | `{ "rating": 1-5, "reviewText"? }` | `201` `VendorReview` |
| GET | `/marketplace/vendors/{vendorId}/reviews` | Any | — | paginated `VendorReview` |
| POST | `/marketplace/listings` | STUDENT | see below | `201` `Listing` |
| GET | `/marketplace/listings?minPrice=&maxPrice=&status=` | Any | — | paginated `Listing` |
| GET | `/marketplace/listings/{id}` | Any | — | `Listing` |
| PUT | `/marketplace/listings/{id}` | STUDENT (owner) | `{ "description", "price" }` | `Listing` |
| PATCH | `/marketplace/listings/{id}/status` | STUDENT (owner) | `{ "status": "sold"\|"unsold", "showStatus": true }` | `Listing` |
| DELETE | `/marketplace/listings/{id}` | STUDENT (owner), AUTHORITY_ADMIN | — | `204` |
| POST | `/marketplace/listings/{id}/images` | STUDENT (owner) | `multipart/form-data` | `[{ "id", "imageUrl" }]` |

Create listing body:
```json
{
  "description": "Casio scientific calculator, barely used.",
  "price": 850.00,
  "showStatus": false
}
```

`Listing`:
```json
{
  "id": 340,
  "vendor": { "id": 22, "vendorName": "Alice's Corner", "avgRating": 4.5 },
  "description": "Casio scientific calculator, barely used.",
  "price": 850.00,
  "status": null,
  "contactEnabled": true,
  "createdAt": "2026-08-27T14:20:00Z",
  "images": []
}
```
`contactEnabled: true` is the "message option" placeholder — the client shows a
"Message Seller" button that deep-links out; no chat is stored server-side.

---

## 9. Study Zone

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/study-sessions` | STUDENT | see below | `201` `StudySession` |
| GET | `/study-sessions?mode=online&courseId=` | Any | — | paginated `StudySession` |
| GET | `/study-sessions/{id}` | Any | — | `StudySession` (includes participant count) |
| PUT | `/study-sessions/{id}` | STUDENT (owner) | `{ "subjectText", "studyTime", "peerLimit", "tutorNeeded", "mode", "description"? }` | `StudySession` |
| DELETE | `/study-sessions/{id}` | STUDENT (owner), AUTHORITY_ADMIN | — | `204` |
| POST | `/study-sessions/{id}/participants` | STUDENT | — (join; `409` if full or already joined) | `201` |
| DELETE | `/study-sessions/{id}/participants/me` | STUDENT | — | `204` |
| GET | `/study-sessions/{id}/participants` | Owner, AUTHORITY | — | `[StudentProfile]` |

Create body:
```json
{
  "courseId": 14,
  "subjectText": "Data Structures — Trees & Graphs",
  "studyTime": "2026-09-02T18:00:00Z",
  "peerLimit": 5,
  "tutorNeeded": true,
  "mode": "offline",
  "description": "Meeting at the CS building, room 204."
}
```

---

## 10. Material Sharing

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/materials` | STUDENT | see below | `201` `MaterialShare` |
| GET | `/materials?departmentId=&courseId=&trimesterId=` | Any | — | paginated `MaterialShare` |
| GET | `/materials/{id}` | Any | — | `MaterialShare` |
| PUT | `/materials/{id}` | STUDENT (owner) | `{ "description"? }` | `MaterialShare` |
| DELETE | `/materials/{id}` | STUDENT (owner), AUTHORITY_ADMIN | — | `204` |
| POST | `/materials/{id}/files` | STUDENT (owner) | `multipart/form-data` (`files[]`, `fileType`) | `[{ "id", "fileUrl", "fileType" }]` |
| DELETE | `/materials/{id}/files/{fileId}` | STUDENT (owner) | — | `204` |

Create body:
```json
{
  "departmentId": 3,
  "courseId": 14,
  "trimesterId": 7,
  "description": "Full slide deck + my annotated notes for midterm coverage."
}
```

---

## 11. Shared Engagement (likes/dislikes, comments, bookmarks, reports, images)

Applies uniformly across all seven `{postType}` values. Implemented as one
`EngagementController` in Spring Boot rather than duplicated per module.

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| PUT | `/posts/{postType}/{postId}/reaction` | STUDENT | `{ "reaction": "like"\|"dislike" }` | `200` `{ "likes", "dislikes", "myReaction" }` (upsert — replaces any prior reaction) |
| DELETE | `/posts/{postType}/{postId}/reaction` | STUDENT | — | `204` (removes caller's reaction) |
| GET | `/posts/{postType}/{postId}/reactions` | Any | — | `{ "likes", "dislikes" }` |
| POST | `/posts/{postType}/{postId}/comments` | STUDENT, CLUB, AUTHORITY | `{ "commentText", "parentCommentId"? }` | `201` `Comment` |
| GET | `/posts/{postType}/{postId}/comments` | Any | — | paginated `Comment` (threaded via `parentCommentId`) |
| PUT | `/comments/{commentId}` | Comment owner | `{ "commentText" }` | `Comment` |
| DELETE | `/comments/{commentId}` | Comment owner, AUTHORITY_ADMIN | — | `204` |
| PUT | `/posts/{postType}/{postId}/bookmark` | STUDENT | — | `201` (idempotent — `200` if already bookmarked) |
| DELETE | `/posts/{postType}/{postId}/bookmark` | STUDENT | — | `204` |
| POST | `/posts/{postType}/{postId}/reports` | STUDENT | `{ "reason", "details"? }` | `201` `{ "id", "status": "pending" }` |

`Comment`:
```json
{
  "id": 900,
  "postedBy": { "type": "student", "id": 101, "name": "Alice Rahman" },
  "commentText": "Following up on this one.",
  "parentCommentId": null,
  "createdAt": "2026-08-30T10:00:00Z"
}
```

> Note on PUT for reaction: using `PUT` (not `POST`) because it's a full
> upsert on a unique `(postType, postId, student)` resource — calling it twice
> with a different body just overwrites the reaction, which matches PUT semantics.

---

## 12. University Authority — Moderation & Admin

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| GET | `/admin/reports?status=pending&postType=` | AUTHORITY_STAFF/ADMIN | — | paginated `Report` (joined with post preview) |
| PATCH | `/admin/reports/{id}` | AUTHORITY_STAFF/ADMIN | `{ "status": "reviewed"\|"dismissed"\|"action_taken" }` | `Report` |
| GET | `/admin/complaints?status=pending` | AUTHORITY_STAFF/ADMIN | — | paginated `Complaint` (same as §7, admin-scoped) |
| GET | `/admin/lost-found?status=not_found` | AUTHORITY_STAFF/ADMIN | — | paginated `LostFoundPost` |
| GET | `/admin/drivers` | AUTHORITY_STAFF/ADMIN | — | paginated driver list |
| PATCH | `/admin/drivers/{id}` | AUTHORITY_STAFF/ADMIN | `{ "isActive"? , "phone"? }` | driver |

(Deletes/edits of any post type by an admin reuse the same module endpoints in
§4–§10 — `AUTHORITY_ADMIN` is already an allowed role on every owner-gated
`PUT`/`DELETE` above, so there's no separate "force delete" endpoint.)

---

## 13. Shuttle Tracking

Design: authority manages routes/stops/vehicles; a driver starts a **trip** by
picking a route, then the driver's app pings location periodically; students
poll (or subscribe over WebSocket) for the active trip's current position.

### Authority — setup
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/admin/shuttle-routes` | AUTHORITY_STAFF/ADMIN | `{ "name", "description"? }` | `201` `Route` |
| POST | `/admin/shuttle-routes/{id}/stops` | AUTHORITY_STAFF/ADMIN | `{ "stopName", "sequenceNo", "latitude", "longitude" }` | `201` `Stop` |
| PUT | `/admin/shuttle-routes/{id}` | AUTHORITY_STAFF/ADMIN | `{ "name", "description", "isActive" }` | `Route` |
| POST | `/admin/shuttles` | AUTHORITY_STAFF/ADMIN | `{ "vehicleNo", "capacity"? }` | `201` `Shuttle` |

### Driver
| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/driver/trips` | DRIVER | `{ "routeId", "shuttleId"? }` | `201` `{ "tripId", "status": "active" }` |
| PATCH | `/driver/trips/{tripId}/location` | DRIVER (trip owner) | `{ "latitude", "longitude", "heading"?, "speedKmh"? }` | `204` (writes `shuttle_locations` row + updates cached position on `shuttle_trips`) |
| POST | `/driver/trips/{tripId}/end` | DRIVER (trip owner) | — | `200` `{ "status": "completed" }` |

`PATCH .../location` is expected to be called every few seconds while tracking
is on — keep the body minimal, no auth handshake per call beyond the JWT.

### Students (read-only)
| Method | Path | Auth | Response |
|---|---|---|---|
| GET | `/shuttle-routes` | Any | `[Route]` with nested `stops` |
| GET | `/shuttle-trips/active?routeId=` | Any | `[{ "tripId", "driverName", "currentLatitude", "currentLongitude", "heading", "speedKmh", "locationUpdatedAt" }]` |
| GET | `/shuttle-trips/{id}` | Any | single active/completed trip detail |
| WS | `/ws/shuttle-tracking` (STOMP topic `/topic/trips/{tripId}`) | Any | push updates instead of polling `active` endpoint every few seconds — recommended for the live map view |

`Route`:
```json
{
  "id": 2,
  "name": "North Campus Loop",
  "isActive": true,
  "stops": [
    { "id": 5, "stopName": "Main Gate", "sequenceNo": 1, "latitude": 23.8103, "longitude": 90.4125 },
    { "id": 6, "stopName": "Library", "sequenceNo": 2, "latitude": 23.8110, "longitude": 90.4130 }
  ]
}
```

---

## 14. Spring Boot Package Sketch

```
com.campus360
 ├─ config/        SecurityConfig, JwtFilter, WebSocketConfig, OpenApiConfig
 ├─ auth/          controllers + services for §1
 ├─ student/       profile, onboarding
 ├─ reference/     departments, courses, trimesters
 ├─ lostfound/
 ├─ announcement/
 ├─ event/
 ├─ complaint/
 ├─ marketplace/   vendor/, listing/, review/
 ├─ studyzone/
 ├─ material/
 ├─ engagement/    shared reaction/comment/bookmark/report controller+service (uses postType enum to route to the right JPA repository internally)
 ├─ admin/         moderation, driver management
 ├─ shuttle/       route/, trip/, location/ (+ WebSocket broadcaster)
 └─ common/        pagination DTOs, error handling, S3/file-upload util
```

The `engagement` package is the one non-obvious piece: since the DB tables are
polymorphic (`post_type` + `post_id`, no single FK target), the service layer
needs a small `PostTypeRegistry` (a `Map<PostType, JpaRepository<?,Long>>` or
equivalent) to validate that a given `postId` actually exists for the claimed
`postType` before writing a reaction/comment/bookmark/report — since the DB
itself can't enforce that.
