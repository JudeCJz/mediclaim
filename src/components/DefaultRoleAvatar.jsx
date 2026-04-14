import React from 'react';
import { 
  User, Ghost, Zap, Flame, Crown, Star, Heart, Cloud, Moon, Sun, 
  Anchor, Rocket, Shield, Key, Lock, Bell, Camera, Gift, Music, 
  Coffee, Bug, Briefcase, GraduationCap, Microscope, Palette, 
  Puzzle, Shirt, Telescope, Umbrella, Wallet, Zap as Bolt,
  Activity, Airplay, Aperture, Archive, AtSign, Award, BarChart, 
  Battery, Bluetooth, Book, BookOpen, Bookmark, Box, Briefcase as Biz,
  Cpu, Database, Disc, Eye, Feather, Flag, Folder, Globe, Hash, Home,
  Image, Inbox, Layers, Map, Monitor, MousePointer, Package, Paperclip
 } from 'lucide-react';

const GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
  'linear-gradient(135deg, #4ECDC4 0%, #55E2D9 100%)',
  'linear-gradient(135deg, #45B649 0%, #DCE35B 100%)',
  'linear-gradient(135deg, #FF9966 0%, #FF5E62 100%)',
  'linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)',
  'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
  'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)',
  'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)',
  'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  'linear-gradient(135deg, #f7b733 0%, #fc4a1a 100%)',
  'linear-gradient(135deg, #36D1DC 0%, #5B86E5 100%)',
  'linear-gradient(135deg, #614385 0%, #516395 100%)',
  'linear-gradient(135deg, #02AAB0 0%, #00CDAC 100%)',
  'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
  'linear-gradient(135deg, #1D976C 0%, #93F9B9 100%)'
];

const ICONS = [
  User, Ghost, Zap, Flame, Crown, Star, Heart, Cloud, Moon, Sun, 
  Anchor, Rocket, Shield, Key, Lock, Bell, Camera, Gift, Music, 
  Coffee, Bug, Briefcase, GraduationCap, Microscope, Palette, 
  Puzzle, Shirt, Telescope, Umbrella, Wallet, Bolt,
  Activity, Airplay, Aperture, Archive, AtSign, Award, BarChart, 
  Battery, Bluetooth, Book, BookOpen, Bookmark, Box, Biz,
  Cpu, Database, Disc, Eye, Feather, Flag, Folder, Globe, Hash, Home,
  Image, Inbox, Layers, Map, Monitor, MousePointer, Package, Paperclip
];

const stringToHash = (str) => {
  let hash = 0;
  if (!str) return 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

export default function DefaultRoleAvatar({ role, name = 'U', seed = '', size = 28, style }) {
  // Use email or name as seed for deterministic randomness
  const effectiveSeed = seed || name || 'default';
  const hash = stringToHash(effectiveSeed);
  
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  const IconComponent = role === 'admin' ? Crown : ICONS[hash % ICONS.length];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size <= 40 ? '50%' : '16px',
        background: gradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        flexShrink: 0,
        boxShadow: size > 40 ? '0 10px 20px -5px rgba(0,0,0,0.3)' : 'none',
        border: '1px solid rgba(255,255,255,0.2)',
        ...style,
      }}
    >
      <IconComponent size={Math.round(size * 0.6)} strokeWidth={2.5} />
    </div>
  );
}
