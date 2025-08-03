// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEV9VCbQOFA763ULbg2H9N7YPONHFo9ys",
  authDomain: "pneu-ee1d6.firebaseapp.com",
  projectId: "pneu-ee1d6",
  storageBucket: "pneu-ee1d6.firebasestorage.app",
  messagingSenderId: "703642287813",
  appId: "1:703642287813:web:e5a25fe039e09883cb7aac",
  measurementId: "G-5Z9VW7RB1F"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Database operations
const DatabaseService = {
  // Tires
  async getTires() {
    try {
      const snapshot = await db.collection('tires').get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // Firebase document ID
          customId: data.customId || data.id, // Custom ID alebo fallback na staré id
          ...data,
          status: data.status || 'available', // Default to available
        };
      });
    } catch (error) {
      console.error('Error getting tires:', error);
      return [];
    }
  },

  async addTire(tire) {
    try {
      const docRef = await db.collection('tires').add(tire);
      return { 
        id: docRef.id, // Firebase document ID
        customId: tire.customId, // Custom ID
        ...tire 
      };
    } catch (error) {
      console.error('Error adding tire:', error);
      throw error;
    }
  },

  async updateTire(tireId, updates) {
    try {
      await db.collection('tires').doc(tireId).update(updates);
    } catch (error) {
      console.error('Error updating tire:', error);
      throw error;
    }
  },

  async deleteTire(tireId) {
    try {
      await db.collection('tires').doc(tireId).delete();
    } catch (error) {
      console.error('Error deleting tire:', error);
      throw error;
    }
  },

  // Trucks
  async getTrucks() {
    try {
      const snapshot = await db.collection('trucks').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting trucks:', error);
      return [];
    }
  },

  async addTruck(truck) {
    try {
      const truckId = truck.licensePlate.replace(/\s/g, '');
      await db.collection('trucks').doc(truckId).set(truck);
      return { id: truckId, ...truck };
    } catch (error) {
      console.error('Error adding truck:', error);
      throw error;
    }
  },

  async updateTruck(truckId, updates) {
    try {
      await db.collection('trucks').doc(truckId).update(updates);
    } catch (error) {
      console.error('Error updating truck:', error);
      throw error;
    }
  },

  async deleteTruck(truckId) {
    try {
      await db.collection('trucks').doc(truckId).delete();
    } catch (error) {
      console.error('Error deleting truck:', error);
      throw error;
    }
  },

  // Trailers
  async getTrailers() {
    try {
      const snapshot = await db.collection('trailers').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting trailers:', error);
      return [];
    }
  },

  async addTrailer(trailer) {
    try {
      const trailerId = trailer.licensePlate.replace(/\s/g, '');
      await db.collection('trailers').doc(trailerId).set(trailer);
      return { id: trailerId, ...trailer };
    } catch (error) {
      console.error('Error adding trailer:', error);
      throw error;
    }
  },

  async updateTrailer(trailerId, updates) {
    try {
      await db.collection('trailers').doc(trailerId).update(updates);
    } catch (error) {
      console.error('Error updating trailer:', error);
      throw error;
    }
  },

  async deleteTrailer(trailerId) {
    try {
      await db.collection('trailers').doc(trailerId).delete();
    } catch (error) {
      console.error('Error deleting trailer:', error);
      throw error;
    }
  },

  // Tire slots for vehicles
  async getTireSlots(vehicleType, vehicleId) {
    try {
      const snapshot = await db.collection(`${vehicleType}_slots`).doc(vehicleId).get();
      return snapshot.exists ? snapshot.data().slots : [];
    } catch (error) {
      console.error('Error getting tire slots:', error);
      return [];
    }
  },

  async updateTireSlots(vehicleType, vehicleId, slots) {
    try {
      await db.collection(`${vehicleType}_slots`).doc(vehicleId).set({ slots });
      
      // Update tire count for the vehicle
      const assignedCount = slots.filter(slot => slot.tire).length;
      const totalSlots = slots.length;
      
      // Calculate new status based on tire kilometers
      const newStatus = this.calculateVehicleStatus(slots);
      
      console.log(`Updating ${vehicleType} ${vehicleId}:`, {
        assignedCount,
        totalSlots,
        newStatus,
        slots: slots.map(slot => slot.tire ? { id: slot.tire.id, km: slot.tire.km } : null)
      });
      
      if (vehicleType === 'truck') {
        await this.updateTruck(vehicleId, { 
          tiresAssigned: assignedCount,
          totalTires: totalSlots,
          status: newStatus
        });
      } else if (vehicleType === 'trailer') {
        await this.updateTrailer(vehicleId, { 
          tiresAssigned: assignedCount,
          totalTires: totalSlots,
          status: newStatus
        });
      }
    } catch (error) {
      console.error('Error updating tire slots:', error);
      throw error;
    }
  },

  // Calculate vehicle status based on tire kilometers
  calculateVehicleStatus(vehicleSlots) {
    const assignedTires = vehicleSlots.filter(slot => slot.tire && slot.tire.km !== undefined);
    
    if (assignedTires.length === 0) {
      return 'good'; // No tires assigned, consider as good
    }
    
    // Check if any tire has over 200,000 km (critical)
    const hasCriticalTire = assignedTires.some(tire => (tire.tire.km || 0) >= 200000);
    if (hasCriticalTire) {
      return 'danger';
    }
    
    // Check if any tire has between 150,000-200,000 km (warning)
    const hasWarningTire = assignedTires.some(tire => {
      const km = tire.tire.km || 0;
      return km >= 150000 && km < 200000;
    });
    if (hasWarningTire) {
      return 'warning';
    }
    
    // All tires are under 150,000 km (good)
    return 'good';
  },

  // Real-time listeners
  onTiresUpdate(callback) {
    return db.collection('tires').onSnapshot(snapshot => {
      const tires = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(tires);
    });
  },

  onTrucksUpdate(callback) {
    return db.collection('trucks').onSnapshot(snapshot => {
      const trucks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(trucks);
    });
  },

  onTrailersUpdate(callback) {
    return db.collection('trailers').onSnapshot(snapshot => {
      const trailers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(trailers);
    });
  },

  onTireSlotsUpdate(vehicleType, vehicleId, callback) {
    return db.collection(`${vehicleType}_slots`).doc(vehicleId).onSnapshot(snapshot => {
      if (snapshot.exists) {
        const slots = snapshot.data().slots || [];
        callback(slots);
      } else {
        callback([]);
      }
    });
  },

  // Vehicle kilometers
  async getVehicleKm(vehicleId) {
    try {
      const doc = await db.collection('vehicles_km').doc(vehicleId).get();
      if (doc.exists) {
        return doc.data().kilometers;
      }
      return null;
    } catch (error) {
      console.error('Error getting vehicle kilometers:', error);
      return null;
    }
  },

  onVehicleKmUpdate(vehicleId, callback) {
    return db.collection('vehicles_km').doc(vehicleId).onSnapshot(snapshot => {
      if (snapshot.exists) {
        callback(snapshot.data().kilometers);
      } else {
        callback(null);
      }
    });
  },

  // --- OPTIMIZATIONS ---
  async getAllVehicleKms() {
    try {
      const snapshot = await db.collection('vehicles_km').get();
      const kms = {};
      snapshot.docs.forEach(doc => {
        kms[doc.id] = doc.data().kilometers;
      });
      return kms;
    } catch (error) {
      console.error('Error getting all vehicle kilometers:', error);
      return {};
    }
  },

  async getAllTireSlots(vehicleType) {
    try {
      const snapshot = await db.collection(`${vehicleType}_slots`).get();
      const allSlots = {};
      snapshot.docs.forEach(doc => {
        allSlots[doc.id] = doc.data().slots || [];
      });
      return allSlots;
    } catch (error) {
      console.error(`Error getting all ${vehicleType} tire slots:`, error);
      return {};
    }
  },

  onAllVehicleKmsUpdate(callback) {
    return db.collection('vehicles_km').onSnapshot(snapshot => {
      const kms = {};
      snapshot.docs.forEach(doc => {
        kms[doc.id] = doc.data().kilometers;
      });
      callback(kms);
    });
  },

  async getAuthPassword() {
    try {
      const doc = await db.collection('settings').doc('auth').get();
      if (doc.exists && doc.data().password) {
        return doc.data().password;
      }
      // If password is not found, return null. No fallback.
      console.error("CRITICAL: Password not configured Login will be disabled until it is set.");
      return null;
    } catch (error) {
      console.error('Error getting auth password:', error);
      // Return null in case of error to prevent login failures.
      return null;
    }
  }
};

// Export for use in other files
window.DatabaseService = DatabaseService;
