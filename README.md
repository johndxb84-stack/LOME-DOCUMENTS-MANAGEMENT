# LOME - Regulatory Documents Management System

**L'Oréal Middle East** - Centralized regulatory & scientific document management for GCC & Levant product registrations.

## Purpose

This system allows the Regulatory Affairs team to upload and manage all required scientific and regulatory documents for each product in the L'Oréal catalogue. Distributors can then search by **product formula code** or **barcode** to find and download the documents they need to submit to local authorities.

## Features

### Admin Portal
- Add and manage products (name, brand, formula code, barcode, category)
- Upload regulatory documents per product (CoA, SDS, GMP, PIF, Halal certificates, etc.)
- Track document versions, expiry dates, and regional scope
- Delete outdated documents

### Distributor Portal
- Search products by formula code, barcode, or name
- Filter by brand and category
- View all available documents for a product
- Download documents for authority submissions
- Download activity is logged for audit

## Supported Document Types

| Document | Description |
|----------|-------------|
| Certificate of Analysis (CoA) | Lab analysis confirming product specifications |
| Safety Data Sheet (SDS/MSDS) | Hazard and handling information |
| Certificate of Free Sale (CFS) | Confirms product is freely sold in country of origin |
| GMP Certificate | Manufacturing compliance certificate |
| Product Information File (PIF) | Complete product information dossier |
| Stability Study Report | Shelf life and stability data |
| Toxicological Risk Assessment | Ingredient safety assessment |
| INCI Ingredient List | International cosmetic ingredient listing |
| Labeling Artwork | Approved label artwork and translations |
| Halal Certificate | Halal compliance for GCC markets |
| Dermatological Test Report | Clinical testing results |
| Notification/Registration Receipt | Proof of notification with authorities |

## Quick Start

```bash
# Install dependencies
npm install

# Seed database with sample products
npm run seed

# Start the server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack (Prototype)

| Layer | Technology | Azure Equivalent |
|-------|-----------|-----------------|
| Frontend | HTML/CSS/JavaScript | Azure Static Web Apps |
| Backend | Node.js + Express | Azure App Service |
| Database | SQLite | Azure SQL Database or Cosmos DB |
| File Storage | Local disk | Azure Blob Storage |

## Azure Deployment

This prototype is ready for Azure App Service deployment:

1. Create an Azure App Service (Node.js 20 LTS)
2. Set up Azure SQL Database (replace SQLite)
3. Set up Azure Blob Storage (replace local uploads)
4. Deploy via Azure CLI or GitHub Actions

```bash
# Deploy with Azure CLI
az webapp up --name lome-docs-management --resource-group your-rg --runtime "NODE:20-lts"
```

## Project Structure

```
├── server.js              # Express API server
├── db/
│   ├── schema.js          # Database schema and connection
│   └── seed.js            # Sample data seeder
├── public/
│   ├── index.html          # Single-page application
│   ├── css/styles.css      # Styling (L'Oréal branding)
│   └── js/app.js           # Frontend logic
├── uploads/                # Document file storage
├── web.config              # Azure/IIS configuration
└── package.json
```

## GCC & Levant Markets Covered

UAE, Saudi Arabia, Kuwait, Qatar, Bahrain, Oman, Jordan, Lebanon, Iraq

---

*Prototype v1.0 - Regulatory Affairs Department*
