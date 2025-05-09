"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getUserProfile, updateUserProfile } from "@/lib/auth";
import { logoutUser } from "@/lib/auth";

interface UserFormData {
  displayName: string;
  email: string;
  role: string;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UserFormData>({
    defaultValues: {
      displayName: "",
      email: "",
      role: "employee",
    },
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Зөвхөн админ хэрэглэгч нэвтрэх эрхтэй
          if (userData.role === "admin") {
            setCurrentUser({ uid: user.uid, ...userData });

            // Засах хэрэглэгчийн мэдээлэл авах
            const profileResult = await getUserProfile(userId);
            if (profileResult.success && profileResult.profile) {
              const userProfile = profileResult.profile;
              reset({
                displayName: userProfile.displayName || "",
                email: userProfile.email || "",
                role: userProfile.role || "employee",
              });
            } else {
              setError("Хэрэглэгчийн мэдээлэл авахад алдаа гарлаа");
            }
          } else {
            // Админ биш хэрэглэгч
            await logoutUser();
            router.push("/login");
          }
        } else {
          // Хэрэглэгчийн мэдээлэл олдсонгүй
          await logoutUser();
          router.push("/login");
        }
      } else {
        // Нэвтрээгүй үед нэвтрэх хуудас руу шилжүүлэх
        router.push("/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, userId, reset]);

  const onSubmit = async (data: UserFormData) => {
    setSubmitLoading(true);
    setError(null);

    try {
      // Хэрэглэгчийн мэдээлэл шинэчлэх
      const result = await updateUserProfile(userId, {
        displayName: data.displayName,
        email: data.email,
        role: data.role,
      });

      if (result.success) {
        router.push(`/admin/users/${userId}`);
      } else {
        setError(
          result.error || "Хэрэглэгчийн мэдээлэл шинэчлэхэд алдаа гарлаа"
        );
      }
    } catch (error: any) {
      setError(
        error.message || "Хэрэглэгчийн мэдээлэл шинэчлэхэд алдаа гарлаа"
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/admin/users/${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Ачаалж байна...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Хэрэглэгчийн мэдээлэл засах
          </h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Хянах самбар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {currentUser?.displayName} (Админ)
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="displayName"
              >
                Нэр
              </label>
              <input
                id="displayName"
                type="text"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("displayName", { required: "Нэр оруулна уу" })}
              />
              {errors.displayName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.displayName.message}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="email"
              >
                И-мэйл
              </label>
              <input
                id="email"
                type="email"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("email", {
                  required: "И-мэйл оруулна уу",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "И-мэйл буруу байна",
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="role"
              >
                Үүрэг
              </label>
              <select
                id="role"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("role", { required: "Үүрэг сонгоно уу" })}
              >
                <option value="employee">Ажилтан</option>
                <option value="admin">Админ</option>
                <option value="accountant">Нягтлан</option>
              </select>
              {errors.role && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.role.message}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Цуцлах
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700 ${
                  submitLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {submitLoading ? "Хадгалж байна..." : "Хадгалах"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
