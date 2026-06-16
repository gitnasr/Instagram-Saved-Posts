"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { proxyImageUrl } from "@/lib/proxy-image";
import { profileColor, profileInitials } from "@/lib/profile-avatar";

import { cn } from "@/lib/utils";

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/** A profile's avatar: IG picture when available, else an initials+color tile. */
export function ProfileAvatar({
  name,
  avatarUrl,
  avatarColor,
  className,
  fallbackClassName,
}: ProfileAvatarProps) {
  const color = avatarColor ?? profileColor(name);
  return (
    <Avatar className={className}>
      {avatarUrl && <AvatarImage src={proxyImageUrl(avatarUrl)} alt={name} />}
      <AvatarFallback
        className={cn("font-semibold text-white", fallbackClassName)}
        style={{ backgroundColor: color }}
      >
        {profileInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
