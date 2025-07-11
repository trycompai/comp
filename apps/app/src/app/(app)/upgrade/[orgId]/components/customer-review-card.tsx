import { Badge } from '@comp/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@comp/ui/card';
import { Quote, Star } from 'lucide-react';

export function CustomerReviewCard() {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Quote className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            Customer Review
          </CardTitle>
          <a
            href="https://www.g2.com/products/comp-ai/reviews/comp-ai-review-11318067"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1000 1000"
              className="h-5 w-5 fill-current"
              aria-label="G2"
            >
              <circle
                cx="500"
                cy="500"
                r="500"
                className="fill-orange-500 dark:fill-orange-400"
              ></circle>
              <path
                d="M716.4 383H631c2.3-13.4 10.6-20.9 27.4-29.4l15.7-8c28.1-14.4 43.1-30.7 43.1-57.3 0-16.7-6.5-29.9-19.4-39.4s-28.1-14.2-45.9-14.2a70.8 70.8 0 00-38.9 11.1c-11.7 7.2-20.4 16.5-25.8 28.1l24.7 24.8c9.6-19.4 23.5-28.9 41.8-28.9 15.5 0 25 8 25 19.1 0 9.3-4.6 17-22.4 26l-10.1 4.9c-21.9 11.1-37.1 23.8-45.9 38.2s-13.1 32.5-13.1 54.4v6h129.2zM705 459.2H563.6l-70.7 122.4h141.4L705 704.1l70.7-122.5L705 459.2z"
                className="fill-white"
              ></path>
              <path
                d="M505.1 663.3c-90 0-163.3-73.3-163.3-163.3s73.3-163.3 163.3-163.3L561 219.8a286.4 286.4 0 00-55.9-5.5c-157.8 0-285.7 127.9-285.7 285.7s127.9 285.7 285.7 285.7a283.9 283.9 0 00168.2-54.8l-61.8-107.2a162.8 162.8 0 01-106.4 39.6z"
                className="fill-white"
              ></path>
            </svg>
            <span className="group-hover:underline">Verified Review</span>
          </a>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
            ))}
            <span className="text-sm font-medium ml-1">5.0</span>
          </div>
          <a
            href="https://www.g2.com/products/comp-ai/reviews"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline"
          >
            from 100+ reviews
          </a>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <p className="text-sm leading-relaxed mb-4">
          "Comp AI helped us get audit ready for SOC 2 Type 2 in only 2 weeks. When talking to one
          of their competitors, they wanted us to go with 3 different services - platform, technical
          support, and auditors. With Comp, we paid the equivalent to only the platform fee and got
          all 3! The team was incredibly responsive and made the process easier than expected."
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/testimonials/jeffrey_l.jpeg"
              alt="Jeffrey L."
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="text-sm font-medium">Jeffrey L.</p>
              <p className="text-xs text-muted-foreground">CEO, OpenRep</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            June 2025
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
