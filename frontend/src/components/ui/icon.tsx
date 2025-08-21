// مسیر فایل: frontend/src/components/ui/icon.tsx

import {
  Camera,
  Shield,
  Home,
  Power,
  Video,
  Cctv,
  Orbit,
  Server,
  ServerCog,
  Cable,
  HardDrive,
  Siren,
  PanelTop,
  Eye,
  Fingerprint,
  Clock,
  KeyRound,
  DoorOpen,
  BrainCircuit,
  Lightbulb,
  Plug,
  Signal,
  Sun,
  BatteryCharging,
  Battery,
  HelpCircle, // آیکون پیش‌فرض
  type LucideProps,
} from 'lucide-react';

// یک نقشه از تمام نام‌های آیکون به کامپوننت‌های واقعی آن‌ها
const iconMap = {
  Video,
  Camera,
  Cctv,
  Orbit,
  Server,
  ServerCog,
  Cable,
  HardDrive,
  Shield,
  Siren,
  PanelTop,
  Eye,
  Fingerprint,
  Clock,
  KeyRound,
  DoorOpen,
  Home,
  BrainCircuit,
  Lightbulb,
  Plug,
  Signal,
  Power,
  Sun,
  BatteryCharging,
  Battery,
  HelpCircle,
};

// ما تایپ IconName را بر اساس کلیدهای آبجکت iconMap می‌سازیم
// تا از صحت نام‌ها در آینده اطمینان حاصل کنیم.
export type IconName = keyof typeof iconMap;

interface IconProps extends LucideProps {
  name: IconName | string;
}

export const Icon = ({ name, ...props }: IconProps) => {
  // اگر نام آیکون در نقشه ما وجود داشت، آن را برگردان
  // در غیر این صورت، از آیکون پیش‌فرض HelpCircle استفاده کن
  const LucideIcon = iconMap[name as IconName] ?? HelpCircle;
  return <LucideIcon {...props} />;
};
