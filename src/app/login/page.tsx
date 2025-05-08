"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { loginUser } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: { email: string; password: string }) => {
    try {
      setLoading(true);
      setError(null);

      const result = await loginUser(data.email, data.password);

      if (result.success && result.user) {
        // Хэрэглэгчийн эрхээс хамаарч дараагийн хуудсыг тодорхойлох
        const userData = result.user as any;
        if (userData.role === "admin") {
          router.push("/admin/dashboard");
        } else if (userData.role === "accountant") {
          router.push("/accountant/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(result.error || "Нэвтрэхэд алдаа гарлаа");
      }
    } catch (e: any) {
      setError(e.message || "Нэвтрэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-black">
          Системд нэвтрэх
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              И-мэйл
            </label>
            <input
              id="email"
              type="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="И-мэйл хаяг"
              {...register("email", {
                required: "И-мэйл оруулна уу",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "И-мэйл буруу байна",
                },
              })}
            />
            {errors.email && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Нууц үг
            </label>
            <input
              id="password"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Нууц үг"
              {...register("password", {
                required: "Нууц үг оруулна уу",
                minLength: {
                  value: 6,
                  message: "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой",
                },
              })}
            />
            {errors.password && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <Link
            href="/register"
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Бүртгэл үүсгэх
          </Link>
        </div>
      </div>
    </div>
  );
}
