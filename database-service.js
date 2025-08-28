// DatabaseService and AuthService global definitions for all pages
// Requires firebase-config.js to be loaded first

window.DatabaseService = {
  // Tires
  async getTires() {
    const snapshot = await window.db.collection('tires').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  onTiresUpdate(callback) {
    window.db.collection('tires').onSnapshot(snapshot => {
      const tires = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(tires);
    });
  },
  async updateTire(id, data) {
    await window.db.collection('tires').doc(id).update(data);
  },

  // Trucks
  async getTrucks() {
    const snapshot = await window.db.collection('trucks').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  onTrucksUpdate(callback) {
    window.db.collection('trucks').onSnapshot(snapshot => {
      const trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(trucks);
    });
  },

  // Trailers
  async getTrailers() {
    const snapshot = await window.db.collection('trailers').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  onTrailersUpdate(callback) {
    window.db.collection('trailers').onSnapshot(snapshot => {
      const trailers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(trailers);
    });
  },

  // Vehicle KMs
  async getAllVehicleKms() {
  const snapshot = await window.db.collection('vehicles_km').get();
  // Return as object for fast lookup
  const kms = {};
  snapshot.docs.forEach(doc => { kms[doc.id] = doc.data().kilometers; });
  return kms;
  },
  onAllVehicleKmsUpdate(callback) {
    window.db.collection('vehicles_km').onSnapshot(snapshot => {
      const kms = {};
      snapshot.docs.forEach(doc => { kms[doc.id] = doc.data().kilometers; });
      callback(kms);
    });
  },
  async getVehicleKm(vehicleId) {
  const doc = await window.db.collection('vehicles_km').doc(vehicleId).get();
  return doc.exists ? doc.data().kilometers : null;
  },
  onVehicleKmUpdate(vehicleId, callback) {
    window.db.collection('vehicles_km').doc(vehicleId).onSnapshot(doc => {
      const data = doc.data();
      callback(data ? data.kilometers : null);
    });
  },

  // Tire Slots
  async getAllTireSlots(type) {
    const snapshot = await window.db.collection(type + '_slots').get();
    // Return as object for fast lookup
    const slots = {};
    snapshot.docs.forEach(doc => { slots[doc.id] = doc.data().slots; });
    return slots;
  },
  async getTireSlots(type, id) {
    const doc = await window.db.collection(type + '_slots').doc(id).get();
    return doc.exists ? doc.data().slots : null;
  },
  onTireSlotsUpdate(type, id, callback) {
    window.db.collection(type + '_slots').doc(id).onSnapshot(doc => {
      callback(doc.data());
    });
  },
  async updateTireSlots(type, id, slots) {
    await window.db.collection(type + '_slots').doc(id).set({ slots });
  },

  // Add methods for history page as needed
  async getTireChangeHistory(vehicleId) {
    const snapshot = await window.db.collection('tire_history').where('vehicleId', '==', vehicleId).get();
    return snapshot.docs.map(doc => doc.data());
  },
  async addTruck(data) {
    await window.db.collection('trucks').add(data);
  },
  async addTrailer(data) {
    await window.db.collection('trailers').add(data);
  }
};

window.AuthService = {
  login(email, password) {
    return window.auth.signInWithEmailAndPassword(email, password);
  },
  logout() {
    return window.auth.signOut();
  },
  onAuthStateChanged(callback) {
    return window.auth.onAuthStateChanged(callback);
  },
  getCurrentUser() {
    return window.auth.currentUser;
  }
};
