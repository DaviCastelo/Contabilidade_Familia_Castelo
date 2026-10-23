import {
  Baby, Banknote, Beer, Bike, BookOpen, Briefcase, Building2, Bus, Car, Church, Coffee, Coins, CreditCard, Dog, Droplet,
  Dumbbell, Film, Flag, Fuel, Gamepad2, Gift, GraduationCap, HandHeart, Hammer, HeartPulse, Home, KeyRound, Landmark,
  Music, PartyPopper, PawPrint, PiggyBank, Pill, Pizza, Plane, Receipt, Scissors, Shirt, ShoppingBag, ShoppingCart,
  Smartphone, Sparkles, Stethoscope, Tag, TrendingUp, Tv, Umbrella, Utensils, Wallet, Wifi, Wrench, Zap,
  type LucideIcon,
} from "lucide-react";

/** Ícones disponíveis para categorias e metas (chave salva no banco → componente). */
export const ICONS: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart, utensils: Utensils, pizza: Pizza, coffee: Coffee, beer: Beer,
  home: Home, "key-round": KeyRound, zap: Zap, droplet: Droplet, wifi: Wifi, wrench: Wrench, hammer: Hammer,
  car: Car, fuel: Fuel, bus: Bus, bike: Bike, plane: Plane,
  "heart-pulse": HeartPulse, pill: Pill, stethoscope: Stethoscope, dumbbell: Dumbbell,
  "graduation-cap": GraduationCap, "book-open": BookOpen, baby: Baby,
  "party-popper": PartyPopper, "gamepad-2": Gamepad2, film: Film, music: Music, tv: Tv, smartphone: Smartphone,
  shirt: Shirt, "shopping-bag": ShoppingBag, scissors: Scissors, gift: Gift,
  dog: Dog, "paw-print": PawPrint, church: Church, "hand-heart": HandHeart, umbrella: Umbrella,
  briefcase: Briefcase, coins: Coins, banknote: Banknote, "trending-up": TrendingUp, wallet: Wallet,
  "piggy-bank": PiggyBank, landmark: Landmark, "building-2": Building2, "credit-card": CreditCard, receipt: Receipt,
  sparkles: Sparkles, flag: Flag, tag: Tag,
};
export const ICON_KEYS = Object.keys(ICONS);

/** Quadradinho com o ícone na cor da categoria (fundo translúcido da mesma cor). */
export default function CategoryIcon({ icon, color, size = "md", label }: { icon?: string | null; color?: string | null; size?: "sm" | "md" | "lg"; label?: string }) {
  const Icon = (icon && ICONS[icon]) || Tag;
  const c = color || "#8a94a6";
  const box = { sm: "h-7 w-7 rounded-md", md: "h-9 w-9 rounded-lg", lg: "h-11 w-11 rounded-xl" }[size];
  const glyph = { sm: "h-3.5 w-3.5", md: "h-4.5 w-4.5", lg: "h-5 w-5" }[size];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box}`} style={{ background: `${c}22`, color: c }} aria-hidden={!label} aria-label={label} role={label ? "img" : undefined}>
      <Icon className={glyph} strokeWidth={2.2} />
    </span>
  );
}
