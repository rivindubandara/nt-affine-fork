import { css } from 'lit';

export const timelineViewStyles = css`
  affine-data-view-timeline {
    display: block;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    --timeline-border: color-mix(
      in srgb,
      var(--affine-border-color) 58%,
      transparent
    );
    --timeline-bar-default: color-mix(
      in srgb,
      var(--affine-primary-color) 16%,
      var(--affine-background-primary-color)
    );
  }

  .timeline-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    margin: 4px 0 8px;
  }

  .timeline-zoom {
    display: inline-flex;
    padding: 2px;
    border-radius: 8px;
    background: var(--affine-background-secondary-color);
  }

  .timeline-zoom button {
    border: none;
    background: transparent;
    color: var(--affine-text-secondary-color);
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    padding: 2px 10px;
    border-radius: 6px;
    cursor: pointer;
  }

  .timeline-zoom button.active {
    background: var(--affine-background-primary-color);
    color: var(--affine-text-primary-color);
    box-shadow: var(--affine-shadow-1);
  }

  .timeline-nav {
    display: flex;
    gap: 6px;
  }

  .timeline-nav button,
  .timeline-setup button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px solid var(--affine-border-color);
    border-radius: 6px;
    background: var(--affine-background-primary-color);
    color: var(--affine-text-primary-color);
    height: 28px;
    padding: 5px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    line-height: 20px;
    white-space: nowrap;
  }

  .timeline-nav .timeline-icon-button {
    width: 28px;
    padding: 5px;
  }

  .timeline-nav svg,
  .timeline-setup svg,
  .timeline-add-button svg {
    width: 16px;
    height: 16px;
    color: var(--affine-icon-secondary);
    flex: 0 0 auto;
  }

  .timeline-setup {
    display: flex;
    justify-content: center;
    padding: 48px 0;
    border: 1px dashed var(--affine-border-color);
    border-radius: 8px;
  }

  .timeline-scroll {
    position: relative;
    width: 100%;
    max-height: 640px;
    overflow: auto;
    border-top: 1px solid var(--timeline-border);
    border-bottom: 1px solid var(--timeline-border);
    overscroll-behavior-x: contain;
  }

  .timeline-canvas {
    position: relative;
    min-width: 100%;
  }

  /* header ----------------------------------------------------------- */

  .timeline-header {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    background: var(--affine-background-primary-color);
    border-bottom: 1px solid var(--timeline-border);
  }

  .timeline-corner {
    position: sticky;
    left: 0;
    z-index: 5;
    flex: 0 0 auto;
    display: flex;
    align-items: flex-end;
    background: var(--affine-background-primary-color);
    border-right: 1px solid var(--timeline-border);
    box-sizing: border-box;
    overflow: hidden;
  }

  .timeline-table-columns,
  .timeline-table-cells {
    display: flex;
    min-width: 0;
    overflow: hidden;
    width: 100%;
  }

  .timeline-table-column {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 0 0 auto;
    box-sizing: border-box;
    height: 26px;
    padding: 0 8px;
    color: var(--affine-text-secondary-color);
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-column-icon {
    display: flex;
  }

  .timeline-column-icon svg {
    width: 14px;
    height: 14px;
    color: var(--affine-icon-color);
  }

  .timeline-table-resize {
    position: absolute;
    top: 0;
    right: -3px;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    z-index: 6;
  }

  .timeline-table-resize:hover {
    background: var(--affine-primary-color);
    opacity: 0.4;
  }

  .timeline-scale {
    position: relative;
    flex: 0 0 auto;
  }

  .timeline-scale-top,
  .timeline-scale-bottom {
    position: relative;
    height: 26px;
  }

  .timeline-tick {
    position: absolute;
    top: 0;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    overflow: hidden;
    white-space: nowrap;
    user-select: none;
  }

  .timeline-scale-top .timeline-tick {
    color: var(--affine-text-primary-color);
    font-size: 12px;
    font-weight: 600;
  }

  .timeline-scale-top .timeline-tick-label {
    position: sticky;
    left: 8px;
    padding: 0 8px;
  }

  .timeline-scale-bottom .timeline-tick {
    justify-content: center;
    color: var(--affine-text-secondary-color);
    font-size: 11px;
    border-left: 1px solid var(--timeline-border);
  }

  .timeline-scale-bottom .timeline-tick.is-today {
    color: var(--affine-primary-color);
    font-weight: 600;
  }

  /* background grid -------------------------------------------------- */

  .timeline-grid {
    position: absolute;
    right: 0;
    pointer-events: none;
    z-index: 0;
  }

  .timeline-grid-line {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--timeline-border);
    opacity: 0.6;
  }

  .timeline-weekend {
    position: absolute;
    top: 0;
    bottom: 0;
    background: var(--affine-background-secondary-color);
    opacity: 0.6;
  }

  .timeline-today {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    margin-left: -1px;
    background: var(--affine-primary-color);
    opacity: 0.8;
  }

  /* rows ------------------------------------------------------------- */

  .timeline-row {
    position: relative;
    display: flex;
    height: var(--timeline-row-height);
    box-sizing: border-box;
  }

  .timeline-row:hover .timeline-table-pane,
  .timeline-row:hover .timeline-lane {
    background-color: color-mix(
      in srgb,
      var(--affine-hover-color) 60%,
      transparent
    );
  }

  .timeline-table-pane {
    position: sticky;
    left: 0;
    z-index: 3;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    box-sizing: border-box;
    background: var(--affine-background-primary-color);
    border-right: 1px solid var(--timeline-border);
    border-bottom: 1px solid var(--timeline-border);
    cursor: pointer;
    overflow: hidden;
  }

  .timeline-row:hover .timeline-table-pane {
    background: color-mix(
      in srgb,
      var(--affine-hover-color-filled, var(--affine-hover-color)) 100%,
      var(--affine-background-primary-color)
    );
  }

  .timeline-table-cell {
    flex: 0 0 auto;
    box-sizing: border-box;
    padding: 0 8px;
    height: var(--timeline-row-height);
    display: flex;
    align-items: center;
    overflow: hidden;
    font-size: 13px;
    pointer-events: none;
  }

  .timeline-table-cell > * {
    width: 100%;
    max-height: var(--timeline-row-height);
  }

  .timeline-table-cell.is-title {
    gap: 6px;
    font-weight: 500;
    color: var(--affine-text-primary-color);
  }

  .timeline-row-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timeline-row-title.is-empty {
    color: var(--affine-placeholder-color);
  }

  .timeline-open-hint {
    display: none;
    flex: 0 0 auto;
    width: auto !important;
    padding: 0 6px;
    border: 1px solid var(--affine-border-color);
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    color: var(--affine-text-secondary-color);
    background: var(--affine-background-primary-color);
  }

  .timeline-row:hover .timeline-open-hint {
    display: inline-block;
  }

  .timeline-lane {
    position: relative;
    flex: 0 0 auto;
    z-index: 1;
    border-bottom: 1px solid
      color-mix(in srgb, var(--timeline-border) 50%, transparent);
  }

  .timeline-lane.is-undated {
    cursor: pointer;
  }

  .timeline-group-row {
    border-bottom: 1px solid var(--timeline-border);
  }

  .timeline-group-label {
    position: sticky;
    left: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 100%;
    padding: 0 8px;
    border: none;
    background: transparent;
    color: var(--affine-text-primary-color);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }

  .timeline-group-toggle {
    display: flex;
    transition: transform 0.15s;
  }

  .timeline-group-toggle.collapsed {
    transform: rotate(-90deg);
  }

  .timeline-group-toggle svg {
    width: 16px;
    height: 16px;
    color: var(--affine-icon-color);
  }

  .timeline-group-count {
    color: var(--affine-text-secondary-color);
    font-weight: 400;
  }

  .timeline-add-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 100%;
    padding: 0 10px;
    border: none;
    background: transparent;
    color: var(--affine-text-secondary-color);
    font-size: 13px;
    cursor: pointer;
  }

  .timeline-add-button:hover {
    color: var(--affine-text-primary-color);
  }

  /* bars ------------------------------------------------------------- */

  .timeline-bar {
    position: absolute;
    top: 5px;
    height: calc(var(--timeline-row-height) - 10px);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    border-radius: 6px;
    background: var(--timeline-bar-color, var(--timeline-bar-default));
    border: 1px solid
      color-mix(
        in srgb,
        var(--timeline-bar-color, var(--affine-primary-color)) 70%,
        var(--affine-text-primary-color) 12%
      );
    color: var(--affine-text-primary-color);
    font-size: 12px;
    cursor: pointer;
    user-select: none;
    touch-action: none;
    z-index: 2;
  }

  .timeline-bar.is-editable {
    cursor: grab;
  }

  .timeline-bar.is-dragging {
    cursor: grabbing;
    box-shadow: var(--affine-shadow-2);
    z-index: 3;
  }

  .timeline-bar:hover {
    filter: brightness(0.97);
  }

  .timeline-bar:focus-visible {
    outline: 2px solid var(--affine-primary-color);
    outline-offset: 1px;
  }

  .timeline-bar-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 8px;
    cursor: ew-resize;
    z-index: 1;
  }

  .timeline-bar-handle.left {
    left: -2px;
  }

  .timeline-bar-handle.right {
    right: -2px;
  }

  .timeline-bar:hover .timeline-bar-handle::after {
    content: '';
    position: absolute;
    top: 6px;
    bottom: 6px;
    left: 3px;
    width: 2px;
    border-radius: 1px;
    background: var(--affine-icon-secondary);
  }

  .timeline-bar-label {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    padding: 0 10px;
    overflow: hidden;
    white-space: nowrap;
    pointer-events: none;
  }

  .timeline-bar-label.outside {
    position: absolute;
    top: 0;
    height: var(--timeline-row-height);
    padding: 0;
    z-index: 2;
  }

  .timeline-bar-title {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-bar-property {
    color: var(--affine-text-secondary-color);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-ghost {
    position: absolute;
    top: 5px;
    height: calc(var(--timeline-row-height) - 10px);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px dashed var(--affine-primary-color);
    border-radius: 6px;
    background: color-mix(in srgb, var(--affine-primary-color) 8%, transparent);
    pointer-events: none;
  }

  .timeline-ghost svg {
    width: 14px;
    height: 14px;
    color: var(--affine-primary-color);
  }
`;
