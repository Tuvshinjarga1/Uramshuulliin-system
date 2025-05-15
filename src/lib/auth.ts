import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";

// Хэрэглэгч бүртгэх
export const registerUser = async (
  email: string,
  password: string,
  displayName: string,
  role: string = "employee",
  birthdate: string,
  gender: string,
  phone?: string,
  address?: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    await updateProfile(user, { displayName });

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      displayName,
      role,
      birthdate,
      gender,
       phone,
      address,
      createdAt: new Date().toISOString(),
    });

    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};


// Нэвтрэх
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Хэрэглэгчийн мэдээлэл авах
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (userDoc.exists()) {
      return { success: true, user: { ...user, ...userDoc.data() } };
    } else {
      return { success: false, error: "Хэрэглэгчийн мэдээлэл олдсонгүй" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Гарах
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Хэрэглэгчийн мэдээлэл авах
export const getUserProfile = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));

    if (userDoc.exists()) {
      return { success: true, profile: userDoc.data() };
    } else {
      return { success: false, error: "Хэрэглэгчийн мэдээлэл олдсонгүй" };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Хэрэглэгчийн мэдээлэл шинэчлэх
export const updateUserProfile = async (uid: string, data: any) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

// Хэрэглэгчийн мэдээлэл устгах
export const deleteUserProfile = async (uid: string) => {
  try {
    await deleteDoc(doc(db, "users", uid));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};








