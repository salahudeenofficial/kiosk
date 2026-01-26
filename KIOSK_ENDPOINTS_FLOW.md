# Kiosk Device Endpoints - Complete Flow Documentation

This document provides a comprehensive breakdown of all backend endpoints used by the kiosk device, listed in the exact order they are called during a typical user session.

---

## Overview

The kiosk flow follows this sequence:
1. **Configuration** - Authenticate and get kiosk context
2. **Session Creation** - Create anonymous user session
3. **Profile Update** - Set user age, height, gender
4. **Image Upload** - Upload preprocessed user photo
5. **Catalog Browsing** - Get location-specific products (can be called anytime)
6. **VTON Request** - Request virtual try-on for selected garments
7. **Results Streaming** - Real-time SSE stream for VTON results (opened before/during VTON processing)
8. **Session Completion** - Mark session as completed

---

## 1. POST `/api/kiosk/auth/configure`

### Purpose
Initial kiosk authentication and configuration. Called when kiosk starts or needs to re-authenticate.

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Functions Called
1. **`get_kiosk_context()`** (`app/dependencies/kiosk_auth.py`)
   - Validates client credentials (X-Client-ID, X-Client-Secret)
   - Verifies kiosk exists and is assigned to client
   - Checks kiosk status (online/offline/maintenance)
   - Updates kiosk heartbeat timestamp
   - Caches context in Redis (5 min TTL)

### Data Flow

```
Kiosk Device
    ↓ [Headers: X-Client-ID, X-Client-Secret, X-Kiosk-ID]
Backend Gateway (/api/kiosk/auth/configure)
    ↓
get_kiosk_context()
    ↓
1. Check Redis cache (key: "kiosk:auth:{client_id}:{kiosk_id}")
    ├─ Cache HIT → Return cached context
    └─ Cache MISS → Continue to database
2. Query Database:
    ├─ ApiClient table (validate credentials)
    ├─ ClientOrganization table (get org info)
    ├─ Kiosk table (verify kiosk assignment)
    ├─ ClientLocation table (get location info)
    └─ ApiSubscriptionTier table (get quota limits)
3. Update kiosk heartbeat (kiosk.last_heartbeat = now)
4. Cache context in Redis (5 min TTL)
    ↓
Return Context
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "kiosk_id": "KSK-001",
    "client_id": 123,
    "client_name": "Store Name",
    "location_id": 456,
    "location_name": "Main Store",
    "status": "online",
    "config": {
      "session_timeout_minutes": 30,
      "max_garments_per_session": 10
    }
  }
}
```

### Microservice Interactions
- **PostgreSQL**: Queries `api_clients`, `client_organizations`, `kiosks`, `client_locations`, `api_subs_tiers` tables
- **Redis**: Caches authentication context for 5 minutes (reduces database load)

### Key Features
- Redis caching for performance (cache hit: < 0.1ms)
- Automatic kiosk heartbeat update
- Quota tier information included in response
- Validates kiosk assignment to prevent unauthorized access

---

## 2. POST `/api/kiosk/sessions`

