import { type IconData, IconRenderer, IconType } from '@affine/component';
import * as litIcons from '@blocksuite/icons/lit';
import { html } from 'lit';

export const getDocIconComponent = (icon: IconData) => {
  const Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <IconRenderer data={icon} {...props} />
  );
  Icon.displayName = 'DocIcon';
  return Icon;
};

export const getDocIconComponentLit = (icon: IconData) => {
  return () => {
    if (icon.type === IconType.Emoji) {
      return html`<div class="icon">${icon.unicode}</div>`;
    }
    if (icon.type === IconType.AffineIcon) {
      return html`<div
        style="color: ${icon.color}; display: flex; align-items: center; justify-content: center;"
      >
        ${litIcons[`${icon.name}Icon` as keyof typeof litIcons]()}
      </div>`;
    }
    if (icon.type === IconType.Image) {
      return html`<div
        class="icon"
        style="display: flex; align-items: center; justify-content: center;"
      >
        <img
          src=${icon.url}
          alt=""
          style="width: 1em; height: 1em; object-fit: contain; border-radius: 3px;"
        />
      </div>`;
    }
    return null;
  };
};
