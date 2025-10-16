import "./ReviewCard.css";

type ReviewCardProps = {
    sku_number: string;
    id: number;
    manufacturer: string;
    sku: string;
    title: string;
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


export default function ReviewCard ({ 
    manufacturer,
    sku,
    title, 
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
            <h1>{manufacturer}</h1>
            <h1>{title}</h1>
            <h2>{sku}</h2>
            <img src={image_url} alt={imageAlt || "Product Image"} />
            <p>{description}</p>
            <p>Confidence: {confidence_score}</p>
            <p>{isFeatured && '⭐'}</p>
            <div className="buttonRow">
                <button className="approveButton" onClick={onApprove}>✅ Approve</button>
                <button className="rejectButton" onClick={onReject}>❌ Reject</button>
            </div>
        </section>
    )
}

export type { ReviewCardProps };