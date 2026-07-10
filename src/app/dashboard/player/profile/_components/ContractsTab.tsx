"use client";

import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Calendar, DollarSign, UserCheck, Phone, FileText, Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n";

export function ContractsTab() {
    const { t } = useTranslation();
    const { control, watch } = useFormContext();
    const contractStatus = watch("contract_status");

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Current Status */}
            <Card className="border-slate-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-slate-50/50 pb-4">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-slate-900">{t('profile.contractsTab.statusTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <div className="md:col-span-2">
                        <FormField
                            control={control}
                            name="contract_status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.contractsTab.playerStatus')}</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "Free"}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white h-12">
                                                <SelectValue placeholder={t('profile.contractsTab.selectStatus')} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Free">{t('profile.contractsTab.freeAgentLabel')}</SelectItem>
                                            <SelectItem value="Contracted">{t('profile.contractsTab.contractedLabel')}</SelectItem>
                                            <SelectItem value="Loan">{t('profile.contractsTab.loanLabel')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>
                                        {field.value === 'Free' && <span className="text-green-600 font-medium">{t('profile.contractsTab.freeAgentDesc')}</span>}
                                        {field.value === 'Contracted' && <span className="text-blue-600 font-medium">{t('profile.contractsTab.contractedDesc')}</span>}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {(contractStatus === 'Contracted' || contractStatus === 'Loan') && (
                        <>
                            <FormField
                                control={control}
                                name="current_club"
                                render={({ field }) => (
                                    <FormItem className="md:col-span-2">
                                        <FormLabel>{t('profile.contractsTab.currentClub')}</FormLabel>
                                        <FormControl>
                                            <Input className="bg-white" placeholder={t('profile.contractsTab.clubPlaceholder')} {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="contract_end_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.contractsTab.contractEndDate')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input type="date" className="bg-white pl-10" {...field} value={field.value || ""} />
                                                <Calendar className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="salary"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile.contractsTab.currentSalary')}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder={t('profile.contractsTab.salaryPlaceholder')} {...field} value={field.value || ""} />
                                                <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                            </div>
                                        </FormControl>
                                        <FormDescription>{t('profile.contractsTab.salaryDesc')}</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}

                    <FormField
                        control={control}
                        name="market_value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.contractsTab.marketValue')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="bg-white pl-10" placeholder={t('profile.contractsTab.marketValuePlaceholder')} {...field} value={field.value || ""} />
                                        <DollarSign className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* 2. Agent Info */}
            <Card className="border-violet-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-violet-50/50 pb-4">
                    <div className="p-2 bg-violet-100 rounded-lg text-violet-600">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-violet-900">{t('profile.contractsTab.agentTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <FormField
                        control={control}
                        name="agent_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.contractsTab.agentName')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('profile.contractsTab.agentPlaceholder')} className="bg-white" {...field} value={field.value || ""} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="agent_phone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('profile.contractsTab.agentPhone')}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input className="bg-white pl-10" placeholder="+966..." {...field} value={field.value || ""} />
                                        <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* 3. Official Contact Info */}
            <Card className="border-fuchsia-100 shadow-sm">
                <CardHeader className="flex flex-row items-center gap-3 bg-fuchsia-50/50 pb-4">
                    <div className="p-2 bg-fuchsia-100 rounded-lg text-fuchsia-600">
                        <Phone className="w-5 h-5" />
                    </div>
                    <CardTitle className="text-lg text-fuchsia-900">{t('profile.contractsTab.officialContactTitle')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={control}
                            name="official_contact.name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.contractsTab.fullName')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('profile.contractsTab.fullNamePlaceholder')} className="bg-white" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.contractsTab.jobTitle')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('profile.contractsTab.jobTitlePlaceholder')} className="bg-white" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.contractsTab.phone')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input className="bg-white pl-10" placeholder="+966..." dir="ltr" {...field} value={field.value || ""} />
                                            <Phone className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.whatsapp"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.contractsTab.whatsapp')}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input className="bg-white pl-10" placeholder="+966..." dir="ltr" {...field} value={field.value || ""} />
                                            <Phone className="w-4 h-4 absolute left-3 top-3 text-green-500" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={control}
                            name="official_contact.email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile.contractsTab.email')}</FormLabel>
                                    <FormControl>
                                        <Input className="bg-white" placeholder="example@email.com" type="email" {...field} value={field.value || ""} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="mb-4 text-sm font-medium text-gray-700">{t('profile.contractsTab.socialAccounts')}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={control}
                                name="official_contact.social_links.facebook"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder={t('profile.contractsTab.facebookPlaceholder')} {...field} value={field.value || ""} />
                                                <Facebook className="w-4 h-4 absolute left-3 top-3 text-blue-600" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="official_contact.social_links.instagram"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder={t('profile.contractsTab.instagramPlaceholder')} {...field} value={field.value || ""} />
                                                <Instagram className="w-4 h-4 absolute left-3 top-3 text-pink-600" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="official_contact.social_links.linkedin"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder={t('profile.contractsTab.linkedinPlaceholder')} {...field} value={field.value || ""} />
                                                <Linkedin className="w-4 h-4 absolute left-3 top-3 text-blue-800" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="official_contact.social_links.twitter"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <div className="relative">
                                                <Input className="bg-white pl-10" placeholder={t('profile.contractsTab.twitterPlaceholder')} {...field} value={field.value || ""} />
                                                <Twitter className="w-4 h-4 absolute left-3 top-3 text-sky-500" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
