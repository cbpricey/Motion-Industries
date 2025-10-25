"use client";

import "./ReviewCard.css"; // reuse same styling for now

interface ReviewHistoryCardProps {
  id: number;
  title: string;
  manufacturer: string;
  image_url: string;
  status: "accepted" | "rejected";
  dateReviewed: string;
}

export default function ReviewHistoryCard({
  id,
  title,
  manufacturer,
  image_url,
  status,
  dateReviewed,
}: ReviewHistoryCardProps) {
  return (
    <div className="review-card">
      <img src={image_url} alt={title} className="review-image" />
      <div className="review-details">
        <h3>{title}</h3>
        <p>{manufacturer}</p>
        <small>Reviewed on {dateReviewed}</small>
      </div>
      <div
        className={`review-status ${
          status === "accepted" ? "accepted" : "rejected"
        }`}
      >
        {status === "accepted" ? "Approved" : "Rejected"}
      </div>
    </div>
  );
}
