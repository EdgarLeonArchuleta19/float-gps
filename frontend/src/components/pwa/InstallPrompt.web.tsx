import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Compass, Download, EllipsisVertical, Menu, MoreHorizontal, Share, SquarePlus } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { BrandMark } from '@/components/brand/Wordmark';
import { Button, Sheet } from '@/components/ui';

const DISMISS_KEY = 'floa_install_dismissed_at';
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;
const SHOW_DELAY_MS = 1500;

type Platform = 'android' | 'ios-safari' | 'ios-chrome' | 'ios-firefox' | 'ios-edge' | 'ios-other';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Step {
  icon: LucideIcon;
  text: string;
}

function detectPlatform(): Platform | null {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    if (/CriOS/.test(ua)) return 'ios-chrome';
    if (/FxiOS/.test(ua)) return 'ios-firefox';
    if (/EdgiOS/.test(ua)) return 'ios-edge';
    if (/Safari/.test(ua) && !/(OPiOS|YaBrowser|GSA|FBAN|FBAV|Instagram)/.test(ua)) return 'ios-safari';
    return 'ios-other';
  }
  return /Android/i.test(ua) ? 'android' : null;
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function recentlyDismissed() {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY));
    return !!at && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

function stepsFor(platform: Platform): Step[] {
  switch (platform) {
    case 'ios-safari':
      return [
        { icon: Share, text: 'Toca el botón Compartir (cuadro con flecha hacia arriba) en la barra de Safari.' },
        { icon: SquarePlus, text: 'Desliza y elige "Agregar a inicio".' },
        { icon: Download, text: 'Toca "Agregar". floaGPS aparecerá en tu pantalla de inicio.' },
      ];
    case 'ios-chrome':
      return [
        { icon: Share, text: 'Toca el botón Compartir junto a la barra de direcciones, arriba a la derecha.' },
        { icon: SquarePlus, text: 'Elige "Agregar a la pantalla de inicio".' },
        { icon: Download, text: 'Toca "Agregar" para confirmar.' },
      ];
    case 'ios-firefox':
      return [
        { icon: Menu, text: 'Toca el menú (tres líneas) en la barra inferior.' },
        { icon: Share, text: 'Elige "Compartir".' },
        { icon: SquarePlus, text: 'Toca "Agregar a pantalla de inicio" y confirma.' },
      ];
    case 'ios-edge':
      return [
        { icon: MoreHorizontal, text: 'Toca el menú (tres puntos) en la barra inferior.' },
        { icon: Share, text: 'Elige "Compartir".' },
        { icon: SquarePlus, text: 'Toca "Agregar a pantalla de inicio" y confirma.' },
      ];
    case 'ios-other':
      return [
        { icon: Compass, text: 'Abre este mismo link en Safari.' },
        { icon: Share, text: 'Toca el botón Compartir y elige "Agregar a inicio".' },
      ];
    case 'android':
      return [
        { icon: EllipsisVertical, text: 'Abre el menú del navegador (tres puntos).' },
        { icon: Download, text: 'Elige "Instalar aplicación" o "Agregar a pantalla principal".' },
      ];
  }
}

export default function InstallPrompt() {
  const { t } = useTheme();
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [visible, setVisible] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const detected = detectPlatform();
    if (!detected || isInstalled() || recentlyDismissed()) return;
    setPlatform(detected);
    const capture = () => setInstallEvent((window as any).__floaInstallPrompt || null);
    capture();
    window.addEventListener('floa:installprompt', capture);
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => {
      window.removeEventListener('floa:installprompt', capture);
      clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setVisible(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    (window as any).__floaInstallPrompt = null;
    setInstallEvent(null);
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
  };

  if (!platform) return null;
  const oneTap = platform === 'android' && !!installEvent;

  return (
    <Sheet visible={visible} onClose={dismiss}>
      <View className="pb-2">
        <View className="flex-row items-center gap-3 mb-3">
          <View className={`w-12 h-12 rounded-full items-center justify-center ${t.tonal}`}>
            <BrandMark size={30} />
          </View>
          <View className="flex-1">
            <Text className={`text-[16px] font-bold ${t.text}`}>¿Instalar floaGPS?</Text>
            <Text className={`text-[12.5px] ${t.muted}`}>Ábrela como app: pantalla completa y acceso directo desde tu inicio.</Text>
          </View>
        </View>
        {oneTap ? null : (
          <View className={`rounded-2xl p-4 gap-3 mb-3 ${t.tonal}`}>
            {stepsFor(platform).map((step, i) => (
              <View key={step.text} className="flex-row items-center gap-3">
                <View className={`w-8 h-8 rounded-full items-center justify-center ${t.input}`}>
                  <step.icon size={16} color={t.hex.brand} />
                </View>
                <Text className={`flex-1 text-[13px] ${t.text}`}>
                  {i + 1}. {step.text}
                </Text>
              </View>
            ))}
          </View>
        )}
        <View className="flex-row gap-2">
          <Button label="Ahora no" variant="secondary" onPress={dismiss} className="flex-1" />
          {oneTap ? (
            <Button label="Instalar" icon={Download} onPress={install} className="flex-1" />
          ) : (
            <Button label="Entendido" onPress={() => setVisible(false)} className="flex-1" />
          )}
        </View>
      </View>
    </Sheet>
  );
}