### Purpose
Create a new anonymous user session. Called when user touches the kiosk screen.

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Functions Called
1. **`get_kiosk_context()`** (`app/dependencies/kiosk_auth.py`)
   - Authenticates kiosk (same as endpoint #1)

2. **`KioskSessionService.create_session()`** (`app/services/kiosk_session_service.py`)
   - Generates unique session_id (format: `sess_{16-char-hex}`)
   - Creates anonymous User record in database
   - Creates KioskSession record
   - Sets session expiration (30 minutes default)
   - Logs usage event

3. **`create_access_token()`** (`app/utils/jwt_handler.py`)
   - Generates JWT access token (30 minutes expiration)
   - Includes session_id, user_id, kiosk_id in payload

4. **`create_refresh_token()`** (`app/utils/jwt_handler.py`)
   - Generates refresh token (30 minutes expiration)
   - Set as HTTP-only cookie

### Data Flow

```
Kiosk Device
    ↓ [Headers: X-Client-ID, X-Client-Secret, X-Kiosk-ID]
Backend Gateway (/api/kiosk/sessions)
    ↓
get_kiosk_context() → Validates kiosk auth
    ↓
KioskSessionService.create_session()
    ↓
1. Generate session_id (UUID-based, format: "sess_{16-char-hex}")
2. Create Anonymous User:
    ├─ email: "kiosk_{kiosk_id}_{session_id}@kiosk.local"
    ├─ name: "Kiosk User {session_id[:8]}"
    └─ hashed_password: "kiosk_user_no_password" (placeholder)
3. Create KioskSession record:
    ├─ session_id: unique session identifier
    ├─ kiosk_id: database ID of kiosk
    ├─ client_org_id: client organization ID
    ├─ location_id: location ID (from kiosk)
    ├─ user_id: reference to anonymous user
    ├─ status: "active"
    ├─ current_step: "profile"
    └─ expires_at: now + 30 minutes
4. Log usage event (kiosk_usage_logs table)
    ↓
Generate JWT Tokens:
    ├─ Access Token (30 min expiry)
    └─ Refresh Token (30 min expiry, HTTP-only cookie)
    ↓
Return Session Data + Tokens
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "session_id": "sess_a1b2c3d4e5f6g7h8",
    "user_id": 789,
    "expires_at": "2024-01-15T10:30:00Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Cookies Set:**
- `kiosk_refresh_token`: HTTP-only cookie with refresh token (30 min expiry)

### Microservice Interactions
- **PostgreSQL**: 
  - Inserts into `users` table (anonymous user)
  - Inserts into `kiosk_sessions` table
  - Inserts into `kiosk_usage_logs` table
- **JWT Handler**: Generates access/refresh tokens (stateless)

### Key Features
- Automatic anonymous user creation
- Session expiration (30 minutes)
- JWT token authentication (stateless)
- HTTP-only refresh token cookie (prevents XSS attacks)
- Usage logging for analytics

---

## 3. PATCH `/api/kiosk/sessions/{session_id}`

### Purpose
Update user profile (age, height, gender). Called after user enters their details.

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
// OR (fallback)
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Request Body
```json
{
  "age": 25,
  "height": 170.0,
  "gender": "Men"
}
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates JWT token OR header-based auth
   - Verifies session exists and is active
   - Checks session expiration

2. **`KioskSessionService.update_session_profile()`** (`app/services/kiosk_session_service.py`)
   - Atomically updates session profile
   - Updates User record synchronously
   - Validates session ownership (kiosk_db_id)
   - Uses optimistic locking to prevent concurrent modifications
   - Updates `current_step` to "camera"
   - Logs audit trail

### Data Flow

```
Kiosk Device
    ↓ [Authorization: Bearer {JWT_TOKEN}]
    ↓ [Body: {age, height, gender}]
Backend Gateway (/api/kiosk/sessions/{session_id})
    ↓
get_kiosk_session()
    ├─ Verify JWT token OR header-based auth
    ├─ Load session from database
    ├─ Check expiration
    └─ Verify session ownership
    ↓
KioskSessionService.update_session_profile()
    ↓
1. Atomic expiration check (update expired sessions to "expired" status)
2. Load session with ownership check
3. Optimistic locking check (updated_at timestamp)
4. Build update values:
    ├─ age: {provided}
    ├─ height: {provided}
    └─ current_step: "camera"
5. Atomic update (with optimistic lock check)
6. Update User record:
    ├─ age: {provided}
    ├─ height: {provided}
    └─ gender: {normalized: "M" or "F"}
7. Log audit trail (audit_logs table)
8. Commit transaction
    ↓
Return Updated Session Data
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "session_id": "sess_a1b2c3d4e5f6g7h8",
    "age": 25,
    "height": 170.0,
    "gender": "Men",
    "current_step": "camera"
  }
}
```

### Microservice Interactions
- **PostgreSQL**: 
  - Updates `kiosk_sessions` table (atomic update with optimistic locking)
  - Updates `users` table (synchronously)
  - Inserts into `audit_logs` table (if audit service configured)
- **JWT Handler**: Verifies token (if JWT auth used)

### Key Features
- Supports both JWT and header-based authentication
- Atomic updates prevent race conditions
- Optimistic locking prevents concurrent modifications
- Session ownership verification (security)
- Gender normalization (M/F)
- Automatic step update to "camera"

---

## 4. POST `/api/kiosk/sessions/{session_id}/image`

### Purpose
Upload user photo (preprocessed by frontend). Called after user takes/captures photo.

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
Content-Type: multipart/form-data
```

### Request Body
```
Form Data:
  image: {image_file} (JPEG/PNG/WebP, preprocessed: 768×1024, 3:4 aspect ratio)
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates authentication

2. **`KioskSessionService.get_session()`** (`app/services/kiosk_session_service.py`)
   - Verifies session exists and is active

3. **`upload_file_to_s3()`** (`app/utils/s3_client.py`)
   - Uploads image to S3 (preserves original format)
   - S3 path: `user_image/{user_id}/{request_id}/image.{ext}`

4. **`process_post_upload_tasks()`** (`app/routes/users.py`)
   - Triggers mask generation asynchronously
   - Publishes Kafka message for mask processing

5. **`KioskSessionService.update_session_step()`** (`app/services/kiosk_session_service.py`)
   - Updates `current_step` to "catalog"

6. **`KioskSessionService.log_usage()`** (`app/services/kiosk_session_service.py`)
   - Logs image upload event

### Data Flow

```
Kiosk Device (Frontend)
    ↓ [Preprocesses image: 768×1024, 3:4 aspect ratio]
    ↓ [Uploads via multipart/form-data]
Backend Gateway (/api/kiosk/sessions/{session_id}/image)
    ↓
get_kiosk_session() → Verify auth
KioskSessionService.get_session() → Verify session active
    ↓
1. Read image file (no backend preprocessing - uses original)
2. Determine file extension (jpg/png/webp)
3. Generate S3 key: "user_image/{user_id}/{request_id}/image.{ext}"
4. Upload to S3:
    ├─ Bucket: S3_BUCKET_USER_IMAGES
    ├─ Preserves original format (JPEG/PNG/WebP)
    └─ Returns S3 URL: "s3://bucket/user_image/..."
5. Update User.image_url in database
6. Update session.current_step = "catalog"
7. Log usage event (image_uploaded)
8. Trigger mask generation (async, don't wait):
    ├─ process_post_upload_tasks()
    ├─ Publishes Kafka message: "user-image-updated"
    └─ Mask service processes asynchronously
    ↓
Return Image URL
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "session_id": "sess_a1b2c3d4e5f6g7h8",
    "user_id": 789,
    "image_url": "s3://bucket/user_image/789/req123/image.jpg",
    "status": "processing",
    "current_step": "catalog",
    "measurement_status": "queued"
  }
}
```

### Microservice Interactions
- **PostgreSQL**: 
  - Updates `users` table (image_url)
  - Updates `kiosk_sessions` table (current_step)
  - Inserts into `kiosk_usage_logs` table
- **S3**: Uploads image file (user_image bucket)
- **Kafka**: Publishes `user-image-updated` message (triggers mask generation AND measurement processing)
- **Mask Service** (via Kafka): 
  - Consumes `user-image-updated` message
  - Generates masks asynchronously
  - Updates `flux_masks` or `qwen_masks` table when complete
- **Measurement Service** (via Kafka):
  - Consumes `user-image-updated` message
  - Processes body measurements asynchronously
  - Updates `measurements` table when complete

### Key Features
- **No backend preprocessing** - frontend handles image preprocessing
- Preserves original file format (JPEG/PNG/WebP)
- Asynchronous mask generation (non-blocking)
- Asynchronous measurement processing (non-blocking)
- Automatic step update to "catalog"
- Usage logging for analytics

---

## 4.5. GET `/api/kiosk/sessions/{session_id}/measurements`

### Purpose
Get body measurements for the kiosk session. Returns normalized measurements based on user's actual height. Can be polled to check measurement processing status.

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
// OR
Authorization: Bearer {JWT_TOKEN}
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates authentication
   - Verifies session ownership

2. **`KioskSessionService.get_session()`** (`app/services/kiosk_session_service.py`)
   - Verifies session exists and is active

3. **`normalize_measurements()`** (`app/routes/users.py`)
   - Normalizes measurements based on user height ratio
   - Formula: `normalized_value = original_value × (user_height / detected_height)`

### Data Flow

```
Kiosk Device
    ↓ [GET /api/kiosk/sessions/{session_id}/measurements]
Backend Gateway (/api/kiosk/sessions/{session_id}/measurements)
    ↓
get_kiosk_session() → Verify auth + session ownership
KioskSessionService.get_session() → Verify session active
    ↓
1. Get user_id from session
2. Query measurements table:
    ├─ WHERE user_id = {user_id}
    ├─ ORDER BY updated_at DESC
    └─ LIMIT 1 (get latest)
3. If status = 'success':
    ├─ Fetch user.height from users table
    ├─ Parse raw measurements (CSV format)
    ├─ Extract detected_height from measurements
    ├─ Calculate ratio: user_height / detected_height
    ├─ Normalize all measurement values
    └─ Return normalized measurements
4. If status != 'success' or no record:
    └─ Return status: "processing" | "not_started" | "failed"
    ↓
Return Measurement Status + Data
```

### Response Structure (Success)
```json
{
  "success": true,
  "data": {
    "status": "success",
    "measurements": "neck circumference,40.5\nchest circumference,100.2\nwaist circumference,85.3\nhip circumference,95.8\nshoulder width,42.1\narm length,58.3\nleg length,95.0\nheight,175.0\n..."
  }
}
```

### Response Structure (Processing)
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "measurements": null
  }
}
```

### Response Structure (Not Started)
```json
{
  "success": true,
  "data": {
    "status": "processing",
    "measurements": null
  }
}
```

### Response Structure (Failed)
```json
{
  "success": true,
  "data": {
    "status": "failed",
    "measurements": null
  }
}
```

### Measurement Data Format
Measurements are returned as a CSV string with one measurement per line:
```
measurement_name,value
neck circumference,40.5
chest circumference,100.2
waist circumference,85.3
hip circumference,95.8
shoulder width,42.1
arm length,58.3
leg length,95.0
height,175.0
...
```

### Microservice Interactions
- **PostgreSQL**: 
  - Queries `measurements` table (latest record for user)
  - Queries `users` table (for user height)
  - Queries `kiosk_sessions` table (for session verification)

### Key Features
- **Height Normalization**: Measurements are normalized based on user's actual height vs detected height
- **Status Tracking**: Returns processing status if measurements are not ready
- **Session-based Access**: Only accessible for the authenticated kiosk session
- **Polling Support**: Frontend can poll this endpoint to check measurement status
- **Error Handling**: Gracefully handles missing measurements or processing failures

### Measurement Processing Flow
1. **Image Upload** → Publishes Kafka message `user-image-updated`
2. **Measurement Service** → Consumes Kafka message
3. **External Service** → Processes image and detects measurements
4. **Callback** → Measurement Service receives results
5. **Database Update** → `measurements` table updated with status='success'
6. **Frontend Polling** → GET `/api/kiosk/sessions/{session_id}/measurements` returns normalized measurements

### Normalization Logic
- If user height is set: All measurements are normalized by ratio `(user_height / detected_height)`
- If user height is not set: Returns original measurements (no normalization)
- Normalized values are rounded to 2 decimal places

---

## 5. GET `/api/kiosk/catalog`

### Purpose
Get location-specific product catalog. Can be called anytime after configuration (typically after image upload).

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Query Parameters
```
limit: 50 (default, max: 100)
offset: 0
category_id: {optional} - Filter by category ID
gender: "Men" | "Women" (optional) - Filter by gender
search: {query_string} (optional) - Search product names (case-insensitive)
brand_id: {optional} - Filter by brand ID (integer)
min_price: {optional} - Minimum price filter (MRP >= min_price, number >= 0)
max_price: {optional} - Maximum price filter (MRP <= max_price, number >= 0)
sort_by: {optional} - Sort field: "created_at" (default), "mrp", or "name"
sort_order: {optional} - Sort direction: "desc" (default) or "asc"
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates authentication
   - Provides location_id from kiosk context

