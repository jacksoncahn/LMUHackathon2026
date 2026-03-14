import { db } from "./firebaseConfig.js";
import { collection, doc, setDoc, addDoc, getDoc, updateDoc } from "firebase/firestore";


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

