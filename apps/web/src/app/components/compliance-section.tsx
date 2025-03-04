import Image from "next/image";
import Balancer from "react-wrap-balancer";

interface ComplianceSectionProps {
  title: string;
  description: string;
  image: string;
  alt: string;
  index?: number;
  totalItems?: number;
}

export default function ComplianceSection({
  title,
  description,
  image,
  alt,
  index,
  totalItems,
}: ComplianceSectionProps) {
  const isMiddleItem =
    index !== undefined &&
    totalItems !== undefined &&
    index > 0 &&
    index < totalItems - 1;

  return (
    <div
      className={`space-y-4 p-4 ${isMiddleItem ? "lg:border-x" : "border-none"}`}
    >
      <div className="flex items-center justify-center">
        <Image
          src={image}
          alt={title}
          width={600}
          height={600}
          sizes="(max-height: 150px) 150px, 600px, (max-width: 400px) 400px, 600px"
          quality={100}
          priority={true}
          className="object-fit"
        />
      </div>
      <h2 className="text-lg font-medium">
        <Balancer>{title}</Balancer>
      </h2>
      <p className="text-muted-foreground text-sm">
        <Balancer>{description}</Balancer>
      </p>
    </div>
  );
}