2. **`KioskCatalogService.get_location_catalog()`** (`app/services/kiosk_catalog_service.py`)
   - Validates filter parameters (brand_id, min_price, max_price, sort_by, sort_order)
   - Checks Redis cache first (key: `catalog:loc:{location_id}:cat:{category_id}:gen:{gender}:search:{search}:brand:{brand_id}:min:{min_price}:max:{max_price}:sort:{sort_by}:order:{sort_order}:p:{page}`)
   - Queries database with optimized partial indexes
   - Applies filters: category_id, gender, search, brand_id, min_price, max_price
   - Applies sorting: sort_by (created_at/mrp/name) and sort_order (asc/desc)
   - Generates presigned S3 URLs for product images
   - Caches result in Redis (5 min TTL)

3. **`get_s3_presigned_url()`** (`app/utils/s3_client.py`)
   - Generates presigned URLs for product thumbnail images
   - 7-day expiration

### Data Flow

```
Kiosk Device
    ↓ [GET /api/kiosk/catalog?limit=50&offset=0&gender=Men]
Backend Gateway (/api/kiosk/catalog)
    ↓
get_kiosk_session() → Get location_id
    ↓
KioskCatalogService.get_location_catalog()
    ↓
1. Validate filter parameters:
    ├─ Validate sort_by (created_at, mrp, name) - default: created_at
    ├─ Validate sort_order (asc, desc) - default: desc
    ├─ Validate min_price >= 0 (if provided)
    ├─ Validate max_price >= 0 (if provided)
    └─ Validate min_price <= max_price (if both provided)
2. Build cache key: "catalog:loc:{location_id}:cat:{category_id}:gen:{gender}:search:{search}:brand:{brand_id}:min:{min_price}:max:{max_price}:sort:{sort_by}:order:{sort_order}:p:{page}"
3. Check Redis cache:
    ├─ Cache HIT (< 0.1ms) → Return cached result
    └─ Cache MISS → Query database
4. Database Query (optimized):
    ├─ Joins: location_products → products → brands → categories
    ├─ Filter: location_id, is_active=true (uses partial index)
    ├─ Additional filters:
    │   ├─ category_id (if provided)
    │   ├─ gender (if provided)
    │   ├─ search (case-insensitive ILIKE on product name)
    │   ├─ brand_id (if provided)
    │   ├─ min_price (Product.mrp >= min_price, if provided)
    │   └─ max_price (Product.mrp <= max_price, if provided)
    ├─ Sorting:
    │   ├─ If sort_by="mrp": Order by Product.mrp (asc/desc), then display_order
    │   ├─ If sort_by="name": Order by Product.name (asc/desc), then display_order
    │   └─ Default (created_at): Order by display_order ASC, Product.created_at DESC
    └─ Pagination: limit, offset
5. For each product:
    ├─ Get thumbnail image from Product.thumbnail_image_path (no N+1 query!)
    ├─ Generate presigned S3 URL (7-day expiry)
    ├─ Use custom_price if set, otherwise use Product.mrp
    └─ Format product data
6. Get total count (for pagination) - matches all filters
7. Cache result in Redis (5 min TTL)
    ↓
Return Catalog + Pagination Info
```

