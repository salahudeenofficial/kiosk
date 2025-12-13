# Fashion Kiosk App - Project Summary

## 🎯 **Project Overview**

A **Virtual Try-On Fashion Kiosk** application designed for retail environments. Users can capture their photo, browse fashion products, and see themselves wearing items virtually using AI-powered try-on technology.

---

## 🛠️ **Tech Stack**

### **Frontend Framework**
- **React 19.2.0** with TypeScript
- **Vite 7.2.4** (build tool & dev server)
- **React Router DOM 7.10.1** (routing)

### **State Management**
- **Zustand 5.0.9** (lightweight state management)

### **UI & Styling**
- **Tailwind CSS 3.4.13** (utility-first CSS)
- **Framer Motion 12.23.25** (animations)
- **Swiper 12.0.3** (carousel/slider)

### **Camera & Vision**
- **@mediapipe/tasks-vision 0.10.22** (pose detection & validation)

### **Other Libraries**
- **Dexie 4.2.1** (IndexedDB wrapper - for offline storage)
- **clsx 2.1.1** (conditional class names)

---

## 📁 **Project Structure**

```
src/
├── components/          # Reusable UI components
│   ├── Camera/         # Camera-related components
│   │   ├── AutoCamera.tsx      # Main camera component with auto-capture
│   │   ├── CaptureOverlay.tsx # Overlay UI for camera
│   │   └── PoseValidator.ts   # Pose stability detection logic
│   ├── UI/             # Base UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── LoadingPulse.tsx
│   │   └── MotionFade.tsx
│   ├── FiltersDrawer.tsx      # Product filters sidebar
│   ├── PaginationLoader.tsx   # Infinite scroll loader
│   ├── ProductCard.tsx        # Product display card
│   ├── SearchBar.tsx          # Product search input
│   └── SortDropdown.tsx       # Sort options dropdown
│
├── hooks/              # Custom React hooks
│   ├── useAutoNavigate.ts     # Auto-navigation logic
│   └── useSessionTimeout.ts    # Session timeout handling
│
├── pages/               # Page components (screens)
│   ├── IdleScreen.tsx         # Initial screen - user details form
│   ├── CaptureScreen.tsx      # Camera capture screen
│   ├── ValidationScreen.tsx  # Image validation screen
│   ├── ProductList.tsx        # Product browsing grid
│   ├── ProductDetail.tsx     # Individual product details
│   ├── TryOnScreen.tsx        # Virtual try-on processing
│   ├── ReviewScreen.tsx       # Try-on result review
│   ├── PurchaseScreen.tsx     # Purchase/cart screen
│   └── SessionEnd.tsx         # Session completion screen
│
├── store/               # State management
│   └── kioskStore.ts          # Zustand store (global state)
│
├── utils/               # Utility functions
│   ├── api.ts                 # Main API client
│   ├── config.ts              # App configuration & constants
│   ├── imageUtils.ts          # Image processing utilities
│   ├── mockApi.ts             # Mock API (fallback/development)
│   ├── productApi.ts          # Product-specific API calls
│   └── validators.ts          # Validation utilities
│
├── App.tsx             # Main app layout component
├── router.tsx          # Route configuration
└── main.tsx            # App entry point
```

---

## 🔄 **User Flow & Screens**

### **1. IdleScreen (`/`)** - Entry Point
- **Purpose**: Collect user information before starting session
- **Features**:
  - Gender selection (Male/Female)
  - Height input (cm)
  - User account creation (auto-generated)
  - Fullscreen button (top-right)
- **Actions**: Creates user account → Navigates to Capture

### **2. CaptureScreen (`/capture`)**
- **Purpose**: Capture user photo with pose validation
- **Features**:
  - Auto-camera with front-facing camera
  - Pose stability detection (1.5s stable pose required)
  - 5-second countdown before capture starts
  - Auto-capture when pose is stable
  - 3:4 portrait aspect ratio
  - Minimum zoom (wide-angle view)
- **Tech**: MediaPipe for pose detection, PoseValidator for stability

### **3. ValidationScreen (`/validate`)**
- **Purpose**: Validate captured image quality
- **Features**: Image validation before proceeding

### **4. ProductList (`/products`)**
- **Purpose**: Browse and search fashion products
- **Features**:
  - Infinite scroll pagination (20 items per page)
  - Search functionality
  - Filters: Gender, Category, Brand, Price range
  - Sort options: Newest, Price (asc/desc), etc.
  - Product grid (responsive: 3-6 columns)
  - "Try On" button on each product
  - Product detail navigation
- **API**: `/api/products/list` with pagination

### **5. ProductDetail (`/product/:id`)**
- **Purpose**: View detailed product information
- **Features**: Product images, details, sizes, attributes

### **6. TryOnScreen (`/tryon`)**
- **Purpose**: Process virtual try-on
- **Features**:
  - Progress bar animation
  - Calls VTON API with user image + product
  - ~2-3 second processing time
- **API**: `/api/vton` (POST with product_id and user_image)

### **7. ReviewScreen (`/review`)**
- **Purpose**: Review try-on result
- **Features**: Display generated try-on image

### **8. PurchaseScreen (`/purchase`)**
- **Purpose**: Cart and checkout
- **Features**: Shopping cart management

### **9. SessionEnd (`/session-end`)**
- **Purpose**: End of session screen
- **Features**: Session completion, reset

---

