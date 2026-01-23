# Kiosk Frontend Integration Guide

## Overview

This document provides a comprehensive guide for integrating the kiosk frontend application with the FashionX backend API. The kiosk is a standalone TV-like device placed in retail stores that allows customers to try on virtual garments.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication & Configuration](#authentication--configuration)
3. [User Flow Implementation](#user-flow-implementation)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Server-Sent Events (SSE) Integration](#server-sent-events-sse-integration)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)
8. [Testing Guide](#testing-guide)

---

## Architecture Overview

### Flow Diagram

```
┌─────────────┐
│ Config Screen│ → Store owner enters credentials
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Idle Screen │ → Waiting for user touch
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Create Session│ → POST /api/kiosk/sessions
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Profile Screen│ → User enters age/height
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Camera Screen│ → User captures photo
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Catalog Screen│ → Display products
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ VTON Request │ → POST /api/kiosk/sessions/{id}/vton
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ SSE Stream   │ → GET /api/kiosk/sessions/{id}/stream
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Results Screen│ → Display VTON results
└─────────────┘
```

---

## Authentication & Configuration

### Step 1: Kiosk Configuration

**When**: First time setup or when credentials change

**Endpoint**: `POST /api/kiosk/auth/configure`

**Headers:**
```javascript
{
  'X-Client-ID': 'your-client-id',
  'X-Client-Secret': 'your-client-secret',
  'X-Kiosk-ID': 'KSK-1234'
}
```

**Implementation:**
```javascript
async function configureKiosk(clientId, clientSecret, kioskId) {
  try {
    const response = await fetch('/api/kiosk/auth/configure', {
      method: 'POST',
      headers: {
        'X-Client-ID': clientId,
        'X-Client-Secret': clientSecret,
        'X-Kiosk-ID': kioskId,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store configuration locally
      localStorage.setItem('kiosk_config', JSON.stringify({
        clientId,
        clientSecret,
        kioskId,
        locationId: data.data.location_id,
        locationName: data.data.location_name
      }));
      
      // Navigate to idle screen
      navigateToIdleScreen();
    } else {
      showError('Configuration failed: ' + data.error?.message);
    }
  } catch (error) {
    showError('Network error: ' + error.message);
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "kiosk_id": "KSK-1234",
    "client_id": 5,
    "client_name": "Fashion Store NYC",
    "location_id": 10,
    "location_name": "NY Flagship Store",
    "status": "online",
    "config": {
      "session_timeout_minutes": 30,
      "max_garments_per_session": 10
    }
  }
}
```

---

## User Flow Implementation

### Step 2: Create Session (On User Touch)

**When**: User touches the screen on idle screen

**Endpoint**: `POST /api/kiosk/sessions`

**Implementation:**
```javascript
async function createSession() {
  const config = JSON.parse(localStorage.getItem('kiosk_config'));
  
  try {
    const response = await fetch('/api/kiosk/sessions', {
      method: 'POST',
      headers: {
        'X-Client-ID': config.clientId,
        'X-Client-Secret': config.clientSecret,
        'X-Kiosk-ID': config.kioskId,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store session info including JWT token
      sessionStorage.setItem('current_session', JSON.stringify({
        sessionId: data.data.session_id,
        userId: data.data.user_id,
        expiresAt: data.data.expires_at,
        token: data.data.token  // JWT token for subsequent requests
      }));
      
      // Note: kiosk_refresh_token cookie is automatically set by server
      // No need to manually handle it
      
      // Navigate to profile screen
      navigateToProfileScreen();
    }
  } catch (error) {
    showError('Failed to create session: ' + error.message);
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123...",
    "user_id": 456,
    "expires_at": "2024-01-15T10:30:00Z",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." // JWT access token
  }
}
```

**Important**: 
- The response includes a JWT `token` that should be used for all subsequent requests
- A `kiosk_refresh_token` cookie is automatically set (HTTP-only, 30 min expiration)
- Store the `token` and include it in the `Authorization: Bearer {token}` header for all subsequent requests
- The token expires in 30 minutes (matches session expiration)

---

### Step 3: Update Profile

**When**: User enters age and height on profile screen

**Endpoint**: `PATCH /api/kiosk/sessions/{session_id}`

**Implementation:**
```javascript
async function updateProfile(age, height) {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  try {
    const response = await fetch(`/api/kiosk/sessions/${session.sessionId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${session.token}`,  // Use JWT token
        'Content-Type': 'application/json'
      },
      credentials: 'include',  // Include cookies (refresh token)
      body: JSON.stringify({
        age: parseInt(age),
        height: parseFloat(height)
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Navigate to camera screen
      navigateToCameraScreen();
    }
  } catch (error) {
    showError('Failed to update profile: ' + error.message);
  }
}
```

---

### Step 4: Upload Image

**When**: User captures photo and presses continue

**Endpoint**: `POST /api/kiosk/sessions/{session_id}/image`

**Implementation:**
```javascript
async function uploadImage(imageFile) {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  // Validate file
  if (!imageFile || !imageFile.type.startsWith('image/')) {
    showError('Please select a valid image file');
    return;
  }
  
  // Show loading indicator
  showLoading('Uploading image...');
  
  try {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch(`/api/kiosk/sessions/${session.sessionId}/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,  // Use JWT token
        // Don't set Content-Type, browser will set it with boundary
      },
      credentials: 'include',  // Include cookies
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Update session state
      session.currentStep = data.data.current_step;
      sessionStorage.setItem('current_session', JSON.stringify(session));
      
      // Navigate to catalog screen
      navigateToCatalogScreen();
    } else {
      showError('Upload failed: ' + data.error?.message);
    }
  } catch (error) {
    showError('Network error: ' + error.message);
  } finally {
    hideLoading();
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123...",
    "user_id": 456,
    "image_url": "s3://bucket/path/to/image.jpg",
    "status": "processing",
    "current_step": "catalog"
  }
}
```

---

### Step 5: Load Catalog

**When**: User lands on catalog screen

**Endpoint**: `GET /api/kiosk/catalog`

**Implementation:**
```javascript
async function loadCatalog(filters = {}) {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  // Build query parameters
  const params = new URLSearchParams({
    limit: filters.limit || 50,
    offset: filters.offset || 0
  });
  
  if (filters.categoryId) params.append('category_id', filters.categoryId);
  if (filters.gender) params.append('gender', filters.gender);
  if (filters.search) params.append('search', filters.search);
  
  try {
    const response = await fetch(`/api/kiosk/catalog?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,  // Use JWT token
      },
      credentials: 'include'  // Include cookies
    });
    
    const data = await response.json();
    
    if (data.success) {
      return {
        products: data.data.products,
        pagination: data.data.pagination
      };
    }
  } catch (error) {
    showError('Failed to load catalog: ' + error.message);
    return null;
  }
}

// Usage
const catalog = await loadCatalog({ limit: 50 });
if (catalog) {
  displayProducts(catalog.products);
  setupPagination(catalog.pagination);
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "productId": 1001,
        "name": "Blue Denim Jeans",
        "mrp": 2999.00,
        "imageUrl": "https://...",
        "brand": {"id": 1, "name": "BrandX"},
        "category": {"id": 5, "name": "Jeans", "gender": "Men"}
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

---

### Step 6: Request VTON

**When**: User selects garments and presses "Try On"

**Endpoint**: `POST /api/kiosk/sessions/{session_id}/vton`

**Implementation:**
```javascript
async function requestVTON(garmentIds) {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  // Validate selection
  if (!garmentIds || garmentIds.length === 0) {
    showError('Please select at least one garment');
    return;
  }
  
  if (garmentIds.length > 10) {
    showError('Maximum 10 garments allowed');
    return;
  }
  
  showLoading('Processing VTON request...');
  
  try {
    const response = await fetch(`/api/kiosk/sessions/${session.sessionId}/vton`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,  // Use JWT token
        'Content-Type': 'application/json'
      },
      credentials: 'include',  // Include cookies
      body: JSON.stringify({
        garment_ids: garmentIds
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store job IDs
      session.vtonJobs = data.data.jobs;
      sessionStorage.setItem('current_session', JSON.stringify(session));
      
      // Navigate to results screen and start SSE stream
      navigateToResultsScreen();
      startSSEStream();
    } else {
      showError('VTON request failed: ' + data.error?.message);
    }
  } catch (error) {
    showError('Network error: ' + error.message);
  } finally {
    hideLoading();
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "sess_abc123...",
    "jobs": [
      {
        "job_id": "job_uuid_1",
        "garment_id": 1001,
        "status": "QUEUED"
      },
      {
        "job_id": "job_uuid_2",
        "garment_id": 1002,
        "status": "WAITING_MASK"
      }
    ],
    "current_step": "results"
  }
}
```

---

## Server-Sent Events (SSE) Integration

### Step 7: Stream VTON Results

**When**: After VTON request, on results screen

**Endpoint**: `GET /api/kiosk/sessions/{session_id}/stream`

**Implementation:**
```javascript
let eventSource = null;

function startSSEStream() {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  // Note: EventSource doesn't support custom headers, so we need to use fetch API
  // Build URL with token in query parameter (temporary solution)
  // Better: Use fetch API with streaming for production
  const url = `/api/kiosk/sessions/${session.sessionId}/stream?token=${encodeURIComponent(session.token)}`;
  
  // Alternative: Use fetch API with Authorization header (recommended for production)
  // See startSSEStreamWithFetch() below
  
  eventSource = new EventSource(url);
  
  // Connection established
  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('SSE connected:', data);
    showStatus('Connected, waiting for results...');
  });
  
  // VTON result received
  eventSource.addEventListener('vton_result', (event) => {
    const result = JSON.parse(event.data);
    console.log('VTON result:', result);
    
    // Display result
    displayVTONResult(result);
    
    // Update job status
    updateJobStatus(result.job_id, result.status, result.output_image_url);
  });
  
  // VTON error
  eventSource.addEventListener('vton_error', (event) => {
    const error = JSON.parse(event.data);
    console.error('VTON error:', error);
    
    showError(`VTON failed for garment ${error.garment_id}: ${error.error}`);
    updateJobStatus(error.job_id, error.status, null, error.error);
  });
  
  // VTON update (status change)
  eventSource.addEventListener('vton_update', (event) => {
    const update = JSON.parse(event.data);
    console.log('VTON update:', update);
    updateJobStatus(update.job_id, update.status);
  });
  
  // Error handling
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
    
    if (eventSource.readyState === EventSource.CLOSED) {
      showError('Connection closed. Attempting to reconnect...');
      // Optionally reconnect after delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          startSSEStream();
        }
      }, 3000);
    }
  };
}

