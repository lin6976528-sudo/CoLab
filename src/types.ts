import { LucideIcon } from 'lucide-react';

export type FeatureId =
  | 'dashboard'
  | 'chat'
  | 'agent'
  | 'tts'
  | 'transcribe'
  | 'video-understand'
  | 'fast-chat'
  | 'image-understand'
  | 'image-gen'
  | 'video-gen'
  | 'music-gen'
  | 'maps'
  | 'search'
  | 'animate-image'
  | 'live-audio'
  | 'edit-image'
  | 'youtube-gen'
  | 'batch-process'
  | 'reminders'
  | 'admin'
  | 'about'
  | 'infinite-canvas'
  | 'three-d-studio'
  | 'analytics';

export type FeatureCategory = 'Overview' | 'Text & Chat' | 'Image' | 'Video' | 'Audio';

export type Tier = 'Free' | 'Plus' | 'Go' | 'Pro' | 'One' | 'Advanced' | 'Ultra' | 'Max' | 'Super';

export interface Tutorial {
  title: string;
  steps: string[];
  tips?: string[];
}

export interface Feature {
  id: FeatureId;
  title: string;
  icon: string;
  description: string;
  category: FeatureCategory;
  tutorial?: Tutorial;
  requiredTier: Tier;
}
