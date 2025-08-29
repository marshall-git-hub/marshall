const admin = require('firebase-admin');
const serviceAccount = require('/Users/jakubmaruska/Desktop/marshall/pneu-ee1d6-firebase-adminsdk-fbsvc-f62377233a.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteTireHistory(vehicleId) {
  const snapshot = await db.collection('tire_history').where('vehicleId', '==', vehicleId).get();
  if (snapshot.empty) {
    console.log('No items found.');
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`Deleted ${snapshot.size} items.`);
}

deleteTireHistory('AA732GJ');
