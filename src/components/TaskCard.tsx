import { useState } from "react";
import { Task } from "@/types";
import { updateTaskStatus } from "@/lib/tasks";

interface TaskCardProps {
  task: Task;
  onStatusChange?: () => void;
}

export default function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Дууссан";
      case "in-progress":
        return "Хийгдэж буй";
      case "rejected":
        return "Цуцлагдсан";
      default:
        return "Хүлээгдэж буй";
    }
  };

  const formatDate = (date: Date | any) => {
    if (!date) return "Тодорхойгүй";
    if (typeof date === "string") {
      return new Date(date).toLocaleDateString("mn-MN");
    }
    return date.toDate
      ? date.toDate().toLocaleDateString("mn-MN")
      : new Date(date).toLocaleDateString("mn-MN");
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === task.status) return;

    if (newStatus === "rejected") {
      setShowCommentInput(true);
      return;
    }

    setStatusUpdateLoading(true);

    try {
      await updateTaskStatus(task.id, newStatus);
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error("Төлөв шинэчлэхэд алдаа гарлаа:", error);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleRejectWithComment = async () => {
    if (!comment.trim()) {
      alert("Тайлбар оруулна уу");
      return;
    }

    setStatusUpdateLoading(true);

    try {
      await updateTaskStatus(task.id, "rejected", comment);
      if (onStatusChange) {
        onStatusChange();
      }
      setShowCommentInput(false);
      setComment("");
    } catch (error) {
      console.error("Төлөв шинэчлэхэд алдаа гарлаа:", error);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClass(
              task.status
            )}`}
          >
            {getStatusText(task.status)}
          </span>
        </div>

        <p className="text-gray-600 mb-4">{task.description}</p>

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
          <div>
            <span className="font-medium">Дуусах хугацаа:</span>{" "}
            {formatDate(task.dueDate)}
          </div>
          <div>
            <span className="font-medium">Урамшуулал:</span>{" "}
            {task.incentiveAmount.toLocaleString()} ₮
          </div>
        </div>

        {task.statusComment && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
            <span className="font-medium">Тайлбар:</span> {task.statusComment}
          </div>
        )}

        {showCommentInput && (
          <div className="mt-3">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Цуцлах шалтгаан"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={2}
            />
            <div className="mt-2 flex space-x-2">
              <button
                onClick={handleRejectWithComment}
                disabled={statusUpdateLoading}
                className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
              >
                {statusUpdateLoading ? "Ачаалж байна..." : "Цуцлах"}
              </button>
              <button
                onClick={() => setShowCommentInput(false)}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300"
              >
                Буцах
              </button>
            </div>
          </div>
        )}

        {task.status === "pending" && !showCommentInput && (
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleStatusChange("in-progress")}
              disabled={statusUpdateLoading}
              className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
            >
              {statusUpdateLoading ? "Ачаалж байна..." : "Ажиллаж эхлэх"}
            </button>
            <button
              onClick={() => handleStatusChange("rejected")}
              disabled={statusUpdateLoading}
              className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              {statusUpdateLoading ? "Ачаалж байна..." : "Цуцлах"}
            </button>
          </div>
        )}

        {task.status === "in-progress" && !showCommentInput && (
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => handleStatusChange("completed")}
              disabled={statusUpdateLoading}
              className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700"
            >
              {statusUpdateLoading ? "Ачаалж байна..." : "Дуусгах"}
            </button>
            <button
              onClick={() => handleStatusChange("rejected")}
              disabled={statusUpdateLoading}
              className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700"
            >
              {statusUpdateLoading ? "Ачаалж байна..." : "Цуцлах"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
