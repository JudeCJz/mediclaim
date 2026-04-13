import React, { useEffect, useState } from 'react';
import defaultAdminAvatar from '../assets/default-admin.png';
import defaultUserAvatar from '../assets/default-user.png';

/** Bundled avatar assets in `src/assets`. */
export function getDefaultAvatarSrc(role) {
  return role === 'admin' ? defaultAdminAvatar : defaultUserAvatar;
}

/**
 * Fixed institutional avatar: `src/assets/default-user.png` | `default-admin.png`.
 * Falls back to initial letter if images are missing or fail to load.
 */
export default function DefaultRoleAvatar({ role, name = 'U', size = 28, style }) {
  const [imgOk, setImgOk] = useState(true);
  const src = getDefaultAvatarSrc(role);
  const initial = (name || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    setImgOk(true);
  }, [role, src]);

  const shared = {
    width: size,
    height: size,
    borderRadius: Math.max(8, Math.round(size * 0.22)),
    flexShrink: 0,
    border: 'none',
    outline: 'none',
    boxShadow: 'none',
    display: 'block',
    ...style,
  };

  if (!imgOk) {
    return (
      <div
        style={{
          ...shared,
          background: 'var(--primary)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(10, size * 0.42),
          fontWeight: 500,
        }}
        aria-hidden
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ ...shared, objectFit: 'cover' }}
      onError={() => setImgOk(false)}
    />
  );
}
