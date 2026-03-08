# LOME Documents Management System

Regulatory Documents Management Portal for L'Oreal Middle East — a web application that enables the regulatory affairs team to manage scientific and regulatory documents for product registration across the GCC and Levant region.

## Overview

**Admin users** (L'Oreal Regulatory Team) can:
- Add products to the catalogue with formula numbers, barcodes, brand, division details
- Upload regulatory documents (CPSR, COA, MSDS, GMP, Halal certificates, etc.)
- Manage distributor accounts per country
- Track document downloads and monitor activity
- Get alerts on expiring documents

**Distributor users** can:
- Search products by name, formula number, or barcode
- Filter by brand, division, or category
- View and download all available regulatory documents for a product
- Access documents needed for local authority registration submissions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | Azure SQL Database |
| File Storage | Azure Blob Storage |
| Hosting (API) | Azure App Service |
| Hosting (Frontend) | Azure Static Web Apps |
| Auth | JWT (JSON Web Tokens) |
| CI/CD | GitHub Actions |

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/         # Database and storage config
│   │   ├── middleware/      # Auth and file upload middleware
│   │   ├── routes/          # API route handlers
│   │   └── server.js        # Express app entry point
│   └── migrations/          # SQL schema and seed scripts
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/      # Reusable React components
│       ├── context/         # Auth context provider
│       ├── pages/           # Page components
│       ├── services/        # API client
│       └── styles/          # CSS styles
├── infrastructure/
│   └── azure-deploy.json    # ARM template for Azure resources
└── .github/workflows/
    └── deploy.yml           # CI/CD pipeline
```

## Supported Document Types

| Code | Document |
|------|----------|
| CPSR | Cosmetic Product Safety Report |
| COA | Certificate of Analysis |
| MSDS | Material Safety Data Sheet |
| CFS | Certificate of Free Sale |
| GMP | GMP Certificate |
| INGREDIENT_LIST | Full Ingredient List (INCI) |
| PRODUCT_SPECIFICATION | Product Specification Sheet |
| STABILITY_DATA | Stability Study Data |
| MICRO_TEST | Microbiological Test Report |
| HEAVY_METALS | Heavy Metals Test Report |
| ALLERGEN_DECLARATION | Allergen Declaration |
| LABEL_ARTWORK | Product Label / Artwork |
| REGISTRATION_CERT | Registration Certificate |
| HALAL_CERT | Halal Certificate |
| AUTHORIZATION_LETTER | Authorization Letter |
| PRODUCT_IMAGE | Product Image |

## Setup Instructions

### Prerequisites

- Node.js 18+
- Azure Subscription
- Azure CLI installed

### 1. Deploy Azure Resources

```bash
# Login to Azure
az login

# Create a resource group
az group create --name lome-documents-rg --location uaenorth

# Deploy infrastructure
az deployment group create \
  --resource-group lome-documents-rg \
  --template-file infrastructure/azure-deploy.json \
  --parameters sqlAdminLogin=lomeadmin sqlAdminPassword=<YOUR_PASSWORD> jwtSecret=<YOUR_JWT_SECRET_32_CHARS>
```

### 2. Create Blob Storage Container

```bash
az storage container create \
  --name regulatory-documents \
  --account-name lomedocumentsstorage \
  --public-access off
```

### 3. Run Database Migration

```bash
cd backend
cp .env.example .env
# Edit .env with your Azure SQL connection details
npm install
npm run migrate
npm run seed
```

### 4. Start Backend (Development)

```bash
cd backend
npm run dev
```

### 5. Start Frontend (Development)

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your API URL
npm install
npm start
```

### 6. Default Admin Account

After running the seed script, log in with:
- **Email**: admin@loreal-lome.com
- **Password**: Admin@2024!

**Important**: Change this password immediately after first login.

## API Endpoints

### Authentication
- `POST /api/auth/login` — Login
- `POST /api/auth/register` — Register user (admin only)
- `GET /api/auth/users` — List all users (admin only)
- `PATCH /api/auth/users/:id/status` — Activate/deactivate user (admin only)
- `GET /api/auth/me` — Get current user profile

### Products
- `GET /api/products` — Search products (query params: search, brand, division, category, page, limit)
- `GET /api/products/filters` — Get available filter options
- `GET /api/products/:id` — Get product details with documents
- `POST /api/products` — Create product (admin only)
- `PUT /api/products/:id` — Update product (admin only)
- `DELETE /api/products/:id` — Delete product (admin only)

### Documents
- `POST /api/documents/upload` — Upload document (admin only, multipart)
- `GET /api/documents/download/:id` — Download a document
- `DELETE /api/documents/:id` — Delete document (admin only)
- `GET /api/documents/types` — List valid document types
- `GET /api/documents/expiring` — Documents expiring soon (admin only)

### Activity & Dashboard
- `GET /api/activity` — Activity log (admin only)
- `GET /api/activity/stats` — Dashboard statistics (admin only)

## Covered Markets

GCC: UAE, Saudi Arabia, Kuwait, Bahrain, Qatar, Oman
Levant: Jordan, Lebanon, Iraq

## Production Deployment

1. Set up GitHub Secrets in your repository:
   - `AZURE_WEBAPP_PUBLISH_PROFILE` — From Azure App Service
   - `AZURE_STATIC_WEB_APPS_API_TOKEN` — From Azure Static Web Apps
   - `API_URL` — Your deployed API URL

2. Push to the `main` branch — the GitHub Actions workflow will automatically build and deploy both frontend and backend.