function stopSSEStream() {
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

function displayVTONResult(result) {
  // Create result card
  const resultCard = document.createElement('div');
  resultCard.className = 'vton-result-card';
  resultCard.innerHTML = `
    <img src="${result.output_image_url}" alt="VTON Result" />
    <div class="result-info">
      <p>Garment ID: ${result.garment_id}</p>
      <p>Status: ${result.status}</p>
    </div>
  `;
  
  // Append to results container
  document.getElementById('results-container').appendChild(resultCard);
}

function updateJobStatus(jobId, status, imageUrl = null, error = null) {
  // Update UI to reflect job status
  const jobElement = document.querySelector(`[data-job-id="${jobId}"]`);
  if (jobElement) {
    jobElement.classList.remove('queued', 'running', 'success', 'failed');
    jobElement.classList.add(status.toLowerCase());
    
    if (imageUrl) {
      jobElement.querySelector('.result-image').src = imageUrl;
    }
    
    if (error) {
      jobElement.querySelector('.error-message').textContent = error;
    }
  }
}
```

**Alternative: Using Fetch API for SSE (Better Header Support - RECOMMENDED)**

```javascript
async function startSSEStreamWithFetch() {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  const url = `/api/kiosk/sessions/${session.sessionId}/stream`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.token}`,  // Use JWT token
        'Accept': 'text/event-stream'
      },
      credentials: 'include'  // Include cookies
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream ended');
        break;
      }
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.startsWith('event:')) {
          const eventType = line.substring(6).trim();
          // Handle event type
        } else if (line.startsWith('data:')) {
          const data = JSON.parse(line.substring(5).trim());
          // Handle data
          handleSSEEvent(eventType, data);
        }
      }
    }
  } catch (error) {
    console.error('SSE stream error:', error);
    showError('Failed to connect to results stream');
  }
}
```

---

### Step 8: Complete Session

**When**: User finishes viewing results or session times out

**Endpoint**: `POST /api/kiosk/sessions/{session_id}/complete`

**Implementation:**
```javascript
async function completeSession() {
  const session = JSON.parse(sessionStorage.getItem('current_session'));
  
  // Stop SSE stream
  stopSSEStream();
  
  try {
    const response = await fetch(`/api/kiosk/sessions/${session.sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,  // Use JWT token
        'Content-Type': 'application/json'
      },
      credentials: 'include'  // Include cookies
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Clear session
      sessionStorage.removeItem('current_session');
      
      // Navigate back to idle screen
      navigateToIdleScreen();
    }
  } catch (error) {
    console.error('Failed to complete session:', error);
    // Still navigate to idle screen even if API call fails
    navigateToIdleScreen();
  }
}
```

---

## Error Handling

### Common Error Scenarios

#### 1. Authentication Errors (401/403)

```javascript
if (response.status === 401 || response.status === 403) {
  // Credentials invalid or expired
  showError('Authentication failed. Please reconfigure kiosk.');
  navigateToConfigScreen();
}
```

#### 2. Quota Exceeded (429)

```javascript
if (response.status === 429) {
  const error = await response.json();
  showError(`Daily quota exceeded: ${error.detail}`);
  // Disable VTON button or show upgrade message
}
```

#### 3. Session Expired (400)

```javascript
if (response.status === 400) {
  const error = await response.json();
  if (error.detail?.includes('expired')) {
    showError('Session expired. Please start over.');
    navigateToIdleScreen();
  }
}
```

#### 4. Network Errors

```javascript
try {
  // API call
} catch (error) {
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    showError('Network error. Please check your connection.');
  } else {
    showError('An error occurred: ' + error.message);
  }
}
```

---

## Code Examples

### Complete React Component Example

```jsx
import React, { useState, useEffect } from 'react';

