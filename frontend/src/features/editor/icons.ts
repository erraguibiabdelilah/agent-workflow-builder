import {
  Bot,
  Brain,
  Calculator,
  Clock3,
  Database,
  Globe,
  MousePointerClick,
  MessageSquare,
  PenLine,
  Settings,
  Sparkles,
  Split,
  Zap,
  Webhook,
  type LucideIcon,
} from 'lucide-react';

const NODE_ICONS: Record<string, LucideIcon> = {
  'mouse-pointer-click': MousePointerClick,
  webhook: Webhook,
  schedule: Clock3,
  bot: Bot,
  anthropic: Brain,
  openai: Bot,
  'google-ai': Sparkles,
  mistral: MessageSquare,
  memory: Database,
  http: Globe,
  set: PenLine,
  if: Split,
  brain: Brain,
  calculator: Calculator,
  database: Database,
  globe: Globe,
  'message-square': MessageSquare,
  settings: Settings,
  split: Split,
  zap: Zap,
};

export function getNodeIcon(name?: string): LucideIcon {
  return (name && NODE_ICONS[name.toLowerCase()]) || Settings;
}
