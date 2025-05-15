"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { registerUser } from "@/lib/auth";
import { logoutUser } from "@/lib/auth";

interface UserFormData {
  displayName: string;
  email: string;
  password: string;
  role: string;
  birthdate: string;
  gender: string;
   phone?: string;
  address?: string;
}


export default function NewUserPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
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
  password: "enkul123",
  role: "employee",
  birthdate: "",
  gender: "male",
  phone: "",
  address: "",
},

  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Хэрэглэгчийн профайл авах
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          // Зөвхөн админ хэрэглэгч нэвтрэх эрхтэй
          if (userData.role === "admin") {
            setUser({ uid: currentUser.uid, ...userData });
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
  }, [router]);

  const onSubmit = async (data: UserFormData) => {
    setSubmitLoading(true);
    setError(null);

    try {
      // Хэрэглэгч бүртгэх
      const result = await registerUser(
  data.email,
  data.password,
  data.displayName,
  data.role,
  data.birthdate,
  data.gender,
  data.phone,
  data.address
);

      if (result.success) {
        reset();
        router.push("/admin/dashboard");
      } else {
        setError(result.error || "Хэрэглэгч бүртгэхэд алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Хэрэглэгч бүртгэхэд алдаа гарлаа");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/dashboard");
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
          <h1 className="text-3xl font-bold text-gray-900">Хэрэглэгч нэмэх</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-3 py-1 text-sm font-medium text-blue-600 bg-white rounded-md border border-blue-600 hover:bg-blue-50"
            >
              Хянах самбар
            </button>
            <div className="text-sm font-medium text-gray-600">
              {user?.displayName} (Админ)
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

            <div className="mb-4">
              <label
                className="block text-sm font-medium text-gray-700 mb-1"
                htmlFor="password"
              >
                Нууц үг
              </label>
              <input
                id="password"
                type="password"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                {...register("password", {
                  required: "Нууц үг оруулна уу",
                  minLength: {
                    value: 6,
                    message: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой",
                  },
                })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
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
            <div className="mb-4">
  <label
    htmlFor="birthdate"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Төрсөн огноо
  </label>
  <input
    id="birthdate"
    type="date"
    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    {...register("birthdate", { required: "Төрсөн огноо оруулна уу" })}
  />
  {errors.birthdate && (
    <p className="mt-1 text-sm text-red-600">{errors.birthdate.message}</p>
  )}
</div>

<div className="mb-4">
  <label
    htmlFor="gender"
    className="block text-sm font-medium text-gray-700 mb-1"
  >
    Хүйс
  </label>
  <select
    id="gender"
    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    {...register("gender", { required: "Хүйс сонгоно уу" })}
  >
    <option value="male">Эрэгтэй</option>
    <option value="female">Эмэгтэй</option>
    <option value="other">Бусад</option>
  </select>
  {errors.gender && (
    <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>
  )}
</div>
<div className="mb-4">
  <label
    className="block text-sm font-medium text-gray-700 mb-1"
    htmlFor="phone"
  >
    Утасны дугаар
  </label>
  <input
    id="phone"
    type="text"
    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    {...register("phone", {
      required: "Утасны дугаар оруулна уу",
      pattern: {
        value: /^[0-9]{8}$/,
        message: "Утасны дугаар 8 оронтой тоо байх ёстой",
      },
    })}
  />
  {errors.phone && (
    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
  )}
</div>
<div className="mb-4">
  <label
    className="block text-sm font-medium text-gray-700 mb-1"
    htmlFor="address"
  >
    Гэрийн хаяг
  </label>
  <input
    id="address"
    type="text"
    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
    {...register("address", { required: "Хаяг оруулна уу" })}
  />
  {errors.address && (
    <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
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
