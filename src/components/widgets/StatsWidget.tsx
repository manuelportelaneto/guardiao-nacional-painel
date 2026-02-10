
import React from 'react';
import { Card, CardContent } from '../ui/card';
import { type LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface StatsWidgetProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
        description?: string;
    };
    description?: string;
    className?: string;
    iconClassName?: string;
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, value, icon: Icon, trend, description, className, iconClassName }) => {
    return (
        <Card className={`overflow-hidden ${className}`}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <Icon className={`h-4 w-4 ${iconClassName || 'text-muted-foreground'}`} />
                </div>
                <div className="flex items-baseline space-x-2">
                    <div className="text-2xl font-bold">{value}</div>
                    {trend && (
                        <div className={`flex items-center text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {trend.value > 0 ? (
                                trend.isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />
                            ) : (
                                <Minus className="h-3 w-3 mr-1" />
                            )}
                            {Math.abs(trend.value)}%
                        </div>
                    )}
                </div>
                {(description || trend?.description) && (
                    <p className="text-xs text-muted-foreground mt-1">
                        {trend?.description || description}
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default StatsWidget;
