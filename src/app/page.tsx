import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <div className="flex flex-col items-center justify-center max-w-5xl w-full text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Ажилтнуудын Урамшууллын Систем
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Үр дүнтэй, үр ашигтай ажиллах. Гүйцэтгэлээр урамшуулах.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Нэвтрэх
          </Link>
          <Link
            href="/register"
            className="text-black rounded-md bg-white px-3.5 py-2.5 text-sm font-semibol shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Бүртгүүлэх <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