### Example Requests

**Basic Request (no filters):**
```
GET /api/kiosk/catalog?limit=50&offset=0
```

**Filter by Category and Gender:**
```
GET /api/kiosk/catalog?category_id=5&gender=Men&limit=50
```

**Filter by Brand:**
```
GET /api/kiosk/catalog?brand_id=10&limit=50
```

**Price Range Filter:**
```
GET /api/kiosk/catalog?min_price=1000&max_price=5000&limit=50
```

**Search with Filters:**
```
GET /api/kiosk/catalog?search=shirt&gender=Men&min_price=500&limit=50
```

**Sort by Price (Low to High):**
```
GET /api/kiosk/catalog?sort_by=mrp&sort_order=asc&limit=50
```

**Sort by Name (A-Z):**
```
GET /api/kiosk/catalog?sort_by=name&sort_order=asc&limit=50
```

**Complex Filter Combination:**
```
GET /api/kiosk/catalog?category_id=5&brand_id=10&min_price=1000&max_price=5000&sort_by=mrp&sort_order=asc&limit=50&offset=0
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": 123456789,
        "name": "Product Name",
        "mrp": 1999.00,
        "baseColour": "Blue",
        "ratings": 4.5,
        "imageCount": 3,
        "imageUrl": "https://s3.amazonaws.com/...presigned-url...",
        "brand": {
          "id": 1,
          "name": "Brand Name"
        },
        "category": {
          "id": 5,
          "name": "T-Shirts",
          "gender": "Men"
        }
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasNext": true,
      "hasPrevious": false
    }
  }
}
```

### Microservice Interactions
- **PostgreSQL**: 
  - Queries `location_products` table (partial index on `is_active=true`)
  - Joins with `products`, `brands`, `categories`, `product_images` tables
- **Redis**: Caches catalog results (5 min TTL, microsecond performance)
- **S3**: Generates presigned URLs for product images (7-day expiry)

### Key Features
- **Redis caching** for microsecond performance (< 0.1ms cache hit)
- **Partial indexes** for optimized queries (only active products)
- **Pagination support** (limit, offset)
- **Advanced filtering**:
  - Category (category_id)
  - Gender (Men, Women)
  - Search (product name, case-insensitive)
  - Brand (brand_id)
  - Price range (min_price, max_price)
- **Flexible sorting**:
  - Sort by: created_at (default), mrp, or name
  - Sort order: desc (default) or asc
  - Always includes display_order as secondary sort
- **Presigned S3 URLs** (7-day expiry, no backend bandwidth)
- **Backward compatible** - all new parameters are optional

---

## 5.1. GET `/api/kiosk/catalog/filters`

### Purpose
Return **filter metadata** (brand list + category list + price range) for the kiosk’s **location-specific** catalogue, so the frontend can build filter UI in one call.

