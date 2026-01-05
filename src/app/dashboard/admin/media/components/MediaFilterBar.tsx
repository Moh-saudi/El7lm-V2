import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";

interface MediaFilterBarProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    statusFilter: string;
    setStatusFilter: (status: string) => void;
}

export const MediaFilterBar: React.FC<MediaFilterBarProps> = ({
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter
}) => {
    return (
        <Card className="border-none shadow-sm rounded-xl bg-white border border-slate-200">
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="البحث بالاسم، البريد، المؤسسة أو عنوان المقطع..."
                        className="pr-10 h-10 bg-slate-50 border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-full md:w-auto">
                        {['all', 'pending', 'approved', 'rejected'].map((s) => (
                            <Button
                                key={s}
                                size="sm"
                                variant={statusFilter === s ? 'default' : 'ghost'}
                                className={`flex-1 md:flex-none rounded-md h-8 text-xs font-medium ${statusFilter === s
                                        ? 'bg-white shadow-sm text-slate-900 hover:bg-white'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                onClick={() => setStatusFilter(s)}
                            >
                                {s === 'all' ? 'الكل' : s === 'pending' ? 'معلق' : s === 'approved' ? 'مقبول' : 'مرفوض'}
                            </Button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
