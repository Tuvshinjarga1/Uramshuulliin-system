"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { registerUser } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: {
    displayName: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      // Нууц үг тохирч байгаа эсэхийг шалгах
      if (data.password !== data.confirmPassword) {
        setError("Нууц үг таарахгүй байна");
        return;
      }

      const result = await registerUser(
        data.email,
        data.password,
        data.displayName
      );

      if (result.success) {
        router.push("/dashboard");
      } else {
        setError(result.error || "Бүртгэлийн явцад алдаа гарлаа");
      }
    } catch (e: any) {
      setError(e.message || "Бүртгэлийн явцад алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-black">
          Бүртгүүлэх
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
              htmlFor="displayName"
            >
              Нэр
            </label>
            <input
              id="displayName"
              type="text"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Таны нэр"
              {...register("displayName", {
                required: "Нэр оруулна уу",
                minLength: {
                  value: 2,
                  message: "Нэр хамгийн багадаа 2 тэмдэгт байх ёстой",
                },
              })}
            />
            {errors.displayName && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.displayName.message}
              </p>
            )}
          </div>

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

          <div className="mb-4">
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

          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="confirmPassword"
            >
              Нууц үг баталгаажуулах
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="Нууц үг давтах"
              {...register("confirmPassword", {
                required: "Нууц үг баталгаажуулна уу",
                validate: (val: string) => {
                  if (watch("password") !== val) {
                    return "Нууц үг таарахгүй байна";
                  }
                },
              })}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs italic mt-1">
                {errors.confirmPassword.message}
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
              {loading ? "Бүртгэж байна..." : "Бүртгүүлэх"}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <Link
            href="/login"
            className="text-blue-500 hover:text-blue-700 text-sm"
          >
            Нэвтрэх
          </Link>
        </div>
      </div>
    </div>
  );
}