This is the endpoint your frontend should call once (or occasionally) to fetch:
- **Brand names + IDs** (for brand filter dropdown)
- **Category names + IDs** (for category filter dropdown)
- **Price range** (min/max bounds for slider)

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Query Parameters (Optional)
```
gender: "Men" | "Women" (optional)  - Restrict brands/categories to a gender catalogue
search: {query_string} (optional)   - Restrict brands/categories to products matching search term
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates authentication
   - Provides `location_id`

2. **`KioskCatalogService.get_catalog_filters()`** (`app/services/kiosk_catalog_service.py`)
   - Checks Redis cache first (5 min TTL)
   - Queries DB for distinct categories and brands for `location_id` where `location_products.is_active=true`
   - Computes price range using effective price:
     - `price = COALESCE(location_products.custom_price, products.mrp)`
   - Caches result in Redis (5 min TTL)

### Data Flow
```
Kiosk Device
    ↓ [GET /api/kiosk/catalog/filters?gender=Men]
Backend Gateway (/api/kiosk/catalog/filters)
    ↓
get_kiosk_session() → Get location_id
    ↓
KioskCatalogService.get_catalog_filters()
    ↓
1. Build cache key: "catalog:filters:loc:{location_id}:gen:{gender}:search:{search}"
2. Check Redis:
    ├─ Cache HIT → Return cached result
    └─ Cache MISS → Query DB
3. DB queries:
    ├─ Distinct categories (id, name, gender)
    ├─ Distinct brands (id, name)
    └─ Price range: MIN/MAX of COALESCE(custom_price, mrp)
4. Cache in Redis (5 min TTL)
    ↓
Return filters metadata
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "brands": [
      { "id": 10, "name": "Brand A" },
      { "id": 11, "name": "Brand B" }
    ],
    "categories": [
      { "id": 5, "name": "T-Shirts", "gender": "Men" },
      { "id": 6, "name": "Shirts", "gender": "Men" }
    ],
    "price_range": {
      "min": 499.0,
      "max": 7999.0
    }
  }
}
```

### Key Features
- **One-shot filter metadata** for frontend filter UI (brands + categories + price range)
- **Location-aware**: only returns data for the authenticated kiosk `location_id`
- **Active products only**: `location_products.is_active=true`
- **Redis cached** (5 min TTL)

---

## 6. POST `/api/kiosk/sessions/{session_id}/vton`

### Purpose
Request virtual try-on for selected garments. Called when user selects garments to try on.

### Headers Required
```
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Request Body
```json
{
  "garment_ids": [123456789, 987654321]  // Max 10 garments
}
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates authentication
   - Verifies session ownership

2. **`KioskSessionService.get_session()`** (`app/services/kiosk_session_service.py`)
   - Verifies session exists and is active

3. **Quota Check** (Redis-based)
   - Checks daily VTON quota (tier.daily_quota)
   - Increments quota counter after processing

4. **`get_garment_thumbnail_and_category()`** (`app/utils/vton_helpers.py`)
   - Gets garment image path (priority: `vton_image=true` > `is_thumbnail=true` > first image)
   - Gets category name and gender

5. **`check_masks_ready()`** (`app/utils/vton_queue.py`)
   - Checks if user has completed masks (Flux or Qwen provider)
   - Queries `flux_masks` or `qwen_masks` table

6. **If Masks Ready:**
   - **`get_user_image_and_mask()`** (`app/utils/vton_helpers.py`)
     - Gets user image URL (presigned)
     - Gets appropriate mask path based on category/gender
   - **`get_vton_storage_keys()`** (`app/utils/vton_helpers.py`)
     - Converts S3 paths to storage keys for CPU Bridge
     - Handles kiosk vs regular product paths
   - **`call_cpu_bridge()`** (`app/utils/vton_helpers.py`)
     - Calls CPU Bridge `/bridge/tryon` endpoint
     - Sends storage keys and VTON configuration

7. **If Masks Not Ready:**
   - **`queue_vton_request()`** (`app/utils/vton_queue.py`)
     - Creates `PendingVtonRequest` record
     - Processes later when masks become available

8. **`KioskSessionService.update_session_step()`** (`app/services/kiosk_session_service.py`)
   - Updates `current_step` to "results"

9. **`KioskSessionService.log_usage()`** (`app/services/kiosk_session_service.py`)
   - Logs VTON request event

### Data Flow

```
Kiosk Device
    ↓ [POST /api/kiosk/sessions/{session_id}/vton]
    ↓ [Body: {garment_ids: [123, 456]}]
Backend Gateway (/api/kiosk/sessions/{session_id}/vton)
    ↓
get_kiosk_session() → Verify auth + session ownership
KioskSessionService.get_session() → Verify session active
    ↓
1. Check Daily Quota (Redis):
    ├─ Key: "kiosk:quota:vton:{client_org_id}:{today}"
    ├─ Current count vs daily_quota
    └─ If exceeded → 429 Too Many Requests
2. For each garment_id:
    ├─ get_garment_thumbnail_and_category():
    │   ├─ Query product by product_id
    │   ├─ Priority: vton_image=true > is_thumbnail=true > first image
    │   └─ Get category_name, gender
    ├─ check_masks_ready():
    │   ├─ Query flux_masks or qwen_masks (based on VTON_PROVIDER)
    │   ├─ Check status="completed"
    │   └─ Verify mask_paths exist (Flux) or upper_body/lower_body paths exist (Qwen)
    ├─ If Masks Ready:
    │   ├─ get_user_image_and_mask():
    │   │   ├─ Get User.image_url (presigned URL)
    │   │   └─ Get mask path based on category/gender:
    │   │       ├─ Flux: mask_paths JSON → select by mask_type
    │   │       └─ Qwen: upper_body_output_path or lower_body_output_path
    │   ├─ get_vton_storage_keys():
    │   │   ├─ Convert user_image URL to S3 path
    │   │   ├─ Use mask_path directly (S3 path)
    │   │   ├─ Convert garment_image_path to storage key:
    │   │   │   ├─ Kiosk path: "kiosk/{client_id}/{product_id}/{filename}"
    │   │   │   └─ Regular path: "fashionx-storage/{gender}/{subcategory}/..."
    │   │   └─ Return storage_keys dict (provider-specific format)
    │   ├─ call_cpu_bridge():
    │   │   ├─ URL: {CPU_BRIDGE_URL}/bridge/tryon
    │   │   ├─ Method: POST
    │   │   ├─ Headers: X-Internal-Auth: {GATEWAY_TO_BRIDGE_SECRET}
    │   │   ├─ Payload:
    │   │   │   ├─ user_id, session_id, job_id
    │   │   │   ├─ storage_keys: {user_image, user_mask, garment_image}
    │   │   │   ├─ provider: "flux" | "qwen"
    │   │   │   └─ config: {seed, steps, guidance_scale}
    │   │   └─ Response: {job_id, status: "QUEUED" | "RUNNING"}
    │   └─ Create VtonJob record (status: "RUNNING")
    └─ If Masks Not Ready:
        ├─ queue_vton_request():
        │   ├─ Create PendingVtonRequest record
        │   └─ Status: "pending"
        └─ Create VtonJob record (status: "WAITING_MASK")
