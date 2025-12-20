import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from 'lucide-react';
import { Tournament, getCurrencySymbol } from '../utils';

interface RegistrationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tournament: Tournament | null;
}

export const RegistrationsModal: React.FC<RegistrationsModalProps> = ({
    isOpen,
    onClose,
    tournament
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>المسجلين في بطولة: {tournament?.name}</DialogTitle>
                    <DialogDescription>قائمة اللاعبين المسجلين في البطولة</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {tournament?.registrations?.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">لا يوجد مسجلين</h3>
                            <p className="text-gray-500">لم يسجل أي لاعب في هذه البطولة بعد</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tournament?.registrations?.map((registration, index) => (
                                <Card key={registration.id || index}>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{registration.playerName}</h4>
                                                <p className="text-sm text-gray-600">{registration.playerEmail}</p>
                                                <p className="text-sm text-gray-600">{registration.playerPhone}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">العمر: {registration.playerAge} سنة</p>
                                                <p className="text-sm text-gray-600">النادي: {registration.playerClub}</p>
                                                <p className="text-sm text-gray-600">المركز: {registration.playerPosition}</p>
                                            </div>
                                            <div>
                                                <Badge className={
                                                    registration.paymentStatus === 'paid' ? 'bg-green-500' :
                                                        registration.paymentStatus === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'
                                                }>
                                                    {registration.paymentStatus === 'paid' ? 'مدفوع' :
                                                        registration.paymentStatus === 'pending' ? 'في الانتظار' : 'مجاني'}
                                                </Badge>
                                                {registration.paymentAmount > 0 && (
                                                    <p className="text-sm text-green-600 font-bold mt-1">
                                                        {registration.paymentAmount} {getCurrencySymbol(tournament?.currency || 'EGP')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
