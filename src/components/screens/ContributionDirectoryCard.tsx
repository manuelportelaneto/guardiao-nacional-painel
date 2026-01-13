import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { MapPin, Calendar, Star, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';

interface ContributionDirectoryCardProps {
    contribution: any; // Type should be imported if available, using any for flexibility here matched with Firestore data
}

const ContributionDirectoryCard: React.FC<ContributionDirectoryCardProps> = ({ contribution }) => {
    const formatDate = (date: any) => {
        if (!date) return 'Data desconhecida';
        return date.toDate ? date.toDate().toLocaleDateString('pt-BR') : new Date(date).toLocaleDateString('pt-BR');
    };

    return (
        <Card className="overflow-hidden hover:shadow-lg transition-all border-l-4 border-l-blue-500">
            <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1" title={contribution.title}>
                        {contribution.title}
                    </h3>
                    <Badge variant={
                        contribution.status === 'Resolvido' ? 'secondary' : // green-ish in shadcn default
                            contribution.status === 'Em Análise' ? 'outline' : 'destructive'
                    } className="whitespace-nowrap text-[10px] px-1.5 h-5">
                        {contribution.status}
                    </Badge>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-3 min-h-[40px]">
                    {contribution.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {contribution.city || 'Cidade n/a'}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(contribution.createdAt)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1 text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        ID: {contribution.userId?.substring(0, 6)}...
                    </div>

                    {/* Link to Users page with userId as query param. 
                        Note: AdminUsers needs to handle reading this query param if we want direct opening, 
                        or just let admin search by this ID. 
                    */}
                    <Link to={`/admin/users?search=${contribution.userId}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 hover:text-blue-600">
                            <Eye className="w-3 h-3" /> Ver Autor
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
};

export default ContributionDirectoryCard;
