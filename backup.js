/* Firestore backup script: exports all top-level collections to backups/YYYY-MM-DD/*.json */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Uses GOOGLE_APPLICATION_CREDENTIALS provided by the workflow
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function backupFirestore() {
  const datePart = new Date().toISOString().split('T')[0];
  const backupDir = path.join('backups', datePart);
  fs.mkdirSync(backupDir, { recursive: true });

  const collections = await db.listCollections();

  for (const col of collections) {
    const snapshot = await col.get();
    const data = {};
    snapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });

    const filePath = path.join(backupDir, `${col.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Exported ${col.id} -> ${filePath}`);
  }
}

backupFirestore()
  .then(() => {
    console.log('Backup complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });