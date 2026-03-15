import { db } from "./firebaseConfig.js";
import { collection, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, writeBatch, increment } from "firebase/firestore";
import Papa from "papaparse";
import csvText from "../assets/snap_la.csv?raw";


export async function seedLocationsFromCSV() {
  const { data, errors } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  if (errors.length) {
    console.warn("CSV parse warnings:", errors);
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = data.slice(i, i + BATCH_SIZE);

    for (const row of chunk) {
      const docRef = doc(collection(db, "snapLocations"), String(row["Record ID"]));
      batch.set(docRef, {
        name: row["Store Name"]?.trim(),
        type: row["Store Type"],
        address: [row["Street Number"], row["Street Name"], row["Additional Address"]]
          .filter(Boolean)
          .join(" "),
        city: row["City"],
        state: row["State"],
        zip: String(row["Zip Code"]),
        county: row["County"],
        lat: row["Latitude"],
        lng: row["Longitude"],
        authDate: row["Authorization Date"] || null,
        endDate: row["End Date"] || null,
        baseScore: row["Base Score"],
      });
    }

    await batch.commit();
    console.log(`Uploaded records ${i + 1}–${Math.min(i + BATCH_SIZE, data.length)}`);
  }

  console.log("Seed complete:", data.length, "locations uploaded.");
}

export async function storeLocation(locationData) {

  try {
    // Reference to the user's locations subcollection
    const locationsRef = collection(db, "locations");

    // Add a new document with an auto-generated ID
    const docRef = await addDoc(locationsRef, {
      addedBy: user.email,
      ...locationData,      // location fields (e.g., lat, lng, name)
      createdAt: new Date() // optional timestamp
    });

    console.log("Location stored with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error storing location:", error);
    throw error;
  }
};

export async function submitUserLocation({ address, type, lat, lng }) {
  const locationsRef = collection(db, "userLocations");
  const docRef = await addDoc(locationsRef, {
    address,
    type,
    lat,
    lng,
    votes: 0,
    submittedAt: new Date(),
  });
  return docRef.id;
}

export async function fetchUserLocations() {
  const snap = await getDocs(collection(db, "userLocations"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function voteOnLocation(locationId) {
  const ref = doc(db, "userLocations", locationId);
  await updateDoc(ref, { votes: increment(1) });
}

export async function rateLocation(locationId, newRating) {

  try {
    const locationRef = doc(db, "locations", locationId);
    const locationSnap = await getDoc(locationRef);

    if (!locationSnap.exists()) {
      throw new Error("Location not found");
    }

    const data = locationSnap.data();
    const currentRating = data.rating || 0;
    const numRatings = data.numRatings || 0;

    // Calculate new average
    const updatedNumRatings = numRatings + 1;
    const updatedRating = (currentRating * numRatings + newRating) / updatedNumRatings;

    // Update document
    await updateDoc(locationRef, {
      rating: updatedRating,
      numRatings: updatedNumRatings
    });

    console.log(`Location ${locationId} updated with new rating: ${updatedRating}`);
    return updatedRating;

  } catch (error) {
    console.error("Error rating location:", error);
    throw error;
  }
}

