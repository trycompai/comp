import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@comp/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@comp/ui/dialog"
interface ComplianceSectionProps {
    title: string
    description: string
    children: ReactNode
    isLive?: boolean
}

export default function ComplianceSection({ title, description, children, isLive = false }: ComplianceSectionProps) {
    return (
        <Card>
            <CardHeader className="border-t-muted-foreground border-t-4 rounded-t-sm border-b gap-4 md:gap-0">
                <CardTitle>
                    <div className="flex flex-col md:grid md:grid-cols-2 justify-between">
                        <div className="flex items-center">
                            <h2 className="text-lg font-bold">{title}</h2>
                        </div>
                    </div>
                </CardTitle>
                <CardDescription className="text-sm">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
                {children}
            </CardContent>
        </Card>
    )
}