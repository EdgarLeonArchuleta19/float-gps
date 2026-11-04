import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Building2, ImagePlus, Trash2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';
import { api, type CompanyProfile } from '@/lib/api';
import { Button, Card, Field, Loading } from '@/components/ui';

const MAX_LOGO_LENGTH = 700_000;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

type TextKey = Exclude<keyof CompanyProfile, 'logo'>;

const FIELDS: { key: TextKey; label: string; placeholder: string; keyboard?: 'email-address' | 'phone-pad' | 'url'; caps?: 'characters' | 'none' }[] = [
  { key: 'name', label: 'Nombre comercial', placeholder: 'Transportes del Norte' },
  { key: 'legalName', label: 'Razón social', placeholder: 'Transportes del Norte S.A. de C.V.' },
  { key: 'taxId', label: 'RFC', placeholder: 'TNO010101AB1', caps: 'characters' },
  { key: 'contactEmail', label: 'Correo de contacto', placeholder: 'contacto@empresa.com', keyboard: 'email-address', caps: 'none' },
  { key: 'contactPhone', label: 'Teléfono', placeholder: '667 123 4567', keyboard: 'phone-pad' },
  { key: 'website', label: 'Sitio web', placeholder: 'www.empresa.com', keyboard: 'url', caps: 'none' },
  { key: 'address', label: 'Dirección', placeholder: 'Calle, número, colonia, ciudad' },
];

function logoFromAsset(asset: ImagePicker.ImagePickerAsset): string | null {
  if (asset.uri.startsWith('data:image/')) return asset.uri.replace('data:image/jpg;', 'data:image/jpeg;');
  if (!asset.base64) return null;
  const type = asset.mimeType === 'image/jpg' ? 'image/jpeg' : asset.mimeType || 'image/jpeg';
  return `data:${type};base64,${asset.base64}`;
}

export default function CompanyProfileCard({ editable }: { editable: boolean }) {
  const { t } = useTheme();
  const toast = useToast();
  const { renameCompany } = useAuth();
  const { data, loading } = useApi(() => api.company.profile(), []);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setProfile(data);
  }, [data]);

  if (loading || !profile) return <Loading />;

  const setField = (key: TextKey, value: string) => setProfile({ ...profile, [key]: value });

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true });
    if (result.canceled || !result.assets[0]) return;
    const logo = logoFromAsset(result.assets[0]);
    const type = logo?.slice(5, logo.indexOf(';'));
    if (!logo || !type || !LOGO_TYPES.includes(type)) {
      toast('El logo debe ser una imagen PNG, JPG o WEBP', 'error');
      return;
    }
    if (logo.length > MAX_LOGO_LENGTH) {
      toast('La imagen pesa demasiado, usa una de máximo 500 KB', 'error');
      return;
    }
    setProfile({ ...profile, logo });
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.company.updateProfile(profile);
      setProfile(saved);
      renameCompany(saved.name);
      toast('Datos de la empresa actualizados', 'success');
    } catch (err: any) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <View className="flex-row items-center gap-4 mb-4">
        <View className={`w-16 h-16 rounded-2xl border items-center justify-center overflow-hidden ${t.input} ${t.border}`}>
          {profile.logo ? (
            <Image source={{ uri: profile.logo }} style={{ width: 64, height: 64 }} resizeMode="contain" />
          ) : (
            <Building2 size={24} color={t.hex.muted} />
          )}
        </View>
        <View className="flex-1 gap-2">
          <Text className={`text-[12.5px] ${t.muted}`}>Logo cuadrado en PNG, JPG o WEBP, máximo 500 KB.</Text>
          {editable ? (
            <View className="flex-row gap-2">
              <Button compact variant="secondary" icon={ImagePlus} label={profile.logo ? 'Cambiar logo' : 'Subir logo'} onPress={pickLogo} />
              {profile.logo ? <Button compact variant="ghost" icon={Trash2} label="Quitar" onPress={() => setProfile({ ...profile, logo: null })} /> : null}
            </View>
          ) : null}
        </View>
      </View>
      <View className="flex-row flex-wrap gap-3 mb-4">
        {FIELDS.map((f) => (
          <View key={f.key} style={{ flexGrow: 1, flexBasis: f.key === 'address' ? '100%' : 240 }}>
            <Field
              label={f.label}
              placeholder={f.placeholder}
              value={profile[f.key] ?? ''}
              onChangeText={(v) => setField(f.key, v)}
              editable={editable}
              keyboardType={f.keyboard}
              autoCapitalize={f.caps}
            />
          </View>
        ))}
      </View>
      {editable ? (
        <Button label="Guardar datos" onPress={save} loading={saving} disabled={profile.name.trim().length < 2} />
      ) : (
        <Text className={`text-[11.5px] ${t.subtle}`}>Solo un administrador puede cambiar los datos de la empresa.</Text>
      )}
    </Card>
  );
}