## 🗄️ **State Management (Zustand Store)**

### **Store Structure** (`kioskStore.ts`)

```typescript
{
  // User Data
  userImage: string | null          // Captured user photo (base64)
  userGender: 'male' | 'female' | null
  userHeight: string | null
  
  // Product Data
  products: Product[]               // List of products
  selectedProduct: Product | null   // Currently selected product
  cart: Product[]                   // Shopping cart
  
  // Try-On
  validated: boolean                 // Image validation status
  vtonResult: string | null         // Try-on result URL
  
  // Session
  sessionStartedAt: number          // Timestamp
}
```

### **Key Actions**:
- `setUserImage()` - Store captured photo
- `setUserGender()` / `setUserHeight()` - User details
- `setProducts()` - Load product list
- `setSelectedProduct()` - Select product for try-on
- `setVtonResult()` - Store try-on result
- `addToCart()` / `removeFromCart()` - Cart management
- `resetAll()` - Reset entire session

---

## 🌐 **API Integration**

### **Backend Configuration**
- **Base URL**: `http://192.168.86.3:8000` (configurable via `VITE_API_BASE_URL`)
- **Timeout**: 30 seconds

### **API Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/signup` | POST | Create user account |
| `/api/users/details` | POST | Update user details (gender, height) |
| `/api/validate-image` | POST | Validate captured image |
| `/api/products/list` | GET | Get paginated product list |
| `/api/products/details` | GET | Get product details |
| `/api/vton` | POST | Generate virtual try-on |

### **API Response Format**
```typescript
{
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
  }
}
```

---

## 🎨 **Key Features**

### **1. Auto-Capture Camera**
- Front-facing camera access
- Pose stability validation (MediaPipe)
- Auto-capture when user holds pose for 1.5 seconds
- Minimum zoom for wide-angle view
- 3:4 portrait aspect ratio

### **2. Product Browsing**
- Infinite scroll pagination
- Real-time search
- Advanced filtering (gender, category, brand, price)
- Multiple sort options
- Responsive grid layout

### **3. Virtual Try-On**
- AI-powered try-on generation
- Progress tracking
- Result display and review

### **4. Session Management**
- Auto-navigation between screens
- Session timeout handling
- State persistence during session

### **5. Responsive Design**
- Mobile-first approach
- Tailwind CSS responsive utilities
- Touch-friendly UI for kiosk devices

---

## 🔧 **Configuration Files**

### **`vite.config.ts`**
- Server configuration for ngrok support
- Port: 5173 (strict)
- Host: true (allows external access)
- Allowed hosts: ngrok domains

### **`tailwind.config.js`**
- Custom color scheme
- Responsive breakpoints
- Custom utilities for kiosk displays

### **`.env` (optional)**
- `VITE_API_BASE_URL` - Override backend URL
- `VITE_KIOSK_ID` - Kiosk identifier
- `VITE_KIOSK_PASSWORD` - Kiosk password

---

## 🚀 **Development Commands**

```bash
npm run dev      # Start development server (port 5173)
npm run build    # Build for production
npm run lint     # Run ESLint
npm run preview  # Preview production build
```

---

## 📝 **Important Notes**

1. **Camera Requirements**: 
   - Requires browser camera permissions
   - Works best on devices with front-facing cameras
   - MediaPipe used for pose detection

2. **Backend Dependency**: 
   - App requires backend API at `http://192.168.86.3:8000`
   - Falls back to mock API if backend unavailable

3. **Session Flow**:
   - Must complete IdleScreen before accessing other screens
   - App resets to IdleScreen on page reload if no gender set

4. **State Persistence**:
   - State stored in Zustand (in-memory)
   - Lost on page refresh (intentional for kiosk use)

5. **Fullscreen Support**:
   - Fullscreen button on IdleScreen
   - Designed for kiosk displays

---

## 🔍 **Key Components Explained**

### **AutoCamera**
- Manages camera stream
- Integrates MediaPipe for pose detection
- Auto-captures when pose is stable
- Handles camera constraints (zoom, aspect ratio)

### **PoseValidator**
- Tracks pose stability over time
- Returns progress percentage
- Triggers capture when stable for 1.5s

### **ProductList**
- Handles infinite scroll
- Manages pagination state
- Filters and search functionality
- Optimized for large product catalogs

### **useAutoNavigate**
- Custom hook for automatic navigation
- Prevents manual navigation during processing
- Manages session flow

---

## 🐛 **Common Issues & Solutions**

1. **Camera not working**: Check browser permissions
2. **API errors**: Verify backend is running at configured URL
3. **Port conflicts**: Change port in `vite.config.ts` or kill existing process
4. **ngrok blocked**: Ensure `allowedHosts` includes ngrok domain

---

## 📚 **Next Steps for New Developers**

1. **Start with**: `IdleScreen.tsx` → `CaptureScreen.tsx` → `ProductList.tsx`
2. **Understand**: State flow through `kioskStore.ts`
3. **Check**: API calls in `utils/api.ts` and `utils/productApi.ts`
4. **Review**: Component structure in `components/` directory
5. **Test**: Each screen individually before full flow

---

## 🎯 **Project Purpose**

This is a **retail kiosk application** for fashion stores where customers can:
1. Enter their details
2. Take a photo
3. Browse products
4. See themselves wearing items virtually
5. Make purchase decisions

Designed for **touch-screen kiosks** in retail environments with fullscreen support and auto-navigation.

