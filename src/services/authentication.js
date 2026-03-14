import {
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider,
    signInWithPopup 
    } from "firebase/auth";
import { auth } from "./firebaseConfig.js"; 

//sign in with your email and password

export function createUserEmailAndPassword(email, password) {
    createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        console.log("Registered:", user.uid);
    })
    .catch((error) => {
        console.error(error.code, error.message);
  });
}

export function emailPasswordAuth(email, password) {
    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        console.log("Signed in:", user.uid);
    })
    .catch((error) => {
        console.error(error.code, error.message);
    });
}


//sign in with google authentication
export async function SignInWithGoogle() {
    const provider = new GoogleAuthProvider();

    let user

    try {
        const result = await signInWithPopup(auth, provider)
        user = result.user;
        console.log("Signed in with Google:", user.displayName, user.email);
        return user
    } catch(error) {
        console.error(error.code, error.message);
    };
}

export async function SignOut() {
    auth.signOut().then(() => console.log("Signed out"));
}
