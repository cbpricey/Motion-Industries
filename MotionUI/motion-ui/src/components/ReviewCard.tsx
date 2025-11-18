import "./ReviewCard.css";
import { getProxiedImageUrl } from "@/lib/imageProxy";

type ReviewCardProps = {
    sku_number: string;
    id: number;
    manufacturer: string;
    sku: string;
    description: string;
    confidence_score: number;
    image_url: string;
    status: string;
    imageAlt?: string;
    isFeatured?: boolean;
    onApprove?: () => void;
    onReject?: () => void;
    onSearch?: () => void;
}

export default function ReviewCard({ 
    id,
    manufacturer,
    sku,
    description, 
    confidence_score, 
    image_url, 
    imageAlt, 
    isFeatured = false,
    onApprove,
    onReject,
    onSearch,
}: ReviewCardProps) {
    return (
        <section>
            <h1>ID: {id}</h1> {/* Display the id */}
            <h1>{sku}</h1>
            <img src={getProxiedImageUrl(image_url)} alt={imageAlt || "Product Image"} />
            <p>{description}</p>
            <p>Confidence: {confidence_score}</p>
            <p>{isFeatured && '⭐'}</p>
            <div className="buttonRow">
                <button className="approveButton" onClick={onApprove}>✅ Approve</button>
                <button className="rejectButton" onClick={onReject}>❌ Reject</button>
            </div>
        </section>
    );
}

export type { ReviewCardProps };