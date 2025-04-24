import { Skeleton } from "@comp/ui/skeleton";

export default function Loading() {
    return (
        <div className="mt-4 max-w-[1200px] m-auto flex flex-col gap-4">
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-24" />
            </div>

            {/* Skeleton for IntegrationsServer - Assuming a grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="border p-4 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-6 w-3/4" />
                        </div>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-10 w-full mt-2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
