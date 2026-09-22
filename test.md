# Postman Testing Guide: Shuttle Tracking

> **Authorization Header:** For the Admin and Driver endpoints, you must include the `Authorization` header with the value `Bearer <your_jwt_token>`. 
> Note: Admin login is `admin@campus360.edu` with password `admin123`.

---

## 1. Authority (Admin) Endpoints
*These require a token from a user with the `AUTHORITY_ADMIN` or `AUTHORITY_STAFF` role.*

### A. Create a Shuttle Route
- **Type:** `POST`
- **URL:** `http://localhost:8080/api/v1/admin/shuttle-routes`
- **Body (JSON):**
```json
{
  "name": "North Campus Loop",
  "description": "Circles the northern dormitories and main library",
  "isActive": true
}
```
*(Take note of the `id` returned in the response, you will need it for the next steps!)*

### B. Add a Stop to the Route
- **Type:** `POST`
- **URL:** `http://localhost:8080/api/v1/admin/shuttle-routes/{routeId}/stops` *(Replace `{routeId}` with the ID from Step A)*
- **Body (JSON):**
```json
{
  "stopName": "Main Library",
  "sequenceNo": 1,
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

### C. Create a Shuttle Vehicle
- **Type:** `POST`
- **URL:** `http://localhost:8080/api/v1/admin/shuttles`
- **Body (JSON):**
```json
{
  "vehicleNo": "BUS-402",
  "capacity": 45
}
```
*(Take note of the `id` returned here, you will need it for the driver).*

---

## 2. Driver Endpoints
*These require a token from a user with the `DRIVER` role.*

### A. Driver Login (Get Token)
- **Type:** `POST`
- **URL:** `http://localhost:8080/api/v1/auth/driver/login`
- **Body (JSON):**
```json
{
  "email": "driver@campus360.edu",
  "password": "driver123"
}
```
*(Copy the `token` from the response and use it as your Bearer token for the next steps!)*

### B. Start a Trip
- **Type:** `POST`
- **URL:** `http://localhost:8080/api/v1/driver/trips`
- **Body (JSON):**
```json
{
  "routeId": 1, 
  "shuttleId": 1
}
```
*(Replace `1` with the IDs you created in the Admin section. Take note of the `id` of the trip returned in the response!)*

### B. Ping Location (Live Tracking Update)
- **Type:** `PATCH`
- **URL:** `http://localhost:8080/api/v1/driver/trips/{tripId}/location` *(Replace `{tripId}` with the ID from Step A)*
- **Body (JSON):**
```json
{
  "latitude": 40.7135,
  "longitude": -74.0065,
  "heading": 90.5,
  "speedKmh": 25.4
}
```
*(You can run this endpoint multiple times with different coordinates to simulate movement. This is the exact endpoint that broadcasts to the WebSocket!)*

### C. End Trip
- **Type:** `POST`
- **URL:** `http://localhost:8080/api/v1/driver/trips/{tripId}/end`
- **Body:** *None required*

---

## 3. Public / Student Endpoints
*These do not require any specific roles, though you may still need a basic JWT token depending on your security rules.*

### A. View All Routes
- **Type:** `GET`
- **URL:** `http://localhost:8080/api/v1/shuttle-routes`
- **Body:** *None*

### B. View Active Trips (Where are the buses right now?)
- **Type:** `GET`
- **URL:** `http://localhost:8080/api/v1/shuttle-trips/active`
- **Body:** *None*
*(If you run this while a driver's trip is active, you will see the bus and its most recently pinged latitude/longitude!)*