3. Update quota counter (Redis)
4. Update session.current_step = "results"
5. Log usage event
    ↓
Return Job IDs
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "session_id": "sess_a1b2c3d4e5f6g7h8",
    "jobs": [
      {
        "job_id": "uuid-1",
        "garment_id": 123456789,
        "status": "RUNNING"
      },
      {
        "job_id": "uuid-2",
        "garment_id": 987654321,
        "status": "WAITING_MASK"
      }
    ],
    "current_step": "results"
  }
}
```

### Microservice Interactions
- **PostgreSQL**: 
  - Queries `products`, `product_images`, `categories` tables
  - Queries `flux_masks` or `qwen_masks` tables
  - Inserts into `vton_job` table (one per garment)
  - Inserts into `pending_vton_requests` table (if masks not ready)
  - Updates `kiosk_sessions` table (current_step)
  - Inserts into `kiosk_usage_logs` table
- **Redis**: 
  - Checks/increments daily quota counter
  - Caches quota limits
- **CPU Bridge** (microservice): 
  - `/bridge/tryon` endpoint
  - Processes VTON requests
  - Returns job status
- **S3**: Accesses user images, masks, and garment images via storage keys

### Key Features
- **Garment Image Priority**: `vton_image=true` (kiosk catalogue) > `is_thumbnail=true` (regular) > first image
- **Mask Provider Support**: Flux and Qwen providers
- **Quota Enforcement**: Daily/monthly quota limits
- **Mask Readiness Check**: Queues requests if masks not ready
- **Direct CPU Bridge Call**: If masks ready, calls CPU Bridge immediately
- **Storage Key Handling**: Handles kiosk vs regular product paths differently

---

## 7. GET `/api/kiosk/sessions/{session_id}/stream`

### Purpose
Server-Sent Events (SSE) stream for real-time VTON results. Opened before/during VTON processing to receive results as they complete.

### Authentication Options
1. **Query Parameter** (for EventSource compatibility):
   ```
   ?token={JWT_TOKEN}
   ```
2. **Headers** (fallback):
   ```
   X-Client-ID: {client_id}
   X-Client-Secret: {client_secret}
   X-Kiosk-ID: {kiosk_id}
   ```

### Functions Called
1. **Authentication** (`app/routes/kiosk.py`)
   - Validates JWT token (from query param) OR header-based auth
   - Verifies session exists and is active

2. **Redis Pub-Sub** (`app/core/redis_client.py`)
   - Subscribes to Redis channel: `kiosk:vton:{session_id}`
   - Listens for VTON completion events

3. **Kafka Consumer** (`app/utils/kafka_consumer.py`)
   - Consumes `vton-completion` Kafka messages
   - Downloads VTON result images from S3
   - Encodes images as base64 data URLs
   - Publishes to Redis channel for SSE delivery

### Data Flow

```
Kiosk Device
    ↓ [GET /api/kiosk/sessions/{session_id}/stream?token={JWT_TOKEN}]
    ↓ [Opens SSE connection]
Backend Gateway (/api/kiosk/sessions/{session_id}/stream)
    ↓
1. Authenticate (JWT token OR headers)
2. Verify session exists and is active
3. Subscribe to Redis channel: "kiosk:vton:{session_id}"
4. Send initial "connected" event
5. Enter event loop:
    ├─ Listen for Redis pub-sub messages (timeout: 1s)
    ├─ If message received:
    │   ├─ Parse JSON data
    │   ├─ Send SSE event: "vton_result" or "vton_error"
    │   └─ Event includes base64-encoded image data
    └─ If timeout (no message):
        └─ Send heartbeat: ": heartbeat\n\n"

CPU Bridge (microservice)
    ↓ [VTON completes]
Kafka: "vton-completion" topic
    ↓
Kafka Consumer (backend_gateway)
    ↓
1. Receive Kafka message:
    ├─ job_id, user_id, garment_id
    ├─ status: "SUCCESS" | "FAILED" | "TIMEOUT"
    ├─ output_image_url: "s3://bucket/..."
    └─ metadata: {node_id, inference_time_ms, model_version}
2. Update VtonJob record:
    ├─ status: {from Kafka}
    ├─ output_image_url: {from Kafka}
    └─ completed_at: now
3. If kiosk session (session_id exists):
    ├─ Download image from S3 (output_image_url)
    ├─ Encode as base64: base64.b64encode(image_bytes)
    ├─ Determine MIME type (from file extension)
    ├─ Create base64 data URL: "data:image/png;base64,{base64_string}"
    ├─ Build event data:
    │   ├─ job_id, garment_id, status
    │   ├─ output_image_data: "data:image/png;base64,..."
    │   └─ timestamp
    └─ Publish to Redis: "kiosk:vton:{session_id}"
        ↓
