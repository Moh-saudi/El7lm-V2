'use client';

import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase/config';
import { PlayerFormData } from '@/types/player';
import { useTranslation } from '@/lib/i18n';
// ... import other needed UI components and types

interface PlayerProfileFormProps {
  clubId: string;
  onSuccess?: () => void;
  initialData?: Partial<PlayerFormData>;
}

const defaultData: PlayerFormData = {
  full_name: '',
  birth_date: undefined,
  nationality: '',
  city: '',
  country: '',
  phone: '',
  whatsapp: '',
  email: '',
  brief: '',
  education_level: '',
  graduation_year: '',
  degree: '',
  english_level: '',
  arabic_level: '',
  spanish_level: '',
  blood_type: '',
  height: '',
  weight: '',
  chronic_conditions: false,
  chronic_details: '',
  injuries: [],
  surgeries: [],
  allergies: '',
  medical_notes: '',
  primary_position: '',
  secondary_position: '',
  preferred_foot: '',
  club_history: [],
  experience_years: '',
  sports_notes: '',
  technical_skills: {},
  physical_skills: {},
  social_skills: {},
  objectives: {
    professional: false,
    trials: false,
    local_leagues: false,
    arab_leagues: false,
    european_leagues: false,
    training: false,
    other: '',
  },
  profile_image: undefined,
  additional_images: [],
  videos: [],
  training_courses: [],
  has_passport: 'no',
  ref_source: '',
  contract_history: [],
  agent_history: [],
  official_contact: {
    name: '',
    title: '',
    phone: '',
    email: '',
  },
  currently_contracted: 'no',
  achievements: [],
  medical_history: {
    blood_type: '',
    chronic_conditions: [],
    allergies: [],
    injuries: [],
    last_checkup: '',
  },
  current_club: '',
  previous_clubs: [],
  documents: [],
  updated_at: new Date(),
  subscription_end: undefined,
  profile_image_url: '',
  subscription_status: '',
  subscription_type: '',
};

export default function PlayerProfileForm({ clubId = '', onSuccess, initialData }: PlayerProfileFormProps) {
  const { t, isRTL } = useTranslation();
  const ft = (key: string) => t(`sharedComponents.clubPlayerForm.${key}`);
  const [data, setData] = useState<PlayerFormData>({ ...defaultData, ...initialData });
  const [tab, setTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!data.full_name) {
      newErrors.full_name = ft('fullNameRequired');
    }
    if (!data.email) {
      newErrors.email = ft('emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      newErrors.email = ft('emailInvalid');
    }
    if (!data.phone) {
      newErrors.phone = ft('phoneRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await supabase.from('club_players').insert({
        id: crypto.randomUUID(),
        club_id: clubId,
        ...data,
        updated_at: new Date().toISOString(),
      });
      setLoading(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      setLoading(false);
      console.error('Error saving player:', err);
      // TODO: Show error toast
    }
  };

  if (!clubId) return <div className="text-red-500">{ft('clubIdMissing')}</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="grid w-full grid-cols-4 gap-2">
          <TabsTrigger value="personal">{ft('personal')}</TabsTrigger>
          <TabsTrigger value="sports">{ft('sports')}</TabsTrigger>
          <TabsTrigger value="education">{ft('education')}</TabsTrigger>
          <TabsTrigger value="medical">{ft('medical')}</TabsTrigger>
          <TabsTrigger value="skills">{ft('skills')}</TabsTrigger>
          <TabsTrigger value="objectives">{ft('objectives')}</TabsTrigger>
          <TabsTrigger value="media">{ft('media')}</TabsTrigger>
          <TabsTrigger value="contracts">{ft('contracts')}</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">{ft('fullName')}</Label>
              <Input
                id="full_name"
                value={data.full_name}
                onChange={e => setData(d => ({ ...d, full_name: e.target.value }))}
                className={errors.full_name ? 'border-red-500' : ''}
              />
              {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{ft('email')}</Label>
              <Input
                id="email"
                type="email"
                value={data.email}
                onChange={e => setData(d => ({ ...d, email: e.target.value }))}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{ft('phone')}</Label>
              <Input
                id="phone"
                type="tel"
                value={data.phone}
                onChange={e => setData(d => ({ ...d, phone: e.target.value }))}
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">{ft('whatsapp')}</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={data.whatsapp}
                onChange={e => setData(d => ({ ...d, whatsapp: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birth_date">{ft('birthDate')}</Label>
              <Input
                id="birth_date"
                type="date"
                value={data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : ''}
                onChange={e => setData(d => ({ ...d, birth_date: e.target.value ? new Date(e.target.value) : undefined }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nationality">{ft('nationality')}</Label>
              <Input
                id="nationality"
                value={data.nationality}
                onChange={e => setData(d => ({ ...d, nationality: e.target.value }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_position">{ft('primaryPosition')}</Label>
              <Input
                id="primary_position"
                value={data.primary_position}
                onChange={e => setData(d => ({ ...d, primary_position: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_position">{ft('secondaryPosition')}</Label>
              <Input
                id="secondary_position"
                value={data.secondary_position}
                onChange={e => setData(d => ({ ...d, secondary_position: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred_foot">{ft('preferredFoot')}</Label>
              <Select
                value={data.preferred_foot}
                onValueChange={value => setData(d => ({ ...d, preferred_foot: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={ft('selectPreferredFoot')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">{ft('right')}</SelectItem>
                  <SelectItem value="left">{ft('left')}</SelectItem>
                  <SelectItem value="both">{ft('both')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        {/* Add other tab contents similarly */}
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          {loading ? ft('saving') : ft('save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onSuccess}
          disabled={loading}
        >
          {ft('cancel')}
        </Button>
      </div>
    </form>
  );
}
