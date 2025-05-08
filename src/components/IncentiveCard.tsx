import { useState } from "react";
import { Incentive, User } from "@/types";
import { updateIncentiveStatus } from "@/lib/incentives";

interface IncentiveCardProps {
  incentive: Incentive;
  user?: User;
  allowActions?: boolean;
  onStatusChange?: () => void;
}

export default function IncentiveCard({
  incentive,
  user,
  allowActions = false,
  onStatusChange,
}: IncentiveCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusUpdate = async (newStatus: "approved" | "rejected") => {
    if (
      !window.confirm(
        `Урамшууллыг ${newStatus === "approved" ? "батлах" : "цуцлах"} уу?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateIncentiveStatus(incentive.id, newStatus);
      if (result.success) {
        if (onStatusChange) {
          onStatusChange();
        }
      } else {
        setError(result.error || "Урамшууллын төлөв шинэчлэхэд алдаа гарлаа");
      }
    } catch (error: any) {
      setError(error.message || "Урамшууллын төлөв шинэчлэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const [year, month] = dateString.split("-");
    const monthNames = [
      "1-р сар",
      "2-р сар",
      "3-р сар",
      "4-р сар",
      "5-р сар",
      "6-р сар",
      "7-р сар",
      "8-р сар",
      "9-р сар",
      "10-р сар",
      "11-р сар",
      "12-р сар",
    ];
    return `${monthNames[parseInt(month) - 1]}, ${year}`;
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Урамшууллын гарчиг */}
      <div className="p-4 border-b">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {user?.displayName || "Хэрэглэгчийн нэр"}
            </h3>
            <p className="text-sm text-gray-500">
              {formatDate(`${incentive.year}-${incentive.month}`)}
            </p>
          </div>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full 
            ${
              incentive.status === "approved"
                ? "bg-green-100 text-green-800"
                : incentive.status === "rejected"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {incentive.status === "approved"
              ? "Баталсан"
              : incentive.status === "rejected"
              ? "Цуцалсан"
              : "Хүлээгдэж буй"}
          </span>
        </div>
      </div>

      {/* Урамшууллын дэлгэрэнгүй */}
      <div className="p-4">
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-sm text-gray-500">Даалгаврын тоо</p>
              <p className="font-medium">{incentive.taskCount} ширхэг</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Нийт дүн</p>
              <p className="font-medium text-green-600">
                {incentive.totalAmount.toLocaleString()} ₮
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-3 text-sm">
            {error}
          </div>
        )}

        {/* Үйлдлийн товчнууд */}
        {allowActions && incentive.status === "pending" && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleStatusUpdate("approved")}
              disabled={loading}
              className={`flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Батлах
            </button>
            <button
              onClick={() => handleStatusUpdate("rejected")}
              disabled={loading}
              className={`flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Цуцлах
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
