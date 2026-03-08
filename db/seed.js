const { getDb, initializeDb } = require('./schema');

initializeDb();
const db = getDb();

// Insert document types common in regulatory affairs
const docTypes = [
  ['Certificate of Analysis (CoA)', 'Lab analysis certificate confirming product specifications'],
  ['Safety Data Sheet (SDS/MSDS)', 'Material safety data sheet with hazard and handling info'],
  ['Certificate of Free Sale (CFS)', 'Confirms product is freely sold in country of origin'],
  ['Good Manufacturing Practice (GMP)', 'GMP compliance certificate for manufacturing facility'],
  ['Product Information File (PIF)', 'Complete product information dossier'],
  ['Stability Study Report', 'Product stability testing results and shelf life data'],
  ['Toxicological Risk Assessment', 'Safety assessment of product ingredients'],
  ['Ingredient List (INCI)', 'International Nomenclature of Cosmetic Ingredients listing'],
  ['Labeling Artwork', 'Approved product label artwork and translations'],
  ['Halal Certificate', 'Halal compliance certification for GCC markets'],
  ['Dermatological Test Report', 'Dermatological and clinical testing results'],
  ['Notification/Registration Receipt', 'Proof of product notification with authorities'],
];

const insertDocType = db.prepare('INSERT OR IGNORE INTO document_types (name, description) VALUES (?, ?)');
for (const [name, desc] of docTypes) {
  insertDocType.run(name, desc);
}

// Insert sample products across L'Oreal brands
const products = [
  ['L\'Oréal Paris Revitalift Laser X3 Day Cream', 'L\'Oréal Paris', 'LP-RVL-X3-DC-001', '3600523456789', 'Skincare', 'Anti-aging day cream with Pro-Xylane and Hyaluronic Acid'],
  ['L\'Oréal Paris Elvive Total Repair 5 Shampoo', 'L\'Oréal Paris', 'LP-ELV-TR5-SH-002', '3600523456790', 'Haircare', 'Repairing shampoo for damaged hair'],
  ['L\'Oréal Paris True Match Foundation', 'L\'Oréal Paris', 'LP-TRM-FD-003', '3600523456791', 'Makeup', 'Liquid foundation with seamless skin-matching technology'],
  ['Garnier SkinActive Micellar Water', 'Garnier', 'GR-SKA-MW-004', '3600542012345', 'Skincare', 'All-in-1 micellar cleansing water for sensitive skin'],
  ['Garnier Fructis Sleek & Shine Shampoo', 'Garnier', 'GR-FRC-SS-005', '3600542012346', 'Haircare', 'Anti-frizz shampoo with Argan Oil'],
  ['Maybelline Fit Me Matte Foundation', 'Maybelline New York', 'MB-FTM-MT-006', '3600531012345', 'Makeup', 'Matte + poreless liquid foundation'],
  ['Maybelline Lash Sensational Mascara', 'Maybelline New York', 'MB-LSH-SN-007', '3600531012346', 'Makeup', 'Full fan effect volumizing mascara'],
  ['NYX Professional Makeup Setting Spray', 'NYX Professional Makeup', 'NYX-SET-SP-008', '3600550012345', 'Makeup', 'Matte finish long-lasting makeup setting spray'],
  ['La Roche-Posay Effaclar Duo+', 'La Roche-Posay', 'LRP-EFF-DU-009', '3337875598071', 'Skincare', 'Anti-blemish corrective care for oily skin'],
  ['Vichy Mineral 89 Booster', 'Vichy', 'VCH-M89-BS-010', '3337875609418', 'Skincare', 'Hyaluronic acid daily booster with Vichy volcanic water'],
  ['Kérastase Nutritive Bain Satin', 'Kérastase', 'KR-NTR-BS-011', '3474636382477', 'Haircare', 'Nourishing shampoo for dry hair'],
  ['CeraVe Moisturizing Cream', 'CeraVe', 'CV-MST-CR-012', '3337875597395', 'Skincare', 'Daily moisturizing cream with ceramides'],
];

const insertProduct = db.prepare(
  'INSERT OR IGNORE INTO products (name, brand, formula_code, barcode, category, description) VALUES (?, ?, ?, ?, ?, ?)'
);

for (const p of products) {
  insertProduct.run(...p);
}

console.log('Database seeded successfully!');
console.log(`- ${docTypes.length} document types`);
console.log(`- ${products.length} sample products`);

db.close();
