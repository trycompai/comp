'use client';

interface ReviewWidgetProps {
  rating?: number;
  reviewCount?: number;
  className?: string;
}

export function ReviewWidget({
  rating = 4.7,
  reviewCount = 100,
  className = '',
}: ReviewWidgetProps) {
  // Calculate how many full stars and the partial star percentage
  const fullStars = Math.floor(rating);
  const partialStar = rating - fullStars;
  const partialPercentage = Math.round(partialStar * 100);

  return (
    <div className={`flex items-center justify-center gap-4 text-center ${className}`}>
      <div className="flex flex-col items-center justify-center gap-1">
        <div className="flex items-center gap-1">
          {/* Star Rating */}
          <div className="flex items-center">
            {[...Array(5)].map((_, index) => {
              const isFullStar = index < fullStars;
              const isPartialStar = index === fullStars && partialStar > 0;

              return (
                <div key={index} className="relative">
                  {/* Base star (gray) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 -10 187.673 179.503"
                    className="fill-gray-300 dark:fill-gray-600"
                  >
                    <path d="M187.183 57.47a9.955 9.955 0 00-8.587-6.86l-54.167-4.918-21.42-50.134a9.978 9.978 0 00-9.172-6.052 9.972 9.972 0 00-9.172 6.061l-21.42 50.125L9.07 50.611a9.973 9.973 0 00-8.578 6.858 9.964 9.964 0 002.917 10.596l40.944 35.908-12.073 53.184a9.97 9.97 0 003.878 10.298A9.953 9.953 0 0042 169.357a9.937 9.937 0 005.114-1.424l46.724-27.925 46.707 27.925a9.936 9.936 0 0010.964-.478 9.979 9.979 0 003.88-10.298l-12.074-53.184 40.944-35.9a9.98 9.98 0 002.925-10.604zm0 0" />
                  </svg>

                  {/* Filled star overlay */}
                  {(isFullStar || isPartialStar) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 -10 187.673 179.503"
                      className="absolute inset-0 fill-yellow-400"
                      style={{
                        clipPath: isPartialStar
                          ? `inset(0 ${100 - partialPercentage}% 0 0)`
                          : undefined,
                      }}
                    >
                      <path d="M187.183 57.47a9.955 9.955 0 00-8.587-6.86l-54.167-4.918-21.42-50.134a9.978 9.978 0 00-9.172-6.052 9.972 9.972 0 00-9.172 6.061l-21.42 50.125L9.07 50.611a9.973 9.973 0 00-8.578 6.858 9.964 9.964 0 002.917 10.596l40.944 35.908-12.073 53.184a9.97 9.97 0 003.878 10.298A9.953 9.953 0 0042 169.357a9.937 9.937 0 005.114-1.424l46.724-27.925 46.707 27.925a9.936 9.936 0 0010.964-.478 9.979 9.979 0 003.88-10.298l-12.074-53.184 40.944-35.9a9.98 9.98 0 002.925-10.604zm0 0" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rating Number */}
          <div className="text-base leading-none font-semibold text-foreground ml-1">{rating}</div>
        </div>

        {/* Review Count Text */}
        <div className="text-sm text-muted-foreground">Based on {reviewCount}+ reviews</div>
      </div>
    </div>
  );
}
