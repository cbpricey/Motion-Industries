type ReviewCardProps = {
    title: string;
    text: string;
    rating: number;
    imageSrc: string;
    imageAlt?: string;
    isFeatured?: boolean;
    onApprove?: () => void;
    onReject?: () => void;
}


export default function ReviewCard ({ 
    title, 
    text, 
    rating, 
    imageSrc, 
    imageAlt, 
    isFeatured = false,
    onApprove,
    onReject,
}: ReviewCardProps) {
    return (
        <section>
            <h1>{title}</h1>
            <img src={imageSrc} alt={imageAlt || "Product Image"} />
            <p>{text}</p>
            <p>Rating: {rating}/5</p>
            <p>{isFeatured && '⭐'}</p>
            <div>
                <button onClick={onApprove}>✅ Approve</button>
                <button onClick={onReject}>❌ Reject</button>
            </div>
        </section>
    )
}

export type { ReviewCardProps };