SSE Stream (already subscribed)
    ↓
Send SSE Event to Kiosk:
    ├─ event: "vton_result"
    ├─ data: {JSON with base64 image data}
    └─ Format: "event: vton_result\ndata: {...}\n\n"
    ↓
Kiosk Device receives event
    ↓
Display result image (from base64 data URL, no additional HTTP request)
```

### SSE Event Types

1. **`connected`**: Initial connection event
   ```json
   {
     "session_id": "sess_a1b2c3d4e5f6g7h8"
   }
   ```

2. **`vton_result`**: VTON completion with success
   ```json
   {
     "job_id": "uuid-1",
     "garment_id": 123456789,
     "status": "SUCCESS",
     "output_image_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
     "output_image_url": null,  // Only if base64 encoding failed
     "error": null,
     "timestamp": "2024-01-15T10:35:00Z"
   }
   ```

3. **`vton_error`**: VTON failure
   ```json
   {
     "job_id": "uuid-2",
     "garment_id": 987654321,
     "status": "FAILED",
     "output_image_data": null,
     "output_image_url": null,
     "error": "Processing timeout",
     "timestamp": "2024-01-15T10:36:00Z"
   }
   ```

4. **`heartbeat`**: Keep-alive ping (every 1 second if no messages)

### Microservice Interactions
- **PostgreSQL**: 
  - Queries `kiosk_sessions` table (verification)
- **Redis Pub-Sub**: 
  - Subscribes to `kiosk:vton:{session_id}` channel
  - Receives VTON completion events
- **Kafka Consumer**: 
  - Consumes `vton-completion` topic
  - Updates `vton_job` table
  - Downloads images from S3
  - Publishes to Redis channel
- **S3**: Downloads VTON result images for base64 encoding
- **CPU Bridge** (via Kafka): Publishes VTON completion events

### Key Features
- **Base64-encoded images** in SSE events (eliminates additional HTTP requests)
- **Presigned URL fallback** if base64 encoding fails
- **Heartbeat** every 1 second to keep connection alive
- **JWT token via query param** (EventSource API limitation)
- **Header-based auth fallback** for compatibility
- **Real-time delivery** via Redis pub-sub

---

## 8. POST `/api/kiosk/sessions/{session_id}/complete`

### Purpose
Mark session as completed. Called when user finishes their session.

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
// OR (fallback)
X-Client-ID: {client_id}
X-Client-Secret: {client_secret}
X-Kiosk-ID: {kiosk_id}
```

### Functions Called
1. **`get_kiosk_session()`** (`app/dependencies/kiosk_session_auth.py`)
   - Validates authentication
   - Verifies session ownership (if header-based auth, verifies session belongs to kiosk)

2. **`KioskSessionService.complete_session()`** (`app/services/kiosk_session_service.py`)
   - Updates session status to "completed"
   - Sets `completed_at` timestamp

### Data Flow

```
Kiosk Device
    ↓ [POST /api/kiosk/sessions/{session_id}/complete]
Backend Gateway (/api/kiosk/sessions/{session_id}/complete)
    ↓
get_kiosk_session()
    ├─ Verify auth (JWT OR headers)
    └─ Verify session ownership (if header-based auth)
    ↓
KioskSessionService.complete_session()
    ↓
1. Load session from database
2. Update session:
    ├─ status: "completed"
    ├─ completed_at: now
    └─ updated_at: now
3. Commit transaction
    ↓
Return Success
```

### Response Structure
```json
{
  "success": true,
  "data": {
    "session_id": "sess_a1b2c3d4e5f6g7h8",
    "status": "completed",
    "completed_at": "2024-01-15T10:40:00Z"
  }
}
```

### Microservice Interactions
- **PostgreSQL**: 
  - Updates `kiosk_sessions` table (status, completed_at)

### Key Features
- Session cleanup and completion tracking
- Supports both JWT and header-based authentication
- Session ownership verification

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KIOSK USER SESSION FLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

1. Configure (POST /api/kiosk/auth/configure)
   ├─ Authenticate kiosk
   ├─ Get location_id, tier info
   └─ Cache context (Redis)

2. Create Session (POST /api/kiosk/sessions)
   ├─ Create anonymous user
   ├─ Create KioskSession
   ├─ Generate JWT tokens
   └─ Return session_id, user_id, token

3. Update Profile (PATCH /api/kiosk/sessions/{session_id})
   ├─ Set age, height, gender
   ├─ Update User record
   └─ Set current_step = "camera"

4. Upload Image (POST /api/kiosk/sessions/{session_id}/image)
   ├─ Upload to S3
   ├─ Update User.image_url
   ├─ Trigger mask generation (Kafka)
   ├─ Trigger measurement processing (Kafka)
   └─ Set current_step = "catalog"

   [Background: Mask Service generates masks]
   ├─ Kafka: "user-image-updated"
   ├─ Mask Service processes
   └─ Updates flux_masks or qwen_masks table

   [Background: Measurement Service processes measurements]
   ├─ Kafka: "user-image-updated"
   ├─ Measurement Service processes
   └─ Updates measurements table

4.5. Get Measurements (GET /api/kiosk/sessions/{session_id}/measurements) [Can be polled]
   ├─ Query measurements table
   ├─ Normalize by user height
   └─ Return measurements or processing status

5. Get Catalog (GET /api/kiosk/catalog) [Can be called anytime]
   ├─ Query location_products (Redis cache)
   ├─ Generate presigned S3 URLs
   └─ Return products + pagination