function KioskApp() {
  const [config, setConfig] = useState(null);
  const [session, setSession] = useState(null);
  const [currentStep, setCurrentStep] = useState('config');
  const [products, setProducts] = useState([]);
  const [vtonResults, setVtonResults] = useState([]);
  const [eventSource, setEventSource] = useState(null);
  
  // Configuration
  const handleConfigure = async (clientId, clientSecret, kioskId) => {
    try {
      const response = await fetch('/api/kiosk/auth/configure', {
        method: 'POST',
        headers: {
          'X-Client-ID': clientId,
          'X-Client-Secret': clientSecret,
          'X-Kiosk-ID': kioskId
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
        localStorage.setItem('kiosk_config', JSON.stringify(data.data));
        setCurrentStep('idle');
      }
    } catch (error) {
      console.error('Configuration error:', error);
    }
  };
  
  // Create session on user touch
  const handleUserTouch = async () => {
    if (!config) return;
    
    try {
      const response = await fetch('/api/kiosk/sessions', {
        method: 'POST',
        headers: {
          'X-Client-ID': config.client_id,
          'X-Client-Secret': config.client_secret,
          'X-Kiosk-ID': config.kiosk_id
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setSession(data.data);
        setCurrentStep('profile');
      }
    } catch (error) {
      console.error('Session creation error:', error);
    }
  };
  
  // Update profile
  const handleProfileSubmit = async (age, height) => {
    if (!session || !config) return;
    
    try {
      const response = await fetch(`/api/kiosk/sessions/${session.session_id}`, {
        method: 'PATCH',
        headers: {
          'X-Client-ID': config.client_id,
          'X-Client-Secret': config.client_secret,
          'X-Kiosk-ID': config.kiosk_id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ age, height })
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentStep('camera');
      }
    } catch (error) {
      console.error('Profile update error:', error);
    }
  };
  
  // Upload image
  const handleImageUpload = async (file) => {
    if (!session || !config) return;
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch(`/api/kiosk/sessions/${session.session_id}/image`, {
        method: 'POST',
        headers: {
          'X-Client-ID': config.client_id,
          'X-Client-Secret': config.client_secret,
          'X-Kiosk-ID': config.kiosk_id
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentStep('catalog');
        loadCatalog();
      }
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };
  
  // Load catalog
  const loadCatalog = async () => {
    if (!config) return;
    
    try {
      const response = await fetch('/api/kiosk/catalog?limit=50', {
        headers: {
          'X-Client-ID': config.client_id,
          'X-Client-Secret': config.client_secret,
          'X-Kiosk-ID': config.kiosk_id
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products);
      }
    } catch (error) {
      console.error('Catalog load error:', error);
    }
  };
  
  // Request VTON
  const handleVTONRequest = async (garmentIds) => {
    if (!session || !config) return;
    
    try {
      const response = await fetch(`/api/kiosk/sessions/${session.session_id}/vton`, {
        method: 'POST',
        headers: {
          'X-Client-ID': config.client_id,
          'X-Client-Secret': config.client_secret,
          'X-Kiosk-ID': config.kiosk_id,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ garment_ids: garmentIds })
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentStep('results');
        startSSEStream();
      }
    } catch (error) {
      console.error('VTON request error:', error);
    }
  };
  
  // SSE Stream
  const startSSEStream = () => {
    if (!session || !config) return;
    
    const url = `/api/kiosk/sessions/${session.session_id}/stream?X-Client-ID=${config.client_id}&X-Client-Secret=${config.client_secret}&X-Kiosk-ID=${config.kiosk_id}`;
    const es = new EventSource(url);
    
    es.addEventListener('vton_result', (event) => {
      const result = JSON.parse(event.data);
      setVtonResults(prev => [...prev, result]);
    });
    
    es.addEventListener('vton_error', (event) => {
      const error = JSON.parse(event.data);
      console.error('VTON error:', error);
    });
    
    setEventSource(es);
  };
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);
  
  // Render based on current step
  return (
    <div className="kiosk-app">
      {currentStep === 'config' && <ConfigScreen onConfigure={handleConfigure} />}
      {currentStep === 'idle' && <IdleScreen onTouch={handleUserTouch} />}
      {currentStep === 'profile' && <ProfileScreen onSubmit={handleProfileSubmit} />}
      {currentStep === 'camera' && <CameraScreen onUpload={handleImageUpload} />}
      {currentStep === 'catalog' && <CatalogScreen products={products} onSelect={handleVTONRequest} />}
      {currentStep === 'results' && <ResultsScreen results={vtonResults} />}
    </div>
  );
}

export default KioskApp;
```

---

## Testing Guide

### 1. Configuration Test

```javascript
// Test kiosk configuration
async function testConfiguration() {
  const response = await fetch('/api/kiosk/auth/configure', {
    method: 'POST',
    headers: {
      'X-Client-ID': 'test-client-id',
      'X-Client-Secret': 'test-secret',
      'X-Kiosk-ID': 'KSK-TEST-001'
    }
  });
  
  console.log('Config test:', await response.json());
}
```

### 2. Session Flow Test

```javascript
// Test complete flow
async function testCompleteFlow() {
  // 1. Configure
  const config = await configureKiosk(...);
  
  // 2. Create session
  const session = await createSession();
  
  // 3. Update profile
  await updateProfile(25, 175);
  
  // 4. Upload image (mock file)
  const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  await uploadImage(mockFile);
  
  // 5. Load catalog
  const catalog = await loadCatalog();
  
  // 6. Request VTON
  await requestVTON([1001, 1002]);
  
  // 7. Start SSE stream
  startSSEStream();
}
```

### 3. Error Handling Test

```javascript
// Test error scenarios
async function testErrors() {
  // Invalid credentials
  try {
    await configureKiosk('invalid', 'invalid', 'KSK-001');
  } catch (error) {
    console.log('Auth error handled:', error);
  }
  
  // Expired session
  // ... test session expiration
  
  // Quota exceeded
  // ... test quota limits
}
```

---

## Best Practices

### 1. Security

- **Never store credentials in plain text**: Use secure storage or environment variables
- **Validate inputs**: Always validate user inputs before sending to API
- **Handle errors gracefully**: Don't expose sensitive error messages to users

### 2. Performance

- **Cache catalog data**: Store catalog in local storage with TTL
- **Lazy load images**: Load product images as user scrolls
- **Debounce search**: Wait for user to stop typing before searching

### 3. User Experience

- **Show loading states**: Always show loading indicators for async operations
- **Handle timeouts**: Set reasonable timeouts and show appropriate messages
- **Auto-retry**: Retry failed requests with exponential backoff
- **Session management**: Handle session expiration gracefully

### 4. Code Organization

```javascript
// Recommended file structure
src/
  api/
    kiosk.js          // API client functions
    config.js         // Configuration management
  components/
    ConfigScreen.js
    IdleScreen.js
    ProfileScreen.js
    CameraScreen.js
    CatalogScreen.js
    ResultsScreen.js
  hooks/
    useKioskSession.js
    useSSEStream.js
  utils/
    errorHandler.js
    storage.js
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose | Headers Required |
|--------|----------|---------|------------------|
| POST | `/api/kiosk/auth/configure` | Kiosk configuration | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| POST | `/api/kiosk/sessions` | Create session | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| PATCH | `/api/kiosk/sessions/{id}` | Update profile | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| POST | `/api/kiosk/sessions/{id}/image` | Upload photo | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| GET | `/api/kiosk/catalog` | Get products | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| POST | `/api/kiosk/sessions/{id}/vton` | Request VTON | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| GET | `/api/kiosk/sessions/{id}/stream` | SSE results | X-Client-ID, X-Client-Secret, X-Kiosk-ID |
| POST | `/api/kiosk/sessions/{id}/complete` | Complete session | X-Client-ID, X-Client-Secret, X-Kiosk-ID |

---

## Troubleshooting

### Issue: SSE Connection Fails

**Solution**: 
- Check CORS settings
- Verify headers are being sent correctly
- Use fetch API with streaming if EventSource doesn't work

### Issue: Images Not Loading

**Solution**:
- Check S3 presigned URL expiration
- Verify image URLs in response
- Handle CORS for S3 buckets

### Issue: Session Expires Too Quickly

**Solution**:
- Check session expiration time (default: 30 minutes)
- Implement session refresh mechanism
- Handle expiration gracefully in UI

---

## Support

For issues or questions:
- Check API documentation: `/api/docs` (Swagger UI)
- Review error logs in browser console
- Contact backend team with session_id and error details

---

**End of Frontend Integration Guide**

