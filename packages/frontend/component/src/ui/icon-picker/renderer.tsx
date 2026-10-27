import type { ReactNode } from 'react';

import { AffineIconRenderer } from './renderer/affine-icon';
import { type IconData, IconType } from './type';

export const IconRenderer = ({
  data,
  fallback,
  ...props
}: {
  data?: IconData;
  fallback?: ReactNode;
}) => {
  if (!data) {
    return fallback ?? null;
  }

  if (data.type === IconType.Emoji && data.unicode) {
    return data.unicode;
  }
  if (data.type === IconType.AffineIcon && data.name) {
    return (
      <AffineIconRenderer name={data.name} color={data.color} {...props} />
    );
  }
  if (data.type === IconType.Image && data.url) {
    return (
      <img
        src={data.url}
        alt=""
        draggable={false}
        style={{
          width: '1em',
          height: '1em',
          objectFit: 'contain',
          borderRadius: 3,
          verticalAlign: 'middle',
        }}
      />
    );
  }
  if (data.type === IconType.Blob) {
    // Not supported yet
    return null;
  }

  return fallback ?? null;
};