6. Request VTON (POST /api/kiosk/sessions/{session_id}/vton)
   ├─ Check quota (Redis)
   ├─ For each garment:
   │   ├─ Get garment image (priority: vton_image > thumbnail)
   │   ├─ Check mask readiness
   │   ├─ If ready:
   │   │   ├─ Get user image + mask
   │   │   ├─ Get storage keys
   │   │   └─ Call CPU Bridge
   │   └─ If not ready:
   │       └─ Queue request
   └─ Set current_step = "results"

   [Background: CPU Bridge processes VTON]
   ├─ CPU Bridge processes request
   ├─ Publishes to Kafka: "vton-completion"
   └─ Kafka Consumer:
       ├─ Updates vton_job table
       ├─ Downloads result image (S3)
       ├─ Encodes as base64
       └─ Publishes to Redis: "kiosk:vton:{session_id}"

7. Stream Results (GET /api/kiosk/sessions/{session_id}/stream) [Opened before/during VTON]
   ├─ Subscribe to Redis channel
   ├─ Receive VTON completion events
   └─ Deliver SSE events to kiosk (base64 image data)

8. Complete Session (POST /api/kiosk/sessions/{session_id}/complete)
   ├─ Mark session as completed
   └─ Set completed_at timestamp
```

---

## Microservices Architecture

### Backend Gateway
- **Role**: API Gateway, orchestrates requests
- **Responsibilities**:
  - Kiosk authentication
  - Session management
  - Catalog retrieval
  - VTON request coordination
  - SSE streaming

### CPU Bridge
- **Role**: VTON processing microservice
- **Endpoints**:
  - `POST /bridge/tryon` - Process VTON request
- **Communication**: Called via HTTP from Backend Gateway

### Mask Service (via Kafka)
- **Role**: Mask generation microservice
- **Kafka Topics**:
  - Consumes: `user-image-updated`
  - Publishes: `mask-generation-results` (updates flux_masks/qwen_masks tables)

### Kafka Consumer (Backend Gateway)
- **Role**: Processes VTON completion events
- **Kafka Topics**:
  - Consumes: `vton-completion` (from CPU Bridge)
- **Responsibilities**:
  - Updates `vton_job` table
  - Downloads result images from S3
  - Encodes images as base64
  - Publishes to Redis pub-sub for SSE delivery

### PostgreSQL
- **Role**: Primary database
- **Tables Used**:
  - `users`, `kiosk_sessions`, `kiosk_usage_logs`
  - `products`, `product_images`, `location_products`
  - `vton_job`, `pending_vton_requests`
  - `flux_masks`, `qwen_masks`

### Redis
- **Role**: Caching and pub-sub
- **Usage**:
  - Authentication context caching (5 min TTL)
  - Catalog caching (5 min TTL)
  - Quota counters
  - SSE pub-sub channels (`kiosk:vton:{session_id}`)

### S3
- **Role**: Object storage
- **Buckets**:
  - User images: `user_image/{user_id}/...`
  - Product images: `kiosk/{client_id}/...` or `fashionx-storage/...`
  - VTON masks: `vton_mask/...`
  - VTON results: `vton_output/...`

---

## Data Flow Summary

### Image Upload → Mask Generation & Measurements
```
Frontend (preprocesses) → Backend (S3 upload) → Kafka ("user-image-updated")
├─ Mask Service (generates masks) → Updates flux_masks/qwen_masks table
└─ Measurement Service (processes measurements) → Updates measurements table

Measurement Retrieval:
Frontend (polls) → GET /api/kiosk/sessions/{session_id}/measurements
→ Backend (queries measurements table) → Normalizes by height → Returns measurements
```

### VTON Request → Results
```
Backend (check masks) → CPU Bridge (HTTP call) → Kafka ("vton-completion")
→ Kafka Consumer (processes event) → Redis pub-sub → SSE Stream → Frontend
```

### Catalog Retrieval
```
Backend (check Redis cache) → [Cache Hit] Return cached result
→ [Cache Miss] Query PostgreSQL → Generate presigned URLs → Cache result → Return
```

---

## Performance Optimizations

1. **Redis Caching**:
   - Kiosk auth context: 5 min TTL (< 0.1ms cache hit)
   - Catalog results: 5 min TTL (< 0.1ms cache hit)

2. **Database Indexes**:
   - Partial indexes on `location_products` (only active products)
   - Composite indexes for common query patterns
   - Index on `product_images(vton_image)` for VTON image queries

3. **Image Delivery**:
   - Base64-encoded images in SSE (eliminates HTTP requests)
   - Presigned S3 URLs for catalog (7-day expiry)

4. **Asynchronous Processing**:
   - Mask generation (non-blocking, via Kafka)
   - VTON processing (non-blocking, via CPU Bridge)

---

## Security Features

1. **Authentication**:
   - Client credentials validation (X-Client-ID, X-Client-Secret)
   - Kiosk assignment verification
   - JWT token validation

2. **Authorization**:
   - Session ownership verification
   - Kiosk-to-session association checks

3. **Session Management**:
   - 30-minute session expiration
   - Atomic session updates (prevents race conditions)
   - Optimistic locking (prevents concurrent modifications)

4. **Quota Enforcement**:
   - Daily/monthly VTON quota limits
   - Redis-based quota counters

---

## Error Handling

All endpoints include:
- Input validation
- Proper HTTP status codes (400, 401, 403, 404, 429, 500)
- Detailed error messages
- Logging for debugging
- Graceful error recovery

**Common Error Scenarios**:
- `401`: Invalid credentials
- `403`: Kiosk not assigned / Session ownership mismatch
- `404`: Session/Kiosk not found
- `429`: Quota exceeded
- `400`: Invalid input / Session expired
- `500`: Internal server error

---

## End of Documentation

This completes the comprehensive documentation of all kiosk device endpoints, their functions, data flow, and microservice interactions.